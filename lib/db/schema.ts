import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CandidateProfile } from "@/lib/candidates/profile";
import type { Stage } from "@/lib/candidates/stage";
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
  /**
   * BCP 47 tag the agent speaks on every call for this job — sent to CALL-E as
   * the recipient locale, and (for anything but English) written into the task
   * as an instruction to conduct the call in that language. One of
   * lib/jobs/language.ts; the questions stay English on the reviewed script.
   */
  language: text("language").notNull().default("en-IN"),
  /**
   * A filled or closed posting stops taking calls — dialling people for a role
   * that no longer exists is the kind of thing a machine will happily do at
   * scale. Records stay readable either way.
   */
  status: text("status")
    .$type<"open" | "filled" | "closed">()
    .notNull()
    .default("open"),
  /**
   * Why it is in that state. Required to reopen, because "we reopened it" is
   * not an answer to "what happened to the person who accepted".
   */
  statusReason: text("status_reason"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
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
    /**
     * The full imported record — career history, skills, and the 23 platform
     * signals — kept whole rather than flattened into columns. Nothing here is
     * queried on; it exists so a recruiter can see what the shortlist was made
     * from, and so a question can be grounded in a real project rather than an
     * adjective. Null for candidates imported from a plain CSV.
     */
    profile: jsonb("profile").$type<CandidateProfile | null>(),
    /**
     * Where this person stands in this job's pipeline, and the only definition
     * of "shortlisted" in the system — see `lib/candidates/stage.ts`. Seeded
     * rows carry the ATS's decision; uploaded resumes clear a score threshold.
     * Either way a recruiter can move anyone, and only the shortlisted stages
     * get called; the rest stay visible, with their reason, because a filter
     * nobody can see is a filter nobody can correct.
     */
    stage: text("stage").$type<Stage>().notNull().default("applied"),
    /**
     * Who moved them here: the ATS score, or a person overruling it. Worth a
     * column rather than an inference — "a machine ranked you 84" and "a
     * recruiter added you anyway" are different facts, and the second is the
     * one a candidate would want on the record.
     */
    shortlistedBy: text("shortlisted_by").$type<"ats" | "human">(),
    /** How this candidate arrived: bulk import (seed) or an uploaded resume. */
    source: text("source").$type<"import" | "resume">().notNull().default("import"),
    /** R2 object key of the uploaded resume PDF. Null for imported rows. */
    resumeKey: text("resume_key"),
    /**
     * Outcome of resume parsing. Null for imported rows, which were never
     * parsed. A failed parse still creates a row — a file that silently
     * disappears from a hiring pipeline is worse than a visible failure.
     */
    parseStatus: text("parse_status").$type<"parsed" | "parse_failed">(),
    parseError: text("parse_error"),
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

    status: text("status").$type<ScreeningCallStatus>().notNull(),
    /**
     * When dialing began. Lets the reconciler tell "in progress" from
     * "the process died mid-call and this row will say dialing forever".
     */
    dialStartedAt: timestamp("dial_started_at", { withTimezone: true }),
    /**
     * Bumped when a human edits the script. Folded into the idempotency key,
     * so an edited script can never be collapsed by CALL-E onto a stale
     * create for the pre-edit text.
     */
    scriptVersion: integer("script_version").notNull().default(1),

    /** The exact words that were, or would have been, spoken. */
    task: text("task").notNull(),
    questions: jsonb("questions").$type<ScriptQuestion[]>().notNull(),
    /**
     * The recruiter's goal for this call when they overrode the default
     * questions: what the call is for, shown to the recruiter. Never written
     * into the task; the agent acts on the reviewed questions alone. Null for
     * the default basic screen.
     */
    goal: text("goal"),

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
    // The reconciler looks stranded calls up by CALL-E's id.
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
