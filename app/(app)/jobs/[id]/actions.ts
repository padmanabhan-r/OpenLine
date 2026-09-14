"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { previewCandidate } from "@/lib/screening/preview";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates, jobs, screeningCalls } from "@/lib/db/schema";
import { isShortlisted, isStage } from "@/lib/candidates/stage";
import { isJobStatus } from "@/lib/jobs/status";
import type { DialIntent } from "@/lib/screening/gate";
import { operatorStatus } from "@/lib/operator";

/**
 * Prepare the script for one candidate — the first click of Call.
 *
 * Returns the row it prepared so the confirm can bind to its id and version;
 * the server-side gate checks both again at dial time.
 */
export async function buildScriptFor(jobId: string, candidateId: string) {
  const operator = await operatorStatus();
  if (!operator.ok) {
    return { candidateId, name: "", status: "skipped" as const, detail: operator.reason };
  }
  const outcome = await previewCandidate(jobId, candidateId);
  const db = getDb();
  const [row] = await db
    .select({ id: screeningCalls.id, scriptVersion: screeningCalls.scriptVersion })
    .from(screeningCalls)
    .where(and(eq(screeningCalls.jobId, jobId), eq(screeningCalls.candidateId, candidateId)))
    .orderBy(desc(screeningCalls.createdAt))
    .limit(1);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/calls");
  return { ...outcome, screeningCallId: row?.id ?? null, scriptVersion: row?.scriptVersion ?? null };
}

/** Start a call from the shortlist row. Same detached-finish shape as the call page. */
export async function callFromRow(
  jobId: string,
  screeningCallId: string,
  intent: DialIntent,
) {
  const outcome = await startCall(screeningCallId, intent);

  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    after(() => finishCall(screeningCallId, calleCallId));
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath(`/candidates/${intent.candidateId}`);
  revalidatePath("/calls");
  return outcome;
}

/**
 * Call a candidate again: a fresh attempt recomposed from the current
 * template, dialed immediately — unless the script changed since the last
 * call, in which case the new row waits on the queue for review.
 */
export async function callAgainFromRow(jobId: string, screeningCallId: string) {
  const attempt = await startNewAttempt(screeningCallId);
  if (!attempt.ok) {
    // A fresh row may have been created for review — make it visible.
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/calls");
    return attempt;
  }

  const outcome = await startCall(attempt.screeningCallId, attempt.intent);
  if (outcome.ok) {
    const calleCallId = outcome.calleCallId;
    const newId = attempt.screeningCallId;
    after(() => finishCall(newId, calleCallId));
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/candidates/${attempt.intent.candidateId}`);
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
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false as const, reason: operator.reason };

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
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false as const, reason: operator.reason };

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
