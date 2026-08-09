/**
 * Seed a demo job and candidate roster.
 *
 * Every phone number here is a documentation-reserved placeholder, not a real
 * line. Two rows are deliberately malformed so the queue shows what happens
 * when a résumé number cannot be resolved — that path is as important to see as
 * the happy one.
 *
 *   pnpm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env" });

import { getDb } from "../lib/db";
import { candidates, jobs, screeningCalls } from "../lib/db/schema";
import { normalizePhone } from "../lib/phone/normalize";

const ROSTER = [
  {
    name: "Priya Raman",
    rawPhone: "+91 98765 43210",
    email: "priya.raman@example.com",
    summary:
      "6 years backend. Owned the payments ledger and settlement reconciliation at a Series B fintech. Go and TypeScript, Postgres, event-driven services.",
  },
  {
    name: "Arjun Mehta",
    rawPhone: "09876543211",
    email: "arjun.mehta@example.com",
    summary:
      "8 years, currently staff engineer. Led a monolith-to-services migration and owns their internal API gateway. Strong on observability.",
  },
  {
    name: "Sana Qureshi",
    rawPhone: "+91-9876543212",
    email: "sana.qureshi@example.com",
    summary:
      "4 years. Built the refunds and chargeback pipeline at a payments processor. Python and TypeScript, heavy Postgres.",
  },
  {
    name: "Daniel Okafor",
    rawPhone: "+1 415 555 0132",
    email: "daniel.okafor@example.com",
    summary:
      "9 years across infrastructure and platform. Ran the on-call rotation for a payments API handling 4k rps.",
  },
  {
    name: "Meera Iyer",
    rawPhone: "9876543213",
    email: "meera.iyer@example.com",
    summary:
      "5 years. Payments integrations — UPI, cards, and wallet rails. Wrote the reconciliation service still in production.",
  },
  {
    // Note: the UK's reserved drama range (+44 7700 900xxx) is deliberately
    // unassigned, so libphonenumber correctly reports it invalid. The US
    // 555-01xx fiction range validates, so we use that for overseas applicants.
    name: "Tom Whitfield",
    rawPhone: "+1 415 555 0148",
    email: "tom.whitfield@example.com",
    summary:
      "7 years, backend and data. Built ledger tooling and a double-entry accounting service from scratch.",
  },
  // These two cannot be dialled. The queue must say so rather than skip them.
  {
    name: "Rahul Nair",
    rawPhone: "phone on request",
    email: "rahul.nair@example.com",
    summary: "6 years backend, payments and fraud tooling.",
  },
  {
    name: "Ananya Bose",
    rawPhone: "12345",
    email: "ananya.bose@example.com",
    summary: "5 years. Card issuing platform, Kotlin and TypeScript.",
  },
];

async function main() {
  const db = getDb();

  console.log("Clearing existing demo data…");
  await db.delete(screeningCalls);
  await db.delete(candidates);
  await db.delete(jobs);

  const [job] = await db
    .insert(jobs)
    .values({
      title: "Senior Backend Engineer",
      companyName: "Northwind Payments",
      recruiterName: "Sam Oyelaran",
      defaultRegion: "IN",
      description: `We are hiring a Senior Backend Engineer to work on the payments ledger.

You will own settlement reconciliation end to end: the service that matches what we think happened against what the banks say happened, and explains the difference. It is the system everything else trusts.

What we look for:
- Substantial backend experience in a typed language (Go, TypeScript, Java, Kotlin).
- Direct experience with payments, ledgers, reconciliation, or another domain where correctness is not negotiable.
- Comfort with Postgres beyond ORM basics — you have reasoned about isolation levels.
- Experience owning a service in production, including being on call for it.

The team is eight engineers. You would be the fourth on the ledger squad.`,
      factSheet: [
        { label: "Salary band", value: "₹45–60 lakh per annum, depending on experience" },
        { label: "Location policy", value: "Hybrid — two days a week in the Bangalore office" },
        { label: "Team size", value: "Eight engineers; four on the ledger squad" },
        { label: "Interview process", value: "This screening call, then a technical conversation, then a system design session with the team. Three stages total." },
        { label: "Timeline", value: "Aiming to make a decision within three weeks of the screening call" },
        { label: "Reports to", value: "Head of Engineering" },
      ],
    })
    .returning();

  console.log(`Created job: ${job.title} at ${job.companyName}`);

  const rows = ROSTER.map((entry) => {
    const normalized = normalizePhone(entry.rawPhone, "IN");
    return {
      jobId: job.id,
      name: entry.name,
      rawPhone: entry.rawPhone,
      phoneE164: normalized.ok ? normalized.e164 : null,
      phoneRejection: normalized.ok ? null : normalized.reason,
      email: entry.email,
      summary: entry.summary,
    };
  });

  await db.insert(candidates).values(rows);

  const callable = rows.filter((r) => r.phoneE164).length;
  console.log(
    `Created ${rows.length} candidates — ${callable} callable, ${rows.length - callable} needing a human to fix the number.`,
  );
  console.log("\nSeed complete. Run ./start.sh and open http://localhost:3000");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
