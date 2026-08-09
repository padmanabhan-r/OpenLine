import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { FactSheetEntry, ScriptQuestion } from "@/lib/script/build";
import type { GuardFinding } from "@/lib/script/guard";
import type { ScreeningResult } from "@/lib/script/schema";
import type { RefusalReason } from "@/lib/calle/port";
import type { RejectionReason } from "@/lib/phone/normalize";

/**
 * OpenLine's persistence.
 *
 * One design point drives most of this file: CALL-E has no endpoint to list
 * calls. `GET /v1/calls/{id}` requires an id you already hold, so a `call_id`
 * we fail to persist is a call we can never read back — its result, transcript,
 * and cost are simply lost. Every dispatch therefore writes a row *before* it
 * dials, and the CALL-E id is stored the moment it exists.
 */

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  companyName: text("company_name").notNull(),
  recruiterName: text("recruiter_name").notNull(),
  /** Raw job description, used to generate role-specific questions. */
  description: text("description").notNull(),
  /**
   * Facts the agent may state on the call. Inlined into the task text because
   * CALL-E has no mid-call tool calling — anything absent here is deferred to
   * a human rather than guessed.
   */
  factSheet: jsonb("fact_sheet")
    .$type<FactSheetEntry[]>()
    .notNull()
    .default([]),
  /** ISO country used to normalize national-format phone numbers, e.g. "IN". */
  defaultRegion: text("default_region"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Exactly as imported, kept so a rejection can be explained to a recruiter. */
    rawPhone: text("raw_phone").notNull(),
    /** E.164, or null when the number could not be resolved without guessing. */
    phoneE164: text("phone_e164"),
    /** Why normalization refused. Null when `phoneE164` is set. */
    phoneRejection: text("phone_rejection").$type<RejectionReason>(),
    email: text("email"),
    /** Background summary used to ground question generation. */
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("candidates_job_id_idx").on(table.jobId),
    // The same person must not be queued twice for one job, however their
    // number was formatted on the way in.
    uniqueIndex("candidates_job_phone_unique").on(table.jobId, table.phoneE164),
  ],
);

/** Lifecycle of a screening call, from queued through to reviewed. */
export type ScreeningCallStatus =
  | "pending"
  | "previewed"
  | "refused"
  | "dialing"
  | "completed"
  | "failed";

export const screeningCalls = pgTable(
  "screening_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),

    /**
     * Business-stable key derived from job, candidate and script version.
     * A retried dispatch reuses it, so CALL-E collapses the duplicate rather
     * than telephoning the candidate twice.
     */
    idempotencyKey: text("idempotency_key").notNull(),
    /** CALL-E's id. Null until a live call is accepted. */
    calleCallId: text("calle_call_id"),

    mode: text("mode").$type<"dry_run" | "live">().notNull(),
    status: text("status").$type<ScreeningCallStatus>().notNull(),

    /** The exact words that were, or would have been, spoken. */
    task: text("task").notNull(),
    questions: jsonb("questions").$type<ScriptQuestion[]>().notNull(),

    /** Set when the port refused to dial. */
    refusalReason: text("refusal_reason").$type<RefusalReason>(),
    refusalDetail: text("refusal_detail"),

    structuredResult: jsonb("structured_result").$type<ScreeningResult | null>(),
    completionConfidence: jsonb("completion_confidence").$type<{
      score: number;
      label: string;
    } | null>(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    transcript: jsonb("transcript")
      .$type<
        Array<{
          offsetSeconds: number | null;
          speaker: "bot" | "user" | "unknown";
          text: string;
        }>
      >()
      .notNull()
      .default([]),

    /** Post-call guard pass over the agent's own turns. */
    guardFindings: jsonb("guard_findings")
      .$type<GuardFinding[]>()
      .notNull()
      .default([]),

    /**
     * Routing, never rejection. OpenLine has no path that rejects a candidate;
     * an uncertain call becomes a human's problem instead of a silent decision.
     */
    needsHuman: boolean("needs_human").notNull().default(false),
    needsHumanReasons: jsonb("needs_human_reasons")
      .$type<string[]>()
      .notNull()
      .default([]),

    /** Unguessable token backing the candidate's right-of-reply link. */
    replyToken: text("reply_token"),
    candidateReply: text("candidate_reply"),
    candidateRepliedAt: timestamp("candidate_replied_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("screening_calls_job_id_idx").on(table.jobId),
    index("screening_calls_candidate_id_idx").on(table.candidateId),
    // Retry safety: the same logical dispatch can only ever create one row.
    uniqueIndex("screening_calls_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    // The webhook receiver looks calls up by CALL-E's id.
    uniqueIndex("screening_calls_calle_call_id_unique").on(table.calleCallId),
    uniqueIndex("screening_calls_reply_token_unique").on(table.replyToken),
  ],
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type ScreeningCall = typeof screeningCalls.$inferSelect;
export type NewScreeningCall = typeof screeningCalls.$inferInsert;
