import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "./index";
import { candidates, jobs, screeningCalls } from "./schema";
import { STAGES, isShortlisted } from "@/lib/candidates/stage";

/** The stages that count as on-the-shortlist, for use inside SQL. */
const SHORTLISTED_STAGES = STAGES.filter(isShortlisted);
const shortlistedSql = sql`(${sql.join(
  SHORTLISTED_STAGES.map((s) => sql`${s}`),
  sql`, `,
)})`;

export async function listJobs() {
  const db = getDb();
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      companyName: jobs.companyName,
      recruiterName: jobs.recruiterName,
      defaultRegion: jobs.defaultRegion,
      status: jobs.status,
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
        where c.job_id = jobs.id and c.stage in ${shortlistedSql}
      )`,
      callableCount: sql<number>`(
        select count(*)::int from ${candidates} c
        where c.job_id = jobs.id and c.stage in ${shortlistedSql}
          and c.phone_e164 is not null
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

/**
 * One row per *person*, not per application.
 *
 * A candidates row is an application — the same person applying to three roles
 * is three rows — so this folds them together. Phone number is the identity
 * where there is one (it is the thing OpenLine actually dials); name is the
 * fallback for rows whose number never resolved.
 */
export async function listProfiles() {
  const db = getDb();
  const identity = sql`coalesce(${candidates.phoneE164}, lower(${candidates.name}))`;

  return db
    .select({
      // The most recent application is the one the row links to.
      id: sql<string>`(array_agg(${candidates.id} order by ${candidates.createdAt} desc))[1]`,
      name: sql<string>`(array_agg(${candidates.name} order by ${candidates.createdAt} desc))[1]`,
      headline: sql<
        string | null
      >`(array_agg(${candidates.profile}->'profile'->>'headline' order by ${candidates.createdAt} desc))[1]`,
      applicationCount: sql<number>`count(*)::int`,
      shortlistedCount: sql<number>`count(*) filter (where ${candidates.stage} in ${shortlistedSql})::int`,
      lastAppliedAt: sql<Date>`max(${candidates.createdAt})`,
    })
    .from(candidates)
    .groupBy(identity)
    .orderBy(desc(sql`max(${candidates.createdAt})`));
}

/**
 * Every job this person has applied to, with the decision for each.
 *
 * Matched the same way `listProfiles` groups: by phone where there is one.
 */
export async function listApplicationsForCandidate(candidateId: string) {
  const db = getDb();

  const [self] = await db
    .select({ phoneE164: candidates.phoneE164, name: candidates.name })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!self) return [];

  const sameParty = self.phoneE164
    ? eq(candidates.phoneE164, self.phoneE164)
    : sql`lower(${candidates.name}) = lower(${self.name}) and ${candidates.phoneE164} is null`;

  return db
    .select({
      id: candidates.id,
      jobId: jobs.id,
      jobTitle: jobs.title,
      companyName: jobs.companyName,
      stage: candidates.stage,
      shortlistedBy: candidates.shortlistedBy,
      source: candidates.source,
      parseStatus: candidates.parseStatus,
      appliedAt: candidates.createdAt,
      matchScore: sql<
        number | null
      >`(${candidates.profile}->'screening'->>'matchScore')::int`,
    })
    .from(candidates)
    .innerJoin(jobs, eq(candidates.jobId, jobs.id))
    .where(sameParty)
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
      stage: candidates.stage,
      shortlistedBy: candidates.shortlistedBy,
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
      scriptVersion: screeningCalls.scriptVersion,
      needsHuman: screeningCalls.needsHuman,
      // Three fields out of the result blob, not the blob: enough for a row
      // to say what the call found without dragging the transcript along.
      reachedCandidate: sql<string | null>`${screeningCalls.structuredResult}->>'reached_candidate'`,
      interestLevel: sql<string | null>`${screeningCalls.structuredResult}->>'interest_level'`,
      noticePeriod: sql<string | null>`${screeningCalls.structuredResult}->>'notice_period'`,
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
