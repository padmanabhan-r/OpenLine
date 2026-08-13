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
 * happens when a résumé number cannot be resolved — that path is as important
 * to see as the happy one.
 *
 *   pnpm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env" });

import { APPLICANTS } from "../data/applicants";
import {
  COMPANY_NAME,
  DEFAULT_REGION,
  JOB_DESCRIPTION,
  JOB_FACT_SHEET,
  JOB_TITLE,
  RECRUITER_NAME,
} from "../data/job";
import { summarizeForScript } from "../lib/candidates/profile";
import { getDb } from "../lib/db";
import { candidates, jobs, screeningCalls } from "../lib/db/schema";
import { normalizePhone } from "../lib/phone/normalize";

/**
 * The one real person on the list.
 *
 * The maintainer consented to be called on camera. Their number comes from the
 * environment and is never committed. Without it, that candidate falls back to
 * a fiction number like everyone else and the whole roster is inert.
 *
 * The mock numbers are US fiction-reserved (555-01xx) even though this role is
 * based in India, and that is deliberate. India publishes no reserved range for
 * fiction, so any plausible-looking +91 mobile number may well belong to a real
 * subscriber — committing a hundred of them to a public repository would be
 * handing out numbers for strangers to dial. 555-01xx is genuinely reserved and
 * can never connect. Numbers are masked in the UI regardless.
 */
const DEMO_PHONE = process.env.OPENLINE_DEMO_PHONE?.trim();
const DEMO_NAME =
  process.env.OPENLINE_DEMO_NAME?.trim() || "Padmanabhan Rajendrakumar";
/** The seeded identity the demo phone and name replace. */
const DEMO_CANDIDATE_ID = "CAND_0000001";

async function main() {
  const db = getDb();

  console.log("Clearing existing demo data…");
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

  console.log(`Created job: ${job.title} at ${job.companyName}`);

  const rows = APPLICANTS.map((entry) => {
    const isDemo = entry.candidateId === DEMO_CANDIDATE_ID;
    const name = isDemo ? DEMO_NAME : entry.profile.anonymizedName;
    const rawPhone = isDemo ? DEMO_PHONE || entry.rawPhone : entry.rawPhone;
    const normalized = normalizePhone(rawPhone, DEFAULT_REGION);

    // The stored profile has to agree with the row, or the detail page would
    // introduce the demo candidate under a name nobody else on the call uses.
    const profile = isDemo
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
  const callable = shortlisted.filter((r) => r.phoneE164).length;

  console.log(
    `Created ${rows.length} applicants — ${shortlisted.length} shortlisted, ` +
      `${rows.length - shortlisted.length} not.`,
  );
  console.log(
    `Of the shortlist, ${callable} are callable and ` +
      `${shortlisted.length - callable} need a human to fix the number.`,
  );

  if (DEMO_PHONE) {
    console.log(
      `\n${DEMO_NAME} is set to your demo number — the one candidate who will actually ring.`,
    );
    console.log("Everyone else is fictional and cannot connect.");
  } else {
    console.log(
      "\nOPENLINE_DEMO_PHONE is not set, so every number is fiction-reserved and none can connect.",
    );
  }
  console.log("\nSeed complete. Run ./start.sh and open http://localhost:3000");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
