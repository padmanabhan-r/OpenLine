"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { previewCandidate } from "@/lib/screening/preview";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates, jobs } from "@/lib/db/schema";
import { isShortlisted, isStage } from "@/lib/candidates/stage";
import { isJobStatus } from "@/lib/jobs/status";

/** Build (or rebuild) the script for one candidate — the per-row path. */
export async function buildScriptFor(jobId: string, candidateId: string) {
  const outcome = await previewCandidate(jobId, candidateId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/calls");
  return outcome;
}

/** Start a call from the shortlist row. Same detached-finish shape as the call page. */
export async function callFromRow(jobId: string, screeningCallId: string) {
  const outcome = await startCall(screeningCallId);

  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    after(() => finishCall(screeningCallId, calleCallId));
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}

/** Call a candidate again: clone the finished call, then dial the clone. */
export async function callAgainFromRow(jobId: string, screeningCallId: string) {
  const attempt = await startNewAttempt(screeningCallId);
  if (!attempt.ok) return attempt;

  const outcome = await startCall(attempt.screeningCallId);
  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    const newId = attempt.screeningCallId;
    after(() => finishCall(newId, calleCallId));
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/calls");
  return outcome;
}

/**
 * Move a candidate to another stage of this job's pipeline.
 *
 * The override is the point of showing the ATS score at all: a score nobody can
 * argue with is a decision nobody made. Only a person calls this — nothing in
 * the calling pipeline moves anyone to an exit stage on its own.
 */
export async function setStage(
  jobId: string,
  candidateId: string,
  stage: string,
) {
  if (!isStage(stage)) return { ok: false as const, reason: "Unknown stage." };

  const db = getDb();
  const [candidate] = await db
    .select({ stage: candidates.stage })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { ok: false as const, reason: "No such candidate." };

  await db
    .update(candidates)
    .set({
      stage,
      // Only meaningful while they are on the shortlist; a human moving them
      // there is exactly the fact worth keeping.
      shortlistedBy: isShortlisted(stage) ? "human" : null,
    })
    .where(eq(candidates.id, candidateId));

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/profiles");
  return { ok: true as const, stage };
}

/**
 * Open, fill, or close a posting.
 *
 * Reopening demands a reason. "We reopened it" is not an answer to "what
 * happened to the person who accepted", and the next recruiter to look at this
 * job deserves the answer without having to ask anyone.
 */
export async function setJobStatus(
  jobId: string,
  status: string,
  reason: string,
) {
  if (!isJobStatus(status)) return { ok: false as const, reason: "Unknown status." };

  const trimmed = reason.trim();
  if (status === "open" && trimmed.length < 3) {
    return { ok: false as const, reason: "Give a reason for reopening this job." };
  }

  const db = getDb();
  await db
    .update(jobs)
    .set({
      status,
      statusReason: trimmed || null,
      statusChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { ok: true as const, status };
}
