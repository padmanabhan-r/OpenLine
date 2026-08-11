import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { screeningCalls, type ScreeningCall } from "@/lib/db/schema";
import { callePortFromEnv } from "@/lib/calle/port";
import { recordTerminalCall } from "./dispatch";

/**
 * Rescue rows the detached waiter never finished.
 *
 * `finishCall` runs after the response is sent, which means it dies with the
 * process. A dev-server restart mid-call leaves a row saying "dialing" with
 * nobody waiting on it — and CALL-E has no endpoint to list calls, so unless
 * we stored the id (we did, before waiting) that result would be gone.
 *
 * This runs on page load rather than on a schedule: a row nobody looks at can
 * stay stale, but a row a recruiter is looking at must tell the truth.
 */

/** Leave fresh dials alone — the detached waiter is almost certainly alive. */
const STALE_AFTER_MS = 60_000;
/** Past this, stop hoping: no screening call runs half an hour. */
const GIVE_UP_AFTER_MS = 30 * 60_000;

export type ReconcileOutcome =
  | "still_dialing"
  | "recorded"
  | "gave_up"
  | "skipped";

export async function reconcileCall(
  row: Pick<
    ScreeningCall,
    "id" | "status" | "calleCallId" | "dialStartedAt"
  >,
): Promise<ReconcileOutcome> {
  if (row.status !== "dialing") return "skipped";

  const age = row.dialStartedAt
    ? Date.now() - row.dialStartedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (age < STALE_AFTER_MS) return "still_dialing";

  const db = getDb();

  // No CALL-E id means the process died between claiming and dialing — there
  // is nothing to fetch and never will be.
  if (!row.calleCallId) {
    await db
      .update(screeningCalls)
      .set({
        status: "failed",
        needsHuman: true,
        needsHumanReasons: [
          "Dialing was interrupted before CALL-E accepted the call. Nothing was dialed.",
        ],
        completedAt: new Date(),
      })
      .where(and(eq(screeningCalls.id, row.id), eq(screeningCalls.status, "dialing")));
    return "gave_up";
  }

  try {
    const call = await callePortFromEnv().fetchCall(row.calleCallId);
    const terminal = call.status === "completed" || call.status === "failed";

    if (terminal) {
      await recordTerminalCall(row.id, call);
      return "recorded";
    }
  } catch {
    // The fetch failing is not evidence the call failed; fall through to the
    // age check rather than guessing.
  }

  if (age > GIVE_UP_AFTER_MS) {
    await db
      .update(screeningCalls)
      .set({
        status: "failed",
        needsHuman: true,
        needsHumanReasons: [
          "The call ran past every reasonable duration and no result arrived. Check the CALL-E dashboard for this call id.",
        ],
        completedAt: new Date(),
      })
      .where(and(eq(screeningCalls.id, row.id), eq(screeningCalls.status, "dialing")));
    return "gave_up";
  }

  return "still_dialing";
}

/** Sweep every stale dialing row. Called from the calls index on load. */
export async function reconcileStaleCalls(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  const stale = await db
    .select({
      id: screeningCalls.id,
      status: screeningCalls.status,
      calleCallId: screeningCalls.calleCallId,
      dialStartedAt: screeningCalls.dialStartedAt,
    })
    .from(screeningCalls)
    .where(
      and(
        inArray(screeningCalls.status, ["dialing"]),
        isNotNull(screeningCalls.dialStartedAt),
        lt(screeningCalls.dialStartedAt, cutoff),
      ),
    );

  await Promise.all(stale.map((row) => reconcileCall(row)));
}
