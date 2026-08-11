import OpenAI from "openai";

/**
 * Script construction.
 *
 * Two stages, deliberately separated:
 *
 *   `generateQuestions` asks a model for role-specific questions. It is the
 *   non-deterministic part, and its output is untrusted.
 *
 *   `assembleTask` turns questions plus a fact sheet into the exact string
 *   CALL-E will speak. It is pure and fully tested, so the parts that carry
 *   safety weight — the AI disclosure, the consent gate, the refusal to
 *   improvise — cannot vary between candidates or between runs.
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

OPENING
Greet ${candidateName} by name and confirm it is them. State that you are an AI assistant calling for ${recruiterName} at ${companyName}, and ask if now is a good time for a few minutes.

If they decline or hesitate, thank them, say a human will follow up by email, and end the call. Do not ask the screening questions.

QUESTIONS
Work through these in order, conversationally. Refer to each by its label.

${questionLines}

Ask only these. Never add your own.

THEIR QUESTIONS
Then invite their questions. Answer only from this briefing:

${factLines}

Anything not listed: say you do not have that detail and ${recruiterName} will follow up. Never guess or invent.

BOUNDARIES
No offers, no decisions, no hints about how they did — a human reviews every call. If they ask for a person, agree and end the call politely.

CLOSING
Thank them, confirm ${recruiterName} will follow up, and say they will receive a copy of the conversation to correct anything misheard.`;
}

export interface GenerateQuestionsInput {
  roleTitle: string;
  jobDescription: string;
  candidateSummary: string;
  /** How many questions to generate. Kept small; long calls lose people. */
  count?: number;
}

const QUESTION_SYSTEM_PROMPT = `You write screening questions for a phone call with a job applicant.

The purpose of this call is to establish FIT between this specific candidate's background and this specific role — the things a recruiter would otherwise spend fifteen minutes on the phone finding out. It is not a technical interview and not a test.

Rules you must follow:
- Read the job description and the candidate's background together. Each question must come from the overlap or the gap between them: something this role requires that this candidate's history raises a question about.
- Ask about scope and ownership ("you owned X — what was your part in it?"), about the gap between what they have done and what this role needs, and about availability, notice period, work mode, location, and interest in the role.
- NEVER write a technical test question. No definitions, no algorithms, no "how would you implement", no "what is the difference between", no trivia, no whiteboard or coding problems. A later stage handles depth; this call does not.
- Prefer a question only answerable by this person about their own work. If a question could be sent unchanged to any other applicant, it is too generic — rewrite it.
- Each question must be answerable out loud in under a minute. No multi-part questions.
- Use plain spoken English. These are read aloud over a phone line.

You must NEVER write a question that touches: age or date of birth, graduation year, marital or family status, pregnancy or family plans, religion or caste, nationality, ethnicity, race, native language, disability or health, gender or sexual orientation, political views, or the candidate's current or past salary.

Asking whether someone is authorised to work in a country is permitted. Asking their nationality is not.
Asking salary expectations is permitted. Asking current salary is not.

Return only a JSON array of strings. No commentary.`;

export interface QuestionGenerator {
  generate(input: GenerateQuestionsInput): Promise<string[]>;
}

/**
 * OpenAI-backed question generator.
 *
 * The model is read from OPENAI_MODEL so it can be changed without a code
 * change, since which models a given key can reach varies by account.
 */
export function createOpenAIQuestionGenerator(
  client: OpenAI,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
): QuestionGenerator {
  return {
    async generate(input: GenerateQuestionsInput): Promise<string[]> {
      const count = input.count ?? 5;
      const response = await client.chat.completions.create({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: QUESTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Role: ${input.roleTitle}

Job description:
${input.jobDescription}

Candidate background:
${input.candidateSummary}

Write exactly ${count} screening questions.`,
          },
        ],
      });

      return parseQuestionList(response.choices[0]?.message?.content ?? "");
    },
  };
}

/** Extract a JSON array of questions from a model response. */
function parseQuestionList(text: string): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];

  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
