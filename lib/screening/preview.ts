import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates as candidatesTable, jobs as jobsTable, screeningCalls } from "@/lib/db/schema";
import type { Candidate, Job } from "@/lib/db/schema";
import { assembleTask, type ScriptQuestion } from "@/lib/script/build";
import { inspectScript } from "@/lib/script/guard";
import { STAGES, isShortlisted } from "@/lib/candidates/stage";

/** Only people on the shortlist get a script written for them. */
const SHORTLISTED_STAGES = STAGES.filter(isShortlisted);

/**
 * Turn a queued candidate into a reviewable script.
 *
 * Nothing dials from here. This produces the exact words that will be spoken,
 * stored so a recruiter can read and edit them first — a script you cannot
 * inspect is a script you cannot be responsible for.
 */

/**
 * The basic screen, fixed for every candidate.
 *
 * A live call proved model-written "fit" questions turn a two-minute screen
 * into an interview and leave the structured result blank. These five map
 * one-to-one onto what the recruiter actually reads back — interest, current
 * work, notice period, start date, salary expectation — so the same call
 * fills the same fields every time. No model writes them; a recruiter can
 * still edit them per candidate afterwards.
 */
export function basicScreenQuestions(roleTitle: string, companyName: string): string[] {
  return [
    `Are you still interested in the ${roleTitle} role at ${companyName}?`,
    "Briefly, what are you working on in your current role?",
    "What is your notice period?",
    "When could you realistically start?",
    "What are your salary expectations for this role?",
  ];
}

function questionsFor(job: Job): ScriptQuestion[] {
  // The guard still inspects every question — the template is trusted no more
  // than the model was. One bad question costs a question, not the call, and
  // the assembled script is checked again below.
  return basicScreenQuestions(job.title, job.companyName)
    .filter((text) => inspectScript(text).ok)
    .map((text, index) => ({ id: `q${index + 1}`, text }));
}

/**
 * Compose the current script for one candidate: questions, task, guard result.
 *
 * The one place the words come from. Preview uses it, and call-again uses it
 * too — a re-dial speaks the script as it stands today, never a stale clone of
 * what was said last time.
 */
export function composeScript(job: Job, candidate: Candidate) {
  const questions = questionsFor(job);
  const task = assembleTask({
    candidateName: candidate.name,
    roleTitle: job.title,
    companyName: job.companyName,
    recruiterName: job.recruiterName,
    questions,
    factSheet: job.factSheet,
  });
  return { questions, task, guard: inspectScript(task) };
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
    // A candidate can have several rows once call-again exists; the latest
    // one is the live script, the rest are records.
    .orderBy(desc(screeningCalls.createdAt))
    .limit(1);

  if (existing && (existing.status === "dialing" || existing.status === "completed")) {
    return {
      candidateId: candidate.id,
      name: candidate.name,
      status: "skipped",
      detail: "A call for this candidate is in progress or already happened.",
    };
  }

  // The same guard that runs again at dial time. A violating script is stored
  // as refused with its findings visible, so the recruiter sees exactly what
  // was caught rather than a call that quietly never happens.
  const { questions, task, guard } = composeScript(job, candidate);
  const refused = !guard.ok;
  const refusalDetail = refused
    ? `Script contains ${guard.findings.length} prohibited question(s): ${guard.findings
        .map((f) => f.category)
        .join(", ")}`
    : null;
  const idempotencyKey =
    existing?.idempotencyKey ?? `${job.id}:${candidate.id}:v1`;

  await db
    .insert(screeningCalls)
    .values({
      jobId: job.id,
      candidateId: candidate.id,
      idempotencyKey,
      status: refused ? "refused" : "previewed",
      task,
      questions,
      guardFindings: guard.findings,
      refusalReason: refused ? "guard_violation" : null,
      refusalDetail,
      needsHuman: refused,
      needsHumanReasons: refusalDetail ? [refusalDetail] : [],
    })
    .onConflictDoUpdate({
      target: screeningCalls.idempotencyKey,
      set: {
        task,
        questions,
        status: refused ? "refused" : "previewed",
        guardFindings: guard.findings,
        refusalReason: refused ? "guard_violation" : null,
        refusalDetail,
        needsHuman: refused,
        needsHumanReasons: refusalDetail ? [refusalDetail] : [],
      },
    });

  return {
    candidateId: candidate.id,
    name: candidate.name,
    status: refused ? "refused" : "previewed",
    ...(refusalDetail ? { detail: refusalDetail } : {}),
  };
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
        inArray(candidatesTable.stage, SHORTLISTED_STAGES),
      ),
    );

  const outcomes: PreviewOutcome[] = [];
  for (const candidate of roster) {
    outcomes.push(await previewOne(job, candidate));
  }
  return outcomes;
}

/** Generate a preview for one candidate — what the first click of Call does. */
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

  if (!isShortlisted(candidate.stage)) {
    return {
      candidateId,
      name: candidate.name,
      status: "skipped",
      detail: "Not on the shortlist — OpenLine only scripts calls the recruiter sanctioned.",
    };
  }

  return previewOne(job, candidate);
}
