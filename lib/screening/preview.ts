import OpenAI from "openai";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates as candidatesTable, jobs as jobsTable, screeningCalls } from "@/lib/db/schema";
import type { Candidate, Job } from "@/lib/db/schema";
import { assembleTask, createOpenAIQuestionGenerator, type ScriptQuestion } from "@/lib/script/build";
import { inspectScript } from "@/lib/script/guard";
import { SCREENING_RESULT_SCHEMA } from "@/lib/script/schema";
import { createCallePort } from "@/lib/calle/port";

/**
 * Turn a queued candidate into a reviewable call.
 *
 * In dry run this stops at the preview: the exact words that would be spoken,
 * stored so a recruiter can read them before anything dials. That artefact is
 * the point — a script you cannot inspect is a script you cannot be responsible
 * for.
 */

/**
 * Used when no OpenAI key is configured.
 *
 * Deliberately generic and deliberately lawful: these are the questions any
 * screening call needs, and they let the whole pipeline be exercised without a
 * second API dependency.
 */
const REGION_NAMES: Record<string, string> = {
  IN: "India",
  US: "the United States",
  GB: "the United Kingdom",
  SG: "Singapore",
  AU: "Australia",
  AE: "the United Arab Emirates",
  MY: "Malaysia",
  MX: "Mexico",
  BR: "Brazil",
};

export function defaultQuestions(roleTitle: string, region?: string | null): string[] {
  // Work authorisation is lawful to ask; it has to name the right country to be
  // a sensible question, so it follows the job's region.
  const country = region ? REGION_NAMES[region] : null;

  return [
    `What drew you to apply for the ${roleTitle} role?`,
    "Walk me through a system you owned end to end. What was your part in it?",
    "What is your notice period, and when could you realistically start?",
    "What are your salary expectations for this role?",
    country
      ? `Are you authorised to work in ${country}?`
      : "Are you authorised to work in the country this role is based in?",
  ];
}

async function questionsFor(job: Job, candidate: Candidate): Promise<ScriptQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  const raw = apiKey
    ? await createOpenAIQuestionGenerator(new OpenAI({ apiKey })).generate({
        roleTitle: job.title,
        jobDescription: job.description,
        candidateSummary: candidate.summary ?? "No background summary available.",
        count: 5,
      })
    : defaultQuestions(job.title, job.defaultRegion);

  // Questions are filtered individually, so one bad suggestion costs a question
  // rather than the whole call. The assembled script is checked again below.
  return raw
    .filter((text) => inspectScript(text).ok)
    .map((text, index) => ({ id: `q${index + 1}`, text }));
}

export interface PreviewOutcome {
  candidateId: string;
  name: string;
  status: "previewed" | "refused" | "skipped";
  detail?: string;
}

/**
 * Generate and persist a preview for one candidate.
 *
 * Careful with rows that already exist. A regenerate must reuse the existing
 * row's idempotency key and version — minting a fresh `:v1` after an edit
 * bumped the row to `:v2` would insert a second row for the same person, two
 * scripts, one dialable. And a row that is dialing or done is not touched at
 * all: regenerating a script for a call that is happening right now would
 * replace the record of what is actually being said on the line.
 */
async function previewOne(
  job: typeof jobsTable.$inferSelect,
  candidate: Candidate,
  port: ReturnType<typeof createCallePort>,
): Promise<PreviewOutcome> {
  const db = getDb();

  if (!candidate.phoneE164) {
    return {
      candidateId: candidate.id,
      name: candidate.name,
      status: "skipped",
      detail: `Phone number could not be resolved (${candidate.phoneRejection ?? "unknown"}).`,
    };
  }

  const [existing] = await db
    .select({
      id: screeningCalls.id,
      status: screeningCalls.status,
      idempotencyKey: screeningCalls.idempotencyKey,
    })
    .from(screeningCalls)
    .where(
      and(
        eq(screeningCalls.jobId, job.id),
        eq(screeningCalls.candidateId, candidate.id),
      ),
    )
    .limit(1);

  if (existing && (existing.status === "dialing" || existing.status === "completed")) {
    return {
      candidateId: candidate.id,
      name: candidate.name,
      status: "skipped",
      detail: "A call for this candidate is in progress or already happened.",
    };
  }

  const questions = await questionsFor(job, candidate);
  const task = assembleTask({
    candidateName: candidate.name,
    roleTitle: job.title,
    companyName: job.companyName,
    recruiterName: job.recruiterName,
    questions,
    factSheet: job.factSheet,
  });

  const guard = inspectScript(task);
  const idempotencyKey =
    existing?.idempotencyKey ?? `${job.id}:${candidate.id}:v1`;

  // Dry run in the port too, so the preview travels the exact code path a
  // live dial would — including the guard and allowlist checks.
  const outcome = await port.dial({
    task,
    phone: candidate.phoneE164,
    resultSchema: SCREENING_RESULT_SCHEMA as unknown as Record<string, unknown>,
    idempotencyKey,
    metadata: { jobId: job.id, candidateId: candidate.id },
  });

  const refused = !outcome.ok;

  await db
    .insert(screeningCalls)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      idempotencyKey,
      mode: "dry_run",
      status: refused ? "refused" : "previewed",
      task,
      questions,
      guardFindings: guard.findings,
      refusalReason: refused ? outcome.refusal : null,
      refusalDetail: refused ? outcome.detail : null,
      needsHuman: refused,
      needsHumanReasons: refused ? [outcome.detail] : [],
    })
    .onConflictDoUpdate({
      target: screeningCalls.idempotencyKey,
      set: {
        task,
        questions,
        mode: "dry_run",
        status: refused ? "refused" : "previewed",
        guardFindings: guard.findings,
        refusalReason: refused ? outcome.refusal : null,
        refusalDetail: refused ? outcome.detail : null,
        needsHuman: refused,
        needsHumanReasons: refused ? [outcome.detail] : [],
      },
    });

  return {
    candidateId: candidate.id,
    name: candidate.name,
    status: refused ? "refused" : "previewed",
    ...(refused ? { detail: outcome.detail } : {}),
  };
}

/**
 * The port previews never dial, so it always runs in dry run — even when the
 * deployment has live calls enabled. The allowlist is a dial-time control:
 * gating script generation on it would mean a recruiter could not read the
 * script for anyone they had not already authorised, which is backwards.
 * Placing the call (lib/screening/dispatch) does check it.
 */
function previewPort() {
  return createCallePort({
    mode: "dry_run",
    apiKey: process.env.CALLE_API_KEY ?? "",
    allowlist: [],
  });
}

/** Generate and persist a preview for every callable candidate on a job. */
export async function previewJob(jobId: string): Promise<PreviewOutcome[]> {
  const db = getDb();

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) throw new Error(`No job ${jobId}`);

  // Only the shortlist. The rest of the applicant pool is stored so a human can
  // see who was filtered out, but generating a call script for someone the
  // recruiter has already declined would be building a call nobody sanctioned.
  const roster = await db
    .select()
    .from(candidatesTable)
    .where(
      and(
        eq(candidatesTable.jobId, jobId),
        eq(candidatesTable.shortlisted, true),
      ),
    );

  const port = previewPort();
  const outcomes: PreviewOutcome[] = [];
  for (const candidate of roster) {
    outcomes.push(await previewOne(job, candidate, port));
  }
  return outcomes;
}

/** Generate a preview for one candidate — the per-row "Build script" path. */
export async function previewCandidate(
  jobId: string,
  candidateId: string,
): Promise<PreviewOutcome> {
  const db = getDb();

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId)).limit(1);
  if (!job) throw new Error(`No job ${jobId}`);

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(
      and(eq(candidatesTable.id, candidateId), eq(candidatesTable.jobId, jobId)),
    )
    .limit(1);
  if (!candidate) throw new Error(`No candidate ${candidateId} on job ${jobId}`);

  if (!candidate.shortlisted) {
    return {
      candidateId,
      name: candidate.name,
      status: "skipped",
      detail: "Not on the shortlist — OpenLine only scripts calls the recruiter sanctioned.",
    };
  }

  return previewOne(job, candidate, previewPort());
}
