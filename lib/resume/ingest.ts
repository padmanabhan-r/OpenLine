import OpenAI from "openai";
import { getDb } from "@/lib/db";
import { candidates, type Job } from "@/lib/db/schema";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "@/lib/phone/normalize";
import { summarizeForScript } from "@/lib/candidates/profile";
import { putResume, resumeKey } from "@/lib/storage/r2";
import { createResumeParser, shouldShortlist, toCandidateProfile } from "./parse";
import { cleanCandidateName } from "@/lib/screening/try";

/**
 * One uploaded PDF → one candidate row, whatever happens.
 *
 * The ordering is deliberate on a database with no transactions:
 * R2 first (an orphaned object is harmless; a row pointing at nothing is not),
 * then parse, then the row — last, so a crash anywhere earlier leaves no
 * half-candidate. Failures still insert a row, visibly failed,
 * because a resume that silently vanishes from a hiring pipeline is the worst
 * outcome this system can produce.
 */

export type IngestOutcome = { filename: string } & (
  | { status: "created"; candidateId: string; name: string; shortlisted: boolean; matchScore: number }
  | { status: "parse_failed"; candidateId: string; reason: string }
  | { status: "duplicate"; reason: string }
  | { status: "rejected"; reason: string }
);

async function insertFailedRow(
  job: Job,
  filename: string,
  key: string | null,
  reason: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(candidates)
    .values({
      jobId: job.id,
      name: filename,
      rawPhone: "",
      phoneE164: null,
      phoneRejection: "empty",
      source: "resume",
      resumeKey: key,
      parseStatus: "parse_failed",
      parseError: reason,
      stage: "applied" as const,
    })
    .returning({ id: candidates.id });
  return row.id;
}

export async function ingestResume(input: {
  job: Job;
  filename: string;
  bytes: Uint8Array;
}): Promise<IngestOutcome> {
  const { job, filename, bytes } = input;
  const db = getDb();

  // 1. Keep the original before doing anything clever with it.
  const key = resumeKey(job.id, filename);
  try {
    await putResume(key, bytes);
  } catch (error) {
    return {
      filename,
      status: "rejected",
      reason: `Could not store the file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 2. Model reads the PDF — pages, not extracted text, so a scanned resume
  //    works — then parses and scores, defensively coerced.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const reason = "OPENAI_API_KEY is not set, so resumes cannot be parsed.";
    const id = await insertFailedRow(job, filename, key, reason);
    return { filename, status: "parse_failed", candidateId: id, reason };
  }

  const parsed = await createResumeParser(new OpenAI({ apiKey })).parse({
    pdf: bytes,
    filename,
    jobTitle: job.title,
    jobDescription: job.description,
  });
  if (!parsed) {
    const reason = "The model could not produce a usable profile from this file.";
    const id = await insertFailedRow(job, filename, key, reason);
    return { filename, status: "parse_failed", candidateId: id, reason };
  }

  // The name is written into the task the agent reads, and the applicant wrote
  // the resume. A "name" that is really an instruction is refused here and
  // left for a person, never spoken.
  const cleanName = cleanCandidateName(parsed.name);
  if (!cleanName.ok) {
    const reason = "The name on this resume could not be used safely in a call script. A person needs to check it.";
    const id = await insertFailedRow(job, filename, key, reason);
    return { filename, status: "parse_failed", candidateId: id, reason };
  }

  // 3. The model's phone claim goes through the same gate as every import —
  //    normalized or refused, never guessed.
  // The job's region is stored as free text; libphonenumber narrows it. An
  // unrecognised value behaves like no region, which refuses rather than
  // guesses — the correct failure.
  const normalized = parsed.phone
    ? normalizePhone(
        parsed.phone,
        (job.defaultRegion ?? undefined) as CountryCode | undefined,
      )
    : null;

  const profile = toCandidateProfile(
    parsed,
    new Date().toISOString().slice(0, 10),
  );

  try {
    const [row] = await db
      .insert(candidates)
      .values({
        jobId: job.id,
        name: cleanName.name,
        rawPhone: parsed.phone ?? "",
        phoneE164: normalized?.ok ? normalized.e164 : null,
        phoneRejection: normalized
          ? normalized.ok
            ? null
            : normalized.reason
          : "empty",
        email: parsed.email,
        summary: summarizeForScript(profile),
        profile,
        stage: shouldShortlist(parsed.matchScore)
          ? ("shortlisted" as const)
          : ("applied" as const),
        shortlistedBy: shouldShortlist(parsed.matchScore) ? ("ats" as const) : null,
        source: "resume",
        resumeKey: key,
        parseStatus: "parsed",
      })
      .returning({ id: candidates.id });

    return {
      filename,
      status: "created",
      candidateId: row.id,
      name: cleanName.name,
      shortlisted: shouldShortlist(parsed.matchScore),
      matchScore: parsed.matchScore,
    };
  } catch (error) {
    // The (jobId, phoneE164) unique index: same person, second resume.
    // Drizzle wraps the Postgres error, so walk the cause chain — the
    // constraint name is usually one level down.
    if (mentionsPhoneUnique(error)) {
      return {
        filename,
        status: "duplicate",
        reason: `A candidate with this phone number already exists on this job.`,
      };
    }
    throw error;
  }
}

function mentionsPhoneUnique(error: unknown, depth = 0): boolean {
  if (depth > 4 || !(error instanceof Error)) return false;
  if (error.message.includes("candidates_job_phone_unique")) return true;
  return mentionsPhoneUnique((error as { cause?: unknown }).cause, depth + 1);
}
