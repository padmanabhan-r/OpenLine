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
      candidateCount: sql<number>`(
        select count(*)::int from ${candidates} where ${candidates.jobId} = ${jobs.id}
      )`,
      callableCount: sql<number>`(
        select count(*)::int from ${candidates}
        where ${candidates.jobId} = ${jobs.id} and ${candidates.phoneE164} is not null
      )`,
      callCount: sql<number>`(
        select count(*)::int from ${screeningCalls} where ${screeningCalls.jobId} = ${jobs.id}
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

/** Candidates for a job, each with its most recent screening call if any. */
export async function listJobCandidates(jobId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(candidates)
    .where(eq(candidates.jobId, jobId))
    .orderBy(candidates.name);

  const calls = await db
    .select()
    .from(screeningCalls)
    .where(eq(screeningCalls.jobId, jobId))
    .orderBy(desc(screeningCalls.createdAt));

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
