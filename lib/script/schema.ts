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
        "When the candidate said they are available to interview, in their own terms, for example `weekday mornings` or `after 15 September`. Empty string if not discussed.",
    },
    notice_period: {
      type: "string",
      description:
        "The notice period the candidate stated, for example `2 months` or `immediate`. Empty string if not discussed.",
    },
    salary_expectation: {
      type: "string",
      description:
        "The salary expectation the candidate stated, in their own words, for example `around 60 lakh` or `open to discussion`. Empty string if not stated. Never record their current salary.",
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
      description: `What the candidate asked to happen next. Use \`human_callback_requested\` whenever they asked to speak to a person. ${UNKNOWN_NOTE}`,
    },
    call_recap: {
      type: "string",
      description:
        "Two or three sentences summarising how the conversation went, written so the candidate themselves could read it without surprise.",
    },
  },
} as const satisfies JsonObject;

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
