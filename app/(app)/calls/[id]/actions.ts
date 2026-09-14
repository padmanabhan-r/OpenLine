"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { applyScriptEdit, type EditOutcome } from "@/lib/screening/edit";
import type { DialIntent } from "@/lib/screening/gate";
import OpenAI from "openai";
import { operatorStatus } from "@/lib/operator";
import { getCall } from "@/lib/db/queries";
import { createOverrideParser } from "@/lib/script/override";
import { goalProblem } from "@/lib/script/build";

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

/** Save edited questions and goal; the script is reassembled and re-guarded server-side. */
export async function saveScriptEdits(
  screeningCallId: string,
  questionTexts: string[],
  goal?: string | null,
): Promise<EditOutcome> {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false as const, reason: operator.reason };

  const outcome = await applyScriptEdit({
    screeningCallId,
    questionTexts,
    ...(goal !== undefined ? { goal } : {}),
  });
  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}

/**
 * Override defaults: turn a recruiter's own notes into a goal and questions.
 *
 * Nothing is saved here. The draft goes back to the editor, the recruiter
 * reads and edits it, and Save runs the normal edit path, which reassembles
 * the frame and runs the prohibited-topic check.
 */
export async function draftOverride(
  screeningCallId: string,
  notes: string,
): Promise<{ ok: true; goal: string; questions: string[] } | { ok: false; reason: string }> {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false, reason: operator.reason };

  const text = notes.trim().slice(0, 2000);
  if (!text) return { ok: false, reason: "Write what you want this call to find out." };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "OPENAI_API_KEY is not set, so there is no model to draft with." };
  }

  const row = await getCall(screeningCallId);
  if (!row) return { ok: false, reason: "No such screening call." };

  const parsed = await createOverrideParser(new OpenAI({ apiKey })).parse({
    roleTitle: row.job.title,
    companyName: row.job.companyName,
    notes: text,
  });
  if (!parsed) {
    return { ok: false, reason: "The model did not return usable questions. Try writing them more plainly." };
  }
  const problem = parsed.goal ? goalProblem(parsed.goal) : null;
  if (problem) return { ok: false, reason: `${problem} Rewrite the notes as topics to find out.` };
  return { ok: true, goal: parsed.goal, questions: parsed.questions };
}
