"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates, jobs, screeningCalls } from "@/lib/db/schema";
import { listApplicationsForCandidate } from "@/lib/db/queries";
import { addExistingToJob } from "@/lib/resume/ingest";
import { deleteResumes } from "@/lib/storage/r2";
import { operatorStatus } from "@/lib/operator";

/**
 * Add a person already in the system to another job, without a new upload.
 * Scoring, when there is a resume to score, happens in `addExistingToJob`.
 */
export async function addProfileToJob(candidateId: string, jobId: string) {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false as const, reason: operator.reason };
  if (!UUID.test(candidateId) || !UUID.test(jobId)) {
    return { ok: false as const, reason: "Pick a job." };
  }

  const db = getDb();
  const [[source], [job]] = await Promise.all([
    db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1),
    db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1),
  ]);
  if (!source) return { ok: false as const, reason: "No such profile." };
  if (!job) return { ok: false as const, reason: "That job no longer exists." };

  const applied = await listApplicationsForCandidate(candidateId);
  if (applied.some((a) => a.jobId === jobId)) {
    return { ok: false as const, reason: `Already on ${job.title}.` };
  }

  const outcome = await addExistingToJob({ job, source });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/profiles");
  revalidatePath(`/candidates/${candidateId}`);

  if (outcome.status !== "created") return { ok: false as const, reason: outcome.reason };
  return {
    ok: true as const,
    message:
      outcome.matchScore == null
        ? `Added to ${job.title}, unscored. Shortlist them from the job page.`
        : `Added to ${job.title}. ATS score ${outcome.matchScore}, ${outcome.shortlisted ? "shortlisted" : "in the pool"}.`,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Delete a person: every application they made, the calls placed about each,
 * and the resume PDFs behind them.
 *
 * A profile is one person across jobs, matched the way the profiles list groups
 * them, so leaving one application behind would leave the person on the list.
 * Refused while a call is on the line, for the same reason as deleting a job.
 */
export async function deleteProfile(candidateId: string) {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false as const, reason: operator.reason };

  const ids = (await listApplicationsForCandidate(candidateId)).map((a) => a.id);
  if (ids.length === 0) return { ok: false as const, reason: "No such profile." };

  const db = getDb();
  const [live] = await db
    .select({ id: screeningCalls.id })
    .from(screeningCalls)
    .where(and(inArray(screeningCalls.candidateId, ids), eq(screeningCalls.status, "dialing")))
    .limit(1);
  if (live) return { ok: false as const, reason: "A call is still on the line. Try again when it ends." };

  // Screening calls go with the rows (on delete cascade).
  const deleted = await db
    .delete(candidates)
    .where(inArray(candidates.id, ids))
    .returning({ jobId: candidates.jobId, key: candidates.resumeKey });
  await deleteResumes(deleted.flatMap((d) => (d.key ? [d.key] : [])));

  for (const jobId of new Set(deleted.map((d) => d.jobId))) revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/calls");
  revalidatePath("/profiles");
  redirect("/profiles");
}
