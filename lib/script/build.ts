import OpenAI from "openai";
import { inspectScript, type GuardResult } from "./guard";

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

  return `You are calling ${candidateName}, who applied for the ${roleTitle} role at ${companyName}.

OPENING
Greet ${candidateName} by name and confirm you are speaking to them. Say clearly that you are an AI assistant calling on behalf of ${recruiterName} at ${companyName} about their application, and that the conversation helps the team review every applicant rather than only a shortlist. Then ask whether now is a good time to talk for about five minutes.

If they say no, decline, or would rather not continue, thank them warmly, tell them a human will follow up by email, and end the call. Do not press them and do not ask the screening questions.

SCREENING QUESTIONS
If they agree to continue, work through these questions in order, in a natural conversational way. Refer to each by its label when you have its answer.

${questionLines}

Ask only these questions. Do not add questions of your own, even if the conversation seems to invite one.

THEIR QUESTIONS
This call goes both ways. After the screening questions, invite ${candidateName} to ask anything they want about the role, the team, or what happens next. Answer only from the briefing below.

${factLines}

If they ask something the briefing does not cover, say plainly that you do not have that detail and that ${recruiterName} will follow up. Do not guess, do not invent details, and do not speculate about anything that is not written above.

BOUNDARIES
You cannot make an offer, imply a decision, or tell ${candidateName} whether they were successful. You are gathering information so a person can review it. If they ask how they did, say that a human reviews every call and will be in touch.

If they ask to speak to a person at any point, agree immediately and end the call politely.

CLOSING
Thank ${candidateName} for their time and confirm that ${recruiterName} will follow up. Tell them they will receive a copy of what was discussed and can correct anything that was misheard.`;
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
export function parseQuestionList(text: string): string[] {
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

export interface BuiltScript {
  task: string;
  questions: ScriptQuestion[];
  guard: GuardResult;
}

/**
 * Generate questions, drop any the guard rejects, and assemble the script.
 *
 * Questions are filtered individually before assembly so one bad suggestion
 * costs a question rather than the whole call. The assembled script is then
 * checked again, and the port checks it a third time before dialing — the model
 * is never trusted to have followed its instructions.
 */
export async function buildScript(
  generator: QuestionGenerator,
  input: GenerateQuestionsInput &
    Omit<ScriptInput, "questions" | "roleTitle">,
): Promise<BuiltScript> {
  const raw = await generator.generate({
    roleTitle: input.roleTitle,
    jobDescription: input.jobDescription,
    candidateSummary: input.candidateSummary,
    ...(input.count === undefined ? {} : { count: input.count }),
  });

  const questions = raw
    .filter((text) => inspectScript(text).ok)
    .map((text, index) => ({ id: `q${index + 1}`, text }));

  const task = assembleTask({
    candidateName: input.candidateName,
    roleTitle: input.roleTitle,
    companyName: input.companyName,
    recruiterName: input.recruiterName,
    factSheet: input.factSheet,
    questions,
  });

  return { task, questions, guard: inspectScript(task) };
}
