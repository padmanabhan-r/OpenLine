import { and, eq, inArray } from "drizzle-orm";
import type { Call } from "@call-e/calle";
import { getDb } from "@/lib/db";
import { candidates as candidatesTable, screeningCalls } from "@/lib/db/schema";
import { callePortFromEnv } from "@/lib/calle/port";
import { inspectTranscript, type InspectableTurn } from "@/lib/script/guard";
import { needsHuman, type ScreeningResult } from "@/lib/script/schema";
import { SCREENING_RESULT_SCHEMA } from "@/lib/script/schema";

/**
 * Placing a real call and recording what came back.
 *
 * The row is written before the dial and updated after, because CALL-E has no
 * endpoint to list calls: a `call_id` we fail to persist is a call whose result
 * we can never read again. The idempotency key is stored on the row, so a
 * retried dispatch collapses into the same CALL-E call rather than telephoning
 * the candidate twice.
 */

/** Flatten CALL-E's recipient/attempt hierarchy into one ordered transcript. */
function flattenTranscript(call: Call): InspectableTurn[] {
  return call.recipients.flatMap((recipient) =>
    recipient.attempts.flatMap((attempt) =>
      attempt.transcriptTurns.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text,
        offsetSeconds: turn.offset_seconds ?? null,
      })),
    ),
  );
}

/**
 * Pick the structured result.
 *
 * Task-level is authoritative; the recipient-level result is a fallback for
 * calls created with a per-recipient schema. Either may be null, which is
 * CALL-E declining to invent an answer it could not ground — that is a valid
 * outcome, not an error.
 */
function readResult(call: Call): ScreeningResult | null {
  const taskLevel = call.structuredResult as ScreeningResult | null;
  if (taskLevel) return taskLevel;
  const recipientLevel = call.recipients[0]?.structuredResult;
  return (recipientLevel as ScreeningResult | null) ?? null;
}

export type StartOutcome =
  | { ok: true; calleCallId: string }
  | { ok: false; reason: string };

/**
 * Begin one screening call and return the moment CALL-E accepts it.
 *
 * This used to wait for the call to end, which held a server action — and the
 * recruiter's button — hostage for the length of a phone conversation. Now the
 * split is: `startCall` claims the row and dials; `finishCall` waits and
 * records, detached from the request that started it.
 */
export async function startCall(
  screeningCallId: string,
): Promise<StartOutcome> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(screeningCalls)
    .where(eq(screeningCalls.id, screeningCallId))
    .limit(1);
  if (!row) return { ok: false, reason: "No such screening call." };

  if (row.guardFindings.length > 0) {
    return {
      ok: false,
      reason: "This script did not pass the prohibited-topic check.",
    };
  }

  if (row.calleCallId) {
    return { ok: false, reason: "This candidate has already been called." };
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, row.candidateId))
    .limit(1);
  if (!candidate?.phoneE164) {
    return { ok: false, reason: "This candidate has no callable number." };
  }

  // Claim the row before dialing. Neon HTTP has no transactions, but a single
  // conditional UPDATE is atomic — whichever click matches `status` wins and
  // every other click matches zero rows. This is the double-dial mutex.
  const claimed = await db
    .update(screeningCalls)
    .set({ status: "dialing", dialStartedAt: new Date() })
    .where(
      and(
        eq(screeningCalls.id, row.id),
        inArray(screeningCalls.status, ["previewed", "refused"]),
      ),
    )
    .returning({ id: screeningCalls.id });
  if (claimed.length === 0) {
    return { ok: false, reason: "This call is already in progress or done." };
  }

  const port = callePortFromEnv();

  const dial = await port.dial({
    task: row.task,
    phone: candidate.phoneE164,
    resultSchema: SCREENING_RESULT_SCHEMA as unknown as Record<string, unknown>,
    idempotencyKey: row.idempotencyKey,
    metadata: { screeningCallId: row.id, jobId: row.jobId },
  });

  if (!dial.ok) {
    await db
      .update(screeningCalls)
      .set({
        status: "refused",
        dialStartedAt: null,
        refusalReason: dial.refusal,
        refusalDetail: dial.detail,
        needsHuman: true,
        needsHumanReasons: [dial.detail],
      })
      .where(eq(screeningCalls.id, row.id));
    return { ok: false, reason: dial.detail };
  }

  if (dial.mode === "dry_run") {
    // Nothing dialed; hand the claim back.
    await db
      .update(screeningCalls)
      .set({ status: "previewed", dialStartedAt: null })
      .where(eq(screeningCalls.id, row.id));
    return {
      ok: false,
      reason:
        "OpenLine is in dry run. Set OPENLINE_LIVE_CALLS=true and add the number to the allowlist to dial.",
    };
  }

  // The id exists now — persist it before anything waits, so a crash mid-call
  // does not orphan a call we have already paid for.
  await db
    .update(screeningCalls)
    .set({ calleCallId: dial.call.id, mode: "live" })
    .where(eq(screeningCalls.id, row.id));

  return { ok: true, calleCallId: dial.call.id };
}

/**
 * Wait for a started call to end and record it. Runs detached (via `after()`),
 * so it must never throw — an error here has no request left to surface in.
 */
export async function finishCall(
  screeningCallId: string,
  calleCallId: string,
): Promise<void> {
  const db = getDb();

  let call: Call;
  try {
    call = await callePortFromEnv().waitForCall(calleCallId);
  } catch (error) {
    try {
      await db
        .update(screeningCalls)
        .set({
          status: "failed",
          needsHuman: true,
          needsHumanReasons: [
            `The call was placed but no terminal result arrived: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
          completedAt: new Date(),
        })
        .where(eq(screeningCalls.id, screeningCallId));
    } catch (writeError) {
      console.error("finishCall: failed to record wait failure", writeError);
    }
    return;
  }

  try {
    await recordTerminalCall(screeningCallId, call);
  } catch (error) {
    console.error("finishCall: failed to record terminal call", error);
  }
}

/**
 * Write a terminal CALL-E call onto its screening row.
 *
 * Shared by the polling path and, later, the webhook receiver — which must
 * re-fetch through the API before trusting anything, since CALL-E's webhooks
 * are unsigned.
 */
export async function recordTerminalCall(screeningCallId: string, call: Call) {
  const db = getDb();

  const transcript = flattenTranscript(call);
  const result = readResult(call);

  // The agent may have improvised on the line, so the guard runs again over
  // what was actually said — not only over what we planned to say.
  const postCallGuard = inspectTranscript(transcript);

  const routing = needsHuman({
    structuredResult: result,
    completionConfidence: call.completionConfidence ?? null,
    guardClean: postCallGuard.ok,
  });

  await db
    .update(screeningCalls)
    .set({
      calleCallId: call.id,
      status: call.status === "completed" ? "completed" : "failed",
      structuredResult: result,
      completionConfidence: call.completionConfidence ?? null,
      evidence: call.evidence ?? [],
      transcript: transcript.map((t) => ({
        offsetSeconds: t.offsetSeconds ?? null,
        speaker: t.speaker,
        text: t.text,
      })),
      guardFindings: postCallGuard.findings,
      needsHuman: routing.needsHuman,
      needsHumanReasons: routing.reasons,
      completedAt: call.completedAt ? new Date(call.completedAt) : new Date(),
    })
    .where(eq(screeningCalls.id, screeningCallId));
}
