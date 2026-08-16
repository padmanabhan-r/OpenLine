/**
 * Script construction.
 *
 * `assembleTask` turns questions plus a fact sheet into the exact string
 * CALL-E will speak. It is pure and fully tested, so the parts that carry
 * safety weight — the AI disclosure, the consent gate, the refusal to
 * improvise — cannot vary between candidates or between runs.
 *
 * The questions themselves are a fixed basic-screen template (see
 * lib/screening/preview.ts). A live call proved the earlier model-written
 * "fit" questions turned the screen into an interview; a basic screen asks
 * the same five things of everyone, so no model writes them.
 *
 * The fact sheet exists because CALL-E has no mid-call tool calling. The agent
 * cannot look up the salary band while the candidate is asking about it, so
 * everything it may need to answer has to be written into the task text before
 * dialing. Anything not in the sheet is explicitly deferred to a human.
 */

export interface ScriptQuestion {
  id: string;
  text: string;
}

export interface FactSheetEntry {
  label: string;
  value: string;
}

export interface ScriptInput {
  candidateName: string;
  roleTitle: string;
  companyName: string;
  recruiterName: string;
  questions: ScriptQuestion[];
  factSheet: FactSheetEntry[];
}

/** Build the exact instruction CALL-E will act on. Pure and deterministic. */
export function assembleTask(input: ScriptInput): string {
  const {
    candidateName,
    roleTitle,
    companyName,
    recruiterName,
    questions,
    factSheet,
  } = input;

  const questionLines = questions
    .map((q) => `  - [${q.id}] ${q.text}`)
    .join("\n");

  const factLines =
    factSheet.length > 0
      ? factSheet.map((f) => `  - ${f.label}: ${f.value}`).join("\n")
      : "  - (No details were provided for this role.)";

  return `You are calling ${candidateName} about their application for the ${roleTitle} role at ${companyName}.

This is a short basic screen, not an interview. Get to the point: no small talk beyond the greeting, one or two sentences per turn, and never explain the screening process unless asked.

Open: greet ${candidateName}, confirm it is them, say you are an AI assistant calling for ${recruiterName} at ${companyName} about their application, and ask if now is a good time. If they decline, thank them, say a human will follow up, and end the call — no questions.

Ask in order, conversationally, and only these:
${questionLines}

Record their interest, notice period, availability, and salary expectations exactly as they state them. If an answer is vague, ask once for a number or a date, then move on.

Then ask if they have any quick questions. Answer only from:
${factLines}
Anything else: say you do not have that detail and ${recruiterName} will follow up. Never guess.

Never make or imply an offer or a decision — a human reviews every call. If they ask for a person, agree and end the call.

Close: thank them, confirm ${recruiterName} will follow up, and say they will get a copy of the conversation.`;
}
