/**
 * Seed the demo job and its applicant pool from the command line.
 *
 *   pnpm run db:seed
 *
 * The logic lives in lib/db/seed.ts so a fake-mode deployment can reset itself
 * from inside the app. Every row is fiction.
 *
 * The mock numbers are US fiction-reserved (555-01xx) even though this role is
 * based in India, and that is deliberate. India publishes no reserved range for
 * fiction, so any plausible-looking +91 mobile number may well belong to a real
 * subscriber. 555-01xx is genuinely reserved and can never connect.
 */
import { config } from "dotenv";
config({ path: ".env" });

import { seedDemo } from "../lib/db/seed";

async function main() {
  console.log("Clearing existing demo data…");
  const summary = await seedDemo();

  console.log(
    `Created ${summary.applicants} applicants — ${summary.shortlisted} shortlisted, ` +
      `${summary.applicants - summary.shortlisted} not.`,
  );
  console.log(
    `Of the shortlist, ${summary.callable} are callable and ` +
      `${summary.shortlisted - summary.callable} need a human to fix the number.`,
  );
  console.log("\nEvery number is fiction-reserved; none can connect.");
  console.log("To hear a real call, open Try a call in the console and enter your own number.");
  console.log("\nSeed complete. Run ./start.sh and open http://localhost:3000");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
