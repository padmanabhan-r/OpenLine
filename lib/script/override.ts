import type OpenAI from "openai";

/**
 * A recruiter's own notes, turned into a goal and questions for one call.
 *
 * The recruiter writes what they want to find out ("check they can relocate
 * to Singapore and have run Kafka in production"). The model's only job is to
 * restate that as one goal sentence and a few short, neutral questions. It
 * adds no topics of its own: a model writing its own "fit" questions turned
 * an earlier version of this screen into an interview. What comes back is
 * shown for review, then assembled and guarded like any human edit.
 */
export interface ParsedOverride {
  goal: string;
  questions: string[];
}

export const MAX_OVERRIDE_QUESTIONS = 6;
const MAX_GOAL_LENGTH = 240;

const INSTRUCTIONS = `You turn a recruiter's notes into a phone-screening goal and questions, and return one JSON object.

"goal": one sentence, under 30 words, stating what this call should find out. Only what the notes ask for.

"questions": 1 to 6 questions an AI phone agent will ask a job candidate, in order. Each is one short, neutral, spoken-English sentence ending with a question mark. Cover only what the notes ask about, and never add a topic the notes do not mention. Never ask about age, marital status, family, children, pregnancy, religion, caste, nationality, disability, health, gender, or current salary; if the notes ask for one of those, leave it out.

Return only the JSON object.`;

const OVERRIDE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["goal", "questions"],
  properties: {
    goal: { type: "string" },
    questions: { type: "array", items: { type: "string" } },
  },
} as const;

/** Keep only what a script can carry: one line of goal, a few one-line questions. */
export function coerceOverride(raw: unknown): ParsedOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const goal =
    typeof record.goal === "string"
      ? record.goal.replace(/\s+/g, " ").trim().slice(0, MAX_GOAL_LENGTH)
      : "";
  const questions = (Array.isArray(record.questions) ? record.questions : [])
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, MAX_OVERRIDE_QUESTIONS);
  if (questions.length === 0) return null;
  return { goal, questions };
}

export function createOverrideParser(
  client: OpenAI,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
) {
  return {
    async parse(input: {
      roleTitle: string;
      companyName: string;
      notes: string;
    }): Promise<ParsedOverride | null> {
      const response = await client.responses.create({
        model,
        temperature: 0.2,
        instructions: INSTRUCTIONS,
        input: `Role: ${input.roleTitle} at ${input.companyName}
Recruiter's notes:
${input.notes}

Return the JSON object.`,
        text: {
          format: {
            type: "json_schema",
            name: "screen_override",
            strict: true,
            schema: OVERRIDE_SCHEMA,
          },
        },
      });
      try {
        return coerceOverride(JSON.parse(response.output_text));
      } catch {
        return null;
      }
    },
  };
}
