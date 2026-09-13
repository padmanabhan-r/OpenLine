import type OpenAI from "openai";
import type { FactSheetEntry } from "@/lib/script/build";

/**
 * Draft a job posting from a few typed details.
 *
 * The description is prose a candidate reads; the fact sheet is what the
 * agent will say out loud, verbatim, when a candidate asks. That second job
 * is why the prompt is strict about invention: a made-up salary band on a
 * posting is embarrassing, but a made-up one spoken on a phone call is a
 * promise nobody authorised. Anything the brief does not state is left out,
 * and the recruiter reviews both fields before the job exists.
 */

export interface JobDraft {
  description: string;
  factSheet: FactSheetEntry[];
}

export interface JobDrafter {
  draft(input: { title: string; companyName: string; brief: string }): Promise<JobDraft | null>;
}

export const DRAFT_INSTRUCTIONS = `You write job postings for a recruiter, from a short brief, and return one JSON object.

"description": the posting as plain text (no markdown, no asterisks). Use these upper-case section headings, each on its own line, followed by a blank line: ABOUT THE ROLE (two or three short paragraphs), WHAT YOU'D OWN (bulleted with "- "), WHAT WE NEED (bulleted), NICE TO HAVE (bulleted, only if the brief supports it). Write in a plain, direct voice — specific, no hype, no buzzwords, no "rockstar". Everything must follow from the brief; expand and structure it, do not invent duties, technologies, or numbers the brief does not imply.

"factSheet": an array of { "label", "value" } pairs — the facts an AI phone assistant may state to candidates who ask. Include ONLY facts present in the brief: salary or budget, location or remote policy, working hours, notice period expectations, interview process, team size, start date, contract type. If the brief does not state a fact, omit it entirely. Never estimate, never assume, never fill a gap with a typical value. An empty array is a correct answer.

Never include or ask about age, marital status, religion, caste, nationality, disability, gender, or current salary. Return only the JSON object, with both keys.`;

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["description", "factSheet"],
  properties: {
    description: { type: "string" },
    factSheet: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: { label: { type: "string" }, value: { type: "string" } },
      },
    },
  },
} as const;

const MAX_FACTS = 8;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function coerceJobDraft(raw: unknown): JobDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const description = str(r.description);
  if (!description) return null;
  const factSheet = (Array.isArray(r.factSheet) ? r.factSheet : [])
    .map((f) => {
      const entry = (f ?? {}) as Record<string, unknown>;
      return { label: str(entry.label), value: str(entry.value) };
    })
    .filter((f) => f.label && f.value)
    .slice(0, MAX_FACTS);
  return { description, factSheet };
}

export function createJobDrafter(
  client: OpenAI,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
): JobDrafter {
  return {
    async draft(input) {
      const response = await client.responses.create({
        model,
        temperature: 0.4,
        instructions: DRAFT_INSTRUCTIONS,
        input: `Title: ${input.title}
Company: ${input.companyName}
Brief: ${input.brief}

Return the JSON object.`,
        // A strict schema, not free JSON: in JSON mode the model sometimes
        // returned the description alone and dropped the fact sheet key.
        text: {
          format: {
            type: "json_schema",
            name: "job_draft",
            strict: true,
            schema: DRAFT_SCHEMA,
          },
        },
      });
      try {
        return coerceJobDraft(JSON.parse(response.output_text));
      } catch {
        return null;
      }
    },
  };
}
