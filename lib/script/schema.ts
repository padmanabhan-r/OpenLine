import type { JsonObject } from "@call-e/calle";

/**
 * The extraction contract for a screening call.
 *
 * CALL-E validates the model's extraction against this schema and returns `null`
 * rather than a half-invented object when the evidence does not support one. The
 * schema is therefore the main lever for result quality, and it is written to
 * three rules drawn from CALL-E's own guidance:
 *
 *   1. Prefer string enums over booleans, and always include "unknown". A call
 *      that never reached the topic must be able to say so.
 *   2. Put the classification rules in `description` — those strings are fed to
 *      the extraction model as guidance.
 *   3. Keep it small. A focused schema extracts more reliably than a large one.
 *
 * Every substantive answer carries an `evidence` field holding the candidate's
 * own words. Nothing reaches a recruiter's screen that cannot be traced to
 * something the candidate actually said.
 *
 * Note the field names: CALL-E reserves `summary`, `status`, `transcript`,
 * `call_id` and timing fields on recipient results, hence `answer_status` and
 * `call_recap`.
 */

const UNKNOWN_NOTE =
  "Use `unknown` when the call did not produce clear evidence either way. Never guess.";

export const SCREENING_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reached_candidate",
    "consent_given",
    "answers",
    "availability",
    "notice_period",
    "salary_expectation",
    "candidate_questions",
    "interest_level",
    "followup",
    "call_recap",
  ],
  properties: {
    reached_candidate: {
      type: "string",
      enum: ["yes", "no", "voicemail", "wrong_person", "unknown"],
      description: `Whether the intended candidate personally came on the line. Use \`voicemail\` if only an answering machine was reached, and \`wrong_person\` if someone else answered and the candidate was unavailable. ${UNKNOWN_NOTE}`,
    },
    consent_given: {
      type: "string",
      enum: ["yes", "no", "unknown"],
      description: `Whether the candidate agreed to continue the screening conversation after being told they were speaking to an AI assistant. Use \`no\` if they declined, asked to be called back by a human, or ended the call. ${UNKNOWN_NOTE}`,
    },
    answers: {
      type: "array",
      description:
        "One entry per screening question that was put to the candidate, in the order asked. Omit questions that were never reached.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question_id", "answer_status", "answer", "evidence"],
        properties: {
          question_id: {
            type: "string",
            description:
              "The identifier of the question as supplied in the call instructions, for example `q1`.",
          },
          answer_status: {
            type: "string",
            enum: [
              "answered",
              "partially_answered",
              "declined",
              "not_asked",
              "unclear",
            ],
            description:
              "Use `answered` only when the candidate gave a complete response. Use `declined` when they chose not to answer, `not_asked` when the question was never put to them, and `unclear` when they responded but the meaning could not be determined.",
          },
          answer: {
            type: "string",
            description:
              "A concise factual summary of the candidate's response. Empty string when the question was not answered.",
          },
          evidence: {
            type: "string",
            description:
              "The candidate's own words supporting this answer, quoted verbatim from the transcript. Empty string when they did not answer. Do not paraphrase and do not invent a quotation.",
          },
        },
      },
    },
    availability: {
      type: "string",
      description:
        "When the candidate said they could start the role, in their own words: their answer to the question about when they could start, for example `October` or `after my notice period`. Empty string only if they were not asked or gave no answer.",
    },
    notice_period: {
      type: "string",
      description:
        "The notice period the candidate stated when asked, for example `2 months` or `immediate`. Empty string only if they were not asked or gave no answer.",
    },
    salary_expectation: {
      type: "string",
      description:
        "The salary expectation the candidate stated, in their own words, for example `around $80,000 a year` or `open to discussion`. Empty string if not stated. Never record their current salary.",
    },
    candidate_questions: {
      type: "array",
      description:
        "Questions the CANDIDATE asked about the role, company, or process. This captures what the candidate wanted to know, so a recruiter can follow up on anything left unanswered. Empty array if they asked nothing.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "was_answered"],
        properties: {
          question: {
            type: "string",
            description: "What the candidate asked, in their own words.",
          },
          was_answered: {
            type: "string",
            enum: ["yes", "partially", "no", "unknown"],
            description:
              "Whether the assistant was able to answer it from the briefing it was given.",
          },
        },
      },
    },
    interest_level: {
      type: "string",
      enum: ["high", "medium", "low", "withdrew", "unknown"],
      description: `The candidate's expressed interest in continuing with this role. Use \`withdrew\` only if they explicitly asked to be removed from consideration. This records what the candidate said about their own interest; it is not an assessment of the candidate. ${UNKNOWN_NOTE}`,
    },
    followup: {
      type: "string",
      enum: [
        "human_callback_requested",
        "reschedule_requested",
        "proceed",
        "none",
        "unknown",
      ],
      description: `The next step this call points to. Use \`proceed\` when the candidate took part in the screen and wants to continue with the role, even if they asked for nothing specific. Use \`human_callback_requested\` whenever they asked to speak to a person, \`reschedule_requested\` when they asked to be called at another time, and \`none\` only when they declined, withdrew, or the screen did not happen. ${UNKNOWN_NOTE}`,
    },
    call_recap: {
      type: "string",
      description:
        "Two or three sentences summarising how the conversation went, written so the candidate themselves could read it without surprise.",
    },
  },
} as const satisfies JsonObject;

/** A result with its empty headline fields filled, and where each fill came from. */
export type CompletedResult = ScreeningResult & {
  filledFrom: Partial<Record<"notice_period" | "availability" | "followup", string>>;
};

const ASKS_NOTICE = /\bnotice period\b/;
const ASKS_START = /\b(?:could|can|would)\s+you\s+(?:realistically\s+)?start\b(?!\s+(?:in|at|with|working)\b)|\bstart\s+date\b/;

/**
 * Fill the headline fields from the answers they came from, for display.
 *
 * CALL-E extracts each answer with the candidate's own words, but the
 * top-level fields are separate extractions, and a live call came back with
 * the start date empty while the answer to "When could you realistically
 * start?" said "October". This fills a field only from an answered question
 * that asks for that field and nothing else, never replaces a field CALL-E
 * filled, and says which answer it used. The stored record stays CALL-E's.
 *
 * Salary is never filled this way. CALL-E is told never to record current
 * salary in that field, and an empty field can mean it obeyed; the answer
 * is still shown, with its quote, in the answers list.
 *
 * A screen the candidate reached, consented to, and said they are interested
 * in reads as `proceed` rather than `none`. `unknown`, a request for a person,
 * a reschedule, a withdrawal, or a missing consent is left as recorded.
 */
export function completeResult(
  result: ScreeningResult,
  questions: ReadonlyArray<{ id: string; text: string }>,
): CompletedResult {
  const textOf = new Map(questions.map((q) => [q.id, q.text.toLowerCase()]));
  const filledFrom: CompletedResult["filledFrom"] = {};

  const answerTo = (asks: RegExp, notAlso: RegExp) =>
    result.answers.find((a) => {
      const text = textOf.get(a.question_id) ?? "";
      return (
        (a.answer_status === "answered" || a.answer_status === "partially_answered") &&
        asks.test(text) &&
        !notAlso.test(text) &&
        Boolean(a.answer.trim() || a.evidence.trim())
      );
    });

  const fill = (
    key: "notice_period" | "availability",
    asks: RegExp,
    notAlso: RegExp,
  ): string => {
    const current = result[key];
    if (current?.trim()) return current;
    const found = answerTo(asks, notAlso);
    if (!found) return "";
    filledFrom[key] = found.question_id;
    return (found.answer.trim() || found.evidence.trim()).replace(/\.$/, "");
  };

  const notice_period = fill("notice_period", ASKS_NOTICE, ASKS_START);
  const availability = fill("availability", ASKS_START, ASKS_NOTICE);

  const tookPart = result.reached_candidate === "yes" && result.consent_given === "yes";
  const interested = result.interest_level === "high" || result.interest_level === "medium";
  let followup = result.followup;
  if (followup === "none" && tookPart && interested) {
    followup = "proceed";
    filledFrom.followup = "the call";
  }

  return { ...result, notice_period, availability, followup, filledFrom };
}

/** Runtime shape of a schema-valid screening result. */
export interface ScreeningResult {
  reached_candidate: "yes" | "no" | "voicemail" | "wrong_person" | "unknown";
  consent_given: "yes" | "no" | "unknown";
  answers: Array<{
    question_id: string;
    answer_status:
      | "answered"
      | "partially_answered"
      | "declined"
      | "not_asked"
      | "unclear";
    answer: string;
    evidence: string;
  }>;
  availability?: string;
  notice_period?: string;
  salary_expectation?: string;
  candidate_questions: Array<{
    question: string;
    was_answered: "yes" | "partially" | "no" | "unknown";
  }>;
  interest_level: "high" | "medium" | "low" | "withdrew" | "unknown";
  followup:
    | "human_callback_requested"
    | "reschedule_requested"
    | "proceed"
    | "none"
    | "unknown";
  call_recap: string;
}

/**
 * Decide whether a completed call needs a human before anything is recorded.
 *
 * OpenLine never lets an uncertain call become a confident database write, and
 * it never lets the agent reject anyone. Routing to a human is always available;
 * rejection never is.
 */
export function needsHuman(input: {
  structuredResult: ScreeningResult | null;
  completionConfidence: { score: number; label: string } | null;
  guardClean: boolean;
}): { needsHuman: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.structuredResult === null) {
    reasons.push("CALL-E could not extract a schema-valid result.");
  }

  if (!input.guardClean) {
    reasons.push("The agent asked a prohibited question during the call.");
  }

  const confidence = input.completionConfidence;
  if (confidence && confidence.label === "low") {
    reasons.push(
      `CALL-E reported low confidence (${confidence.score}) in the outcome.`,
    );
  }

  const result = input.structuredResult;
  if (result) {
    if (result.consent_given !== "yes") {
      reasons.push("The candidate did not consent to an AI screening call.");
    }
    if (result.followup === "human_callback_requested") {
      reasons.push("The candidate asked to speak to a person.");
    }
    if (result.reached_candidate === "wrong_person") {
      reasons.push("Someone other than the candidate answered.");
    }
    const unanswered = result.candidate_questions.filter(
      (q) => q.was_answered === "no",
    );
    if (unanswered.length > 0) {
      reasons.push(
        `The candidate asked ${unanswered.length} question(s) the assistant could not answer.`,
      );
    }
  }

  return { needsHuman: reasons.length > 0, reasons };
}
