import { APPLICANTS } from "@/data/applicants";
import {
  COMPANY_NAME,
  DEFAULT_REGION,
  JOB_DESCRIPTION,
  JOB_FACT_SHEET,
  JOB_TITLE,
  RECRUITER_NAME,
} from "@/data/job";
import { summarizeForScript } from "@/lib/candidates/profile";
import { getDb } from "@/lib/db";
import { candidates, jobs, screeningCalls } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone/normalize";

/**
 * Seed the demo job and its applicant pool.
 *
 * Fifty people applied for the Senior AI Engineer role; twenty are on the
 * recruiter's shortlist and are the ones OpenLine will call. The thirty who
 * were not shortlisted are seeded too, each with the recruiter's reason, so the
 * app can show what was filtered out rather than only what survived.
 *
 * Every phone number is a documentation-reserved placeholder, not a real line.
 * Two shortlisted rows are deliberately malformed so the queue shows what
 * happens when a résumé number cannot be resolved.
 *
 * Nobody real is on this roster, and there is no switch that puts anyone real
 * on it. A real number reaches OpenLine only when someone types it into Try a
 * call, which saves nothing, or uploads a resume that carries it.
 */

export interface SeedSummary {
  applicants: number;
  shortlisted: number;
  callable: number;
}

export async function seedDemo(): Promise<SeedSummary> {
  const db = getDb();

  await db.delete(screeningCalls);
  await db.delete(candidates);
  await db.delete(jobs);

  const [job] = await db
    .insert(jobs)
    .values({
      title: JOB_TITLE,
      companyName: COMPANY_NAME,
      recruiterName: RECRUITER_NAME,
      defaultRegion: DEFAULT_REGION,
      description: JOB_DESCRIPTION,
      factSheet: JOB_FACT_SHEET,
    })
    .returning();

  const rows = APPLICANTS.map((entry) => {
    const normalized = normalizePhone(entry.rawPhone, DEFAULT_REGION);
    return {
      jobId: job.id,
      name: entry.profile.anonymizedName,
      rawPhone: entry.rawPhone,
      phoneE164: normalized.ok ? normalized.e164 : null,
      phoneRejection: normalized.ok ? null : normalized.reason,
      email: entry.email,
      summary: summarizeForScript(entry),
      profile: entry,
      // The seed is the ATS's decision; a human moving anyone is recorded as
      // "human" the moment they touch the control.
      stage: entry.screening.shortlisted
        ? ("shortlisted" as const)
        : ("applied" as const),
      shortlistedBy: entry.screening.shortlisted ? ("ats" as const) : null,
    };
  });

  await db.insert(candidates).values(rows);

  const shortlisted = rows.filter((r) => r.stage === "shortlisted");
  return {
    applicants: rows.length,
    shortlisted: shortlisted.length,
    callable: shortlisted.filter((r) => r.phoneE164).length,
  };
}
