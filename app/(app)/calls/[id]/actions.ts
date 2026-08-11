"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { applyScriptEdit, type EditOutcome } from "@/lib/screening/edit";

/**
 * Start the call and return immediately.
 *
 * The wait for the call to end runs in `after()` — Next's post-response hook —
 * so the recruiter's button resolves in a second or two while the phone
 * conversation continues on its own. The page shows "dialing" and updates
 * itself when the result lands.
 */
export async function callCandidate(screeningCallId: string) {
  const outcome = await startCall(screeningCallId);

  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    after(() => finishCall(screeningCallId, calleCallId));
  }

  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}

/** Clone a finished call and dial the clone. Returns the new call's id. */
export async function callAgain(
  screeningCallId: string,
): Promise<{ ok: true; newCallId: string } | { ok: false; reason: string }> {
  const attempt = await startNewAttempt(screeningCallId);
  if (!attempt.ok) return attempt;

  const outcome = await startCall(attempt.screeningCallId);
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
