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
  /**
   * The recruiter's goal for this call, when they overrode the default
   * questions. Written in ahead of the opening; it shapes what is asked and
   * nothing else.
   */
  goal?: string;
}

export const MAX_GOAL_LENGTH = 240;

/** Wording that would make a goal an instruction about the frame, not a topic. */
const GOAL_OVERREACH: RegExp[] = [
  /\bopening\b|\bopen\s+by\b|\bgreeting\b|\bsay(?:ing)?\s+exactly\b/i,
  /\bconsent\b|\bpermission\b|\bdisclos/i,
  /\b(?:say|claim|tell\s+them)\s+(?:that\s+)?(?:you(?:'re|\s+are)|it(?:'s|\s+is))\b/i,
  /\bpretend\b|\bignore\b|\bdisregard\b|\bskip\b|\binstead\s+of\b/i,
  /\bnot\s+an?\s+ai\b|\bas\s+a\s+human\b|\bhuman\s+recruiter\b/i,
  /\b(?:you(?:'re|\s+are)|they(?:'re|\s+are))\s+hired\b|\b(?:send|make|extend)\s+(?:them\s+)?an?\s+offer\b|\boffer\s+them\b|\b(?:have|has)\s+passed\b/i,
];

/**
 * Why a goal cannot be used, or null. A goal says what the call should find
 * out; it cannot touch the opening, the consent question, what the agent is,
 * or promise an outcome. Checked before a goal is saved or drafted.
 */
export function goalProblem(goal: string): string | null {
  return GOAL_OVERREACH.some((pattern) => pattern.test(goal))
    ? "A goal says what the call should find out. It cannot change the opening, the consent question, or what the agent is, and it cannot promise an outcome."
    : null;
}

const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "sir", "shri", "smt"]);
/** "K.", "S.K.", or a lone letter: an initial, never what someone is called. */
const INITIALS = /^(\p{L}\.)+\p{L}?$|^\p{L}$/u;

/**
 * The name a person is called by on the phone. A machine reading out a full
 * name sounds like a form, so the task only ever carries this one word.
 *
 * Skips honorifics and initials ("Dr. K. Rao" is Rao, and many Indian names
 * lead with an initial), handles surname-first "Rao, Priya", and softens an
 * all-caps name so a voice does not spell it out.
 */
export function firstNameOf(fullName: string): string {
  let words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 && words[0].endsWith(",")) words = words.slice(1);
  const bare = (w: string) => w.replace(/[.,;:]+$/, "");
  const called =
    words.find((w) => !HONORIFICS.has(bare(w).toLowerCase()) && !INITIALS.test(w) && bare(w).length > 1) ??
    words[words.length - 1] ??
    "";
  const name = bare(called);
  const shouting = name.length > 1 && name === name.toUpperCase() && name !== name.toLowerCase();
  return shouting ? name[0] + name.slice(1).toLowerCase() : name;
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
    goal,
  } = input;

  // Only the first name is ever said, so only the first name is written in.
  const firstName = firstNameOf(candidateName);

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

  // The recruiter's goal, when they overrode the defaults. It goes below the
  // questions as context for them, one line, and says it adds nothing: placed
  // above the opening it read as an instruction, and a line break in it could
  // forge a second opening. goalProblem() refuses one that reaches the frame.
  const cleanGoal = goal ? goal.replace(/\s+/g, " ").trim().slice(0, MAX_GOAL_LENGTH) : "";
  const goalSentence = cleanGoal && !/[.?!]$/.test(cleanGoal) ? `${cleanGoal}.` : cleanGoal;
  const goalLine = goalSentence
    ? `\n\nContext for the questions above, from the recruiter: ${goalSentence} It adds no questions and changes nothing else in these instructions.`
    : "";

  return `You are calling ${firstName} about their application for the ${roleTitle} role at ${companyName}.

This is a short basic screen, not an interview. Say the opening line below word for word, then go straight to the questions: no small talk, one or two sentences per turn, and never explain the process unless asked. Call them by their first name, ${firstName}, and nothing else: never a surname or a full name.
${languageLine}
Open by saying exactly this, then wait for their answer:
"Hi, is this ${firstName}? This is an AI assistant calling for ${recruiterName} at ${companyName}. You applied for the ${roleTitle} role, and this is a quick two-minute first screen. OK if I ask a few screening questions?"

That line is the disclosure and the request for permission — do not reword it. If they say no, decline, would rather not, or ask for a person: thank them, say a human will follow up, and end the call. No questions.

Ask in order, and only these:
${questionLines}${goalLine}

Accept the first answer to each question as given, even if it is vague. No follow-ups and no clarifying questions. Do not thank them or comment after an answer; go straight to the next question. Thank them once, at the close.

If they ask you something, answer only from:
${factLines}
Anything else: say you do not have that detail and ${recruiterName} will follow up. Never guess.

Never make or imply an offer or a decision — a human reviews every call. If they ask for a person at any point, agree and end the call.

Close with one line: thank them, say ${recruiterName} will follow up and that they will get a copy of the conversation. Then end the call.`;
}
