"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { previewCandidate } from "@/lib/screening/preview";
import { finishCall, startCall, startNewAttempt } from "@/lib/screening/dispatch";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates } from "@/lib/db/schema";

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
 * Flip a candidate on or off the shortlist.
 *
 * The override is the point of showing the ATS score at all: a score nobody
 * can argue with is a decision nobody made.
 */
export async function toggleShortlist(jobId: string, candidateId: string) {
  const db = getDb();

  const [candidate] = await db
    .select({ shortlisted: candidates.shortlisted })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return { ok: false as const, reason: "No such candidate." };

  await db
    .update(candidates)
    .set({ shortlisted: !candidate.shortlisted })
    .where(eq(candidates.id, candidateId));

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/profiles");
  return { ok: true as const, shortlisted: !candidate.shortlisted };
}
