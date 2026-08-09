import { eq } from "drizzle-orm";
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

export type DispatchOutcome =
  | { ok: true; callId: string; status: "completed" | "failed" }
  | { ok: false; reason: string };

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

/** Place one screening call and record the outcome. */
export async function placeCall(
  screeningCallId: string,
): Promise<DispatchOutcome> {
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
    return {
      ok: false,
      reason: "This candidate has already been called.",
    };
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, row.candidateId))
    .limit(1);
  if (!candidate?.phoneE164) {
    return { ok: false, reason: "This candidate has no callable number." };
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
        refusalReason: dial.refusal,
        refusalDetail: dial.detail,
        needsHuman: true,
        needsHumanReasons: [dial.detail],
      })
      .where(eq(screeningCalls.id, row.id));
    return { ok: false, reason: dial.detail };
  }

  if (dial.mode === "dry_run") {
    return {
      ok: false,
      reason:
        "OpenLine is in dry run. Set OPENLINE_LIVE_CALLS=true and add the number to the allowlist to dial.",
    };
  }

  // The id exists now — persist it before waiting, so a crash mid-call does not
  // orphan a call we have already paid for.
  await db
    .update(screeningCalls)
    .set({ calleCallId: dial.call.id, status: "dialing", mode: "live" })
    .where(eq(screeningCalls.id, row.id));

  let call: Call;
  try {
    call = await port.waitForCall(dial.call.id);
  } catch (error) {
    await db
      .update(screeningCalls)
      .set({
        needsHuman: true,
        needsHumanReasons: [
          `The call was placed but no terminal result arrived: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      })
      .where(eq(screeningCalls.id, row.id));
    return {
      ok: false,
      reason:
        "The call was placed, but OpenLine stopped waiting before it finished. Reload shortly.",
    };
  }

  await recordTerminalCall(row.id, call);

  return {
    ok: true,
    callId: call.id,
    status: call.status === "completed" ? "completed" : "failed",
  };
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
