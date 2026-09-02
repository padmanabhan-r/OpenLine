"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { applyScriptEdit, type EditOutcome } from "@/lib/screening/edit";
import type { DialIntent } from "@/lib/screening/gate";

/**
 * Start the call and return immediately.
 *
 * The wait for the call to end runs in `after()` — Next's post-response hook —
 * so the recruiter's button resolves in a second or two while the phone
 * conversation continues on its own. The page shows "dialing" and updates
 * itself when the result lands.
 */
export async function callCandidate(screeningCallId: string, intent: DialIntent) {
  const outcome = await startCall(screeningCallId, intent);

  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    after(() => finishCall(screeningCallId, calleCallId));
  }

  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}

/**
 * Start a fresh attempt (recomposed from the current template) and dial it —
 * unless the script changed since the last call, in which case the new row
 * waits for review instead of dialing.
 */
export async function callAgain(
  screeningCallId: string,
): Promise<{ ok: true; newCallId: string } | { ok: false; reason: string }> {
  const attempt = await startNewAttempt(screeningCallId);
  if (!attempt.ok) {
    // A fresh row may have been created for review — make it visible.
    revalidatePath("/calls");
    revalidatePath(`/calls/${screeningCallId}`);
    return attempt;
  }

  const outcome = await startCall(attempt.screeningCallId, attempt.intent);
  if (!outcome.ok) return outcome;

  const newId = attempt.screeningCallId;
  const calleCallId = outcome.calleCallId;
  after(() => finishCall(newId, calleCallId));

  revalidatePath("/calls");
  revalidatePath(`/calls/${newId}`);
  return { ok: true, newCallId: newId };
}

/** Save edited questions; the script is reassembled and re-guarded server-side. */
export async function saveScriptEdits(
  screeningCallId: string,
  questionTexts: string[],
): Promise<EditOutcome> {
  const outcome = await applyScriptEdit({ screeningCallId, questionTexts });
  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}
