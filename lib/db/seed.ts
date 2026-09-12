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
 * One candidate can be swapped for a real person for the live demo: the
 * maintainer, whose number arrives via OPENLINE_DEMO_PHONE and is never
 * committed. With no demo phone, that row keeps its fictional identity and
 * the whole roster is inert — which is what the fake-mode judge instance
 * wants, and what a reset from inside the app always does.
 */

/** The seeded identity the demo phone and name replace. */
const DEMO_CANDIDATE_ID = "CAND_0000001";

export interface SeedOptions {
  demoPhone?: string;
  demoName?: string;
}

export interface SeedSummary {
  applicants: number;
  shortlisted: number;
  callable: number;
  /** The name on the one row that carries a real number, if any. */
  demoName: string | null;
}

export async function seedDemo(options: SeedOptions = {}): Promise<SeedSummary> {
  const db = getDb();
  const demoPhone = options.demoPhone?.trim() || undefined;
  const demoName = options.demoName?.trim() || undefined;

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

  let realRowName: string | null = null;

  const rows = APPLICANTS.map((entry) => {
    const isDemo = entry.candidateId === DEMO_CANDIDATE_ID;
    const name = isDemo && demoName ? demoName : entry.profile.anonymizedName;
    const rawPhone = isDemo && demoPhone ? demoPhone : entry.rawPhone;
    if (isDemo && demoPhone) realRowName = name;
    const normalized = normalizePhone(rawPhone, DEFAULT_REGION);

    // The stored profile has to agree with the row, or the detail page would
    // introduce the demo candidate under a name nobody else on the call uses.
    const profile =
      isDemo && demoName
        ? { ...entry, profile: { ...entry.profile, anonymizedName: name } }
        : entry;

    return {
      jobId: job.id,
      name,
      rawPhone,
      phoneE164: normalized.ok ? normalized.e164 : null,
      phoneRejection: normalized.ok ? null : normalized.reason,
      email: entry.email,
      summary: summarizeForScript(profile),
      profile,
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
    demoName: realRowName,
  };
}
