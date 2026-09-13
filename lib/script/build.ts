/**
 * Script construction.
 *
 * `assembleTask` turns questions plus a fact sheet into the exact string
 * CALL-E will speak. It is pure and fully tested, so the parts that carry
 * safety weight — the AI disclosure, the consent gate, the refusal to
 * improvise — cannot vary between candidates or between runs.
 *
 * The opening is one quoted line the agent says word for word: who is
 * calling, for whom, about what, and the request for permission — then the
 * first question. A live call proved that an opening described in prose came
 * out as four turns of preamble before anything was asked.
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
  /**
   * English name of the language to conduct the call in, e.g. "Tamil". Absent
   * for English. The questions below stay written in English either way — the
   * script a recruiter reviews is the script, whatever the agent voices.
   */
  speakLanguage?: string;
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
    speakLanguage,
  } = input;

  const questionLines = questions
    .map((q) => `  - [${q.id}] ${q.text}`)
    .join("\n");

  const factLines =
    factSheet.length > 0
      ? factSheet.map((f) => `  - ${f.label}: ${f.value}`).join("\n")
      : "  - (No details were provided for this role.)";

  // Placed before the opening line, so the first word is already in the
  // right language — a call that opens in English and switches a sentence
  // later loses the one line that says who is calling.
  const languageLine = speakLanguage
    ? `\nConduct the whole call in ${speakLanguage} — the opening line, every question, and the close — keeping their meaning exactly. Everything below is written in English; say each line in ${speakLanguage}. Record answers in English.\n`
    : "";

  return `You are calling ${candidateName} about their application for the ${roleTitle} role at ${companyName}.

This is a short basic screen, not an interview. Say the opening line below word for word, then go straight to the questions: no small talk, one or two sentences per turn, and never explain the process unless asked.
${languageLine}
Open by saying exactly this, then wait for their answer:
"Hi, is this ${candidateName}? This is an AI assistant calling for ${recruiterName} at ${companyName}. You applied for the ${roleTitle} role, and this is a quick two-minute first screen. OK if I ask a few screening questions?"

That line is the disclosure and the request for permission — do not reword it. If they say no, decline, would rather not, or ask for a person: thank them, say a human will follow up, and end the call. No questions.

Ask in order, and only these:
${questionLines}

Accept the first answer to each question as given, even if it is vague. No follow-ups, no clarifying questions, no comment beyond a brief acknowledgement.

If they ask you something, answer only from:
${factLines}
Anything else: say you do not have that detail and ${recruiterName} will follow up. Never guess.

Never make or imply an offer or a decision — a human reviews every call. If they ask for a person at any point, agree and end the call.

Close with one line: thank them, say ${recruiterName} will follow up and that they will get a copy of the conversation. Then end the call.`;
}
