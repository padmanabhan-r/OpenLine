/**
 * Seed the demo job and its applicant pool from the command line.
 *
 *   pnpm run db:seed
 *
 * The logic lives in lib/db/seed.ts so the fake-mode judge instance can reset
 * itself from inside the app. This wrapper adds the one thing only a local run
 * should do: swap the first shortlisted candidate for the maintainer's real
 * number, read from OPENLINE_DEMO_PHONE and never committed.
 *
 * The mock numbers are US fiction-reserved (555-01xx) even though this role is
 * based in India, and that is deliberate. India publishes no reserved range for
 * fiction, so any plausible-looking +91 mobile number may well belong to a real
 * subscriber. 555-01xx is genuinely reserved and can never connect.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { seedDemo } from "../lib/db/seed";

const DEMO_PHONE = process.env.OPENLINE_DEMO_PHONE?.trim();
const DEMO_NAME =
  process.env.OPENLINE_DEMO_NAME?.trim() || "Padmanabhan Rajendrakumar";

async function main() {
  console.log("Clearing existing demo data…");
  const summary = await seedDemo(
    DEMO_PHONE ? { demoPhone: DEMO_PHONE, demoName: DEMO_NAME } : {},
  );

  console.log(
    `Created ${summary.applicants} applicants — ${summary.shortlisted} shortlisted, ` +
      `${summary.applicants - summary.shortlisted} not.`,
  );
  console.log(
    `Of the shortlist, ${summary.callable} are callable and ` +
      `${summary.shortlisted - summary.callable} need a human to fix the number.`,
  );

  if (summary.demoName) {
    console.log(
      `\n${summary.demoName} is set to your demo number — the one candidate who will actually ring.`,
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
