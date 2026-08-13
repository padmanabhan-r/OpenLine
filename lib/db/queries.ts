import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { candidates, jobs, screeningCalls } from "./schema";

export async function listJobs() {
  const db = getDb();
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      companyName: jobs.companyName,
      recruiterName: jobs.recruiterName,
      defaultRegion: jobs.defaultRegion,
      createdAt: jobs.createdAt,
      // Both sides of each correlation are qualified by hand, and that is not
      // decoration. Interpolating `${candidates.jobId} = ${jobs.id}` renders
      // both columns *unqualified* — `"job_id" = "id"` — so inside the subquery
      // `id` binds to candidates.id rather than the outer job, every count comes
      // back 0, and the page looks empty while the table is full. Aliasing the
      // inner table and naming the outer one removes the ambiguity.
      candidateCount: sql<number>`(
        select count(*)::int from ${candidates} c where c.job_id = jobs.id
      )`,
      shortlistedCount: sql<number>`(
        select count(*)::int from ${candidates} c
        where c.job_id = jobs.id and c.shortlisted
      )`,
      callableCount: sql<number>`(
        select count(*)::int from ${candidates} c
        where c.job_id = jobs.id and c.shortlisted and c.phone_e164 is not null
      )`,
    })
    .from(jobs)
    .orderBy(desc(jobs.createdAt));
}

export async function getJob(id: string) {
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return job ?? null;
}

/** Every candidate across all jobs, for the Profiles tab. */
export async function listProfiles() {
  const db = getDb();
  return db
    .select({
      id: candidates.id,
      name: candidates.name,
      shortlisted: candidates.shortlisted,
      source: candidates.source,
      parseStatus: candidates.parseStatus,
      jobTitle: jobs.title,
      headline: sql<string | null>`${candidates.profile}->'profile'->>'headline'`,
      matchScore: sql<
        number | null
      >`(${candidates.profile}->'screening'->>'matchScore')::int`,
    })
    .from(candidates)
    .innerJoin(jobs, eq(candidates.jobId, jobs.id))
    .orderBy(desc(candidates.createdAt));
}

/** A single candidate with the job they applied to. */
export async function getCandidate(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ candidate: candidates, job: jobs })
    .from(candidates)
    .innerJoin(jobs, eq(candidates.jobId, jobs.id))
    .where(eq(candidates.id, id))
    .limit(1);
  if (!row) return null;

  const calls = await db
    .select()
    .from(screeningCalls)
    .where(eq(screeningCalls.candidateId, id))
    .orderBy(desc(screeningCalls.createdAt));

  return { ...row, calls };
}

/**
 * Candidates for a job, each with its most recent screening call if any.
 *
 * Both selects are deliberately narrow. `select()` on candidates drags the full
 * `profile` blob for every applicant — 258kB and about three seconds for a
 * roster of fifty — to render a list that shows a headline and a score. The
 * four fields the list actually needs are pulled out of the JSON in Postgres
 * instead, which is the difference between a 3s page and a 300ms one. The whole
 * profile is still available on the candidate page, where it is one row.
 *
 * Screening calls get the same treatment: the task text and transcript are
 * another 87kB that nothing on this page reads.
 */
export async function listJobCandidates(jobId: string) {
  const db = getDb();

  const rowsQuery = db
    .select({
      id: candidates.id,
      name: candidates.name,
      phoneE164: candidates.phoneE164,
      phoneRejection: candidates.phoneRejection,
      // Only ever rendered as one truncated line, and the full text is the
      // multi-paragraph grounding summary — 1.7kB a head, 87kB a roster.
      summary: sql<string | null>`left(${candidates.summary}, 200)`,
      shortlisted: candidates.shortlisted,
      headline: sql<
        string | null
      >`${candidates.profile}->'profile'->>'headline'`,
      yearsOfExperience: sql<
        number | null
      >`(${candidates.profile}->'profile'->>'yearsOfExperience')::float`,
      matchScore: sql<
        number | null
      >`(${candidates.profile}->'screening'->>'matchScore')::int`,
      note: sql<string | null>`${candidates.profile}->'screening'->>'note'`,
    })
    .from(candidates)
    .where(eq(candidates.jobId, jobId))
    .orderBy(candidates.name);

  const callsQuery = db
    .select({
      id: screeningCalls.id,
      candidateId: screeningCalls.candidateId,
      status: screeningCalls.status,
      guardFindings: screeningCalls.guardFindings,
    })
    .from(screeningCalls)
    .where(eq(screeningCalls.jobId, jobId))
    .orderBy(desc(screeningCalls.createdAt));

  // Neither query depends on the other, and each is a round trip to Neon.
  const [rows, calls] = await Promise.all([rowsQuery, callsQuery]);

  const latest = new Map<string, (typeof calls)[number]>();
  for (const call of calls) {
    if (!latest.has(call.candidateId)) latest.set(call.candidateId, call);
  }

  return rows.map((candidate) => ({
    candidate,
    call: latest.get(candidate.id) ?? null,
  }));
}

export async function listCalls() {
  const db = getDb();
  return db
    .select({
      call: screeningCalls,
      candidateName: candidates.name,
      jobTitle: jobs.title,
    })
    .from(screeningCalls)
    .innerJoin(candidates, eq(screeningCalls.candidateId, candidates.id))
    .innerJoin(jobs, eq(screeningCalls.jobId, jobs.id))
    .orderBy(desc(screeningCalls.createdAt));
}

export async function getCall(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      call: screeningCalls,
      candidate: candidates,
      job: jobs,
    })
    .from(screeningCalls)
    .innerJoin(candidates, eq(screeningCalls.candidateId, candidates.id))
    .innerJoin(jobs, eq(screeningCalls.jobId, jobs.id))
    .where(eq(screeningCalls.id, id))
    .limit(1);
  return row ?? null;
}
