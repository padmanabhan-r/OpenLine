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

/**
 * The demo shortlist.
 *
 * Exactly one entry is a real person — the maintainer, who consented to be
 * called on camera. Everyone else is invented, and their numbers are US
 * fiction-reserved (555-01xx): they pass E.164 validation but can never
 * connect, so seeding this repo cannot dial anybody.
 *
 * The real line comes from OPENLINE_DEMO_PHONE and is never committed to
 * source. Without it, the demo candidate falls back to a fiction number too and
 * the whole roster is inert.
 *
 * Two entries are deliberately unusable, because a shortlist worked by hand is
 * exactly where people fall off the end of the list.
 */
const DEMO_PHONE = process.env.OPENLINE_DEMO_PHONE?.trim();
const DEMO_NAME = process.env.OPENLINE_DEMO_NAME?.trim() || "Padmanabhan Rajendrakumar";

const ROSTER = [
  {
    // The only real person on this list. Rings OPENLINE_DEMO_PHONE when set.
    name: DEMO_NAME,
    rawPhone: DEMO_PHONE || "+1 415 555 0101",
    email: "demo@example.com",
    summary:
      "7 years backend and platform. Built the settlement reconciliation service at a payments company and owns it in production. TypeScript and Python, Postgres, event-driven services.",
  },
  {
    name: "Arjun Mehta",
    rawPhone: "+1 415 555 0114",
    email: "arjun.mehta@example.com",
    summary:
      "8 years, currently staff engineer. Led a monolith-to-services migration and owns their internal API gateway. Strong on observability.",
  },
  {
    name: "Sana Qureshi",
    rawPhone: "+1 415 555 0127",
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
    rawPhone: "+1 415 555 0143",
    email: "meera.iyer@example.com",
    summary:
      "5 years. Payments integrations — cards, wallets, and bank rails. Wrote the reconciliation service still in production.",
  },
  {
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
      defaultRegion: "US",
      description: `We are hiring a Senior Backend Engineer to work on the payments ledger.

You will own settlement reconciliation end to end: the service that matches what we think happened against what the banks say happened, and explains the difference. It is the system everything else trusts.

What we look for:
- Substantial backend experience in a typed language (Go, TypeScript, Java, Kotlin).
- Direct experience with payments, ledgers, reconciliation, or another domain where correctness is not negotiable.
- Comfort with Postgres beyond ORM basics — you have reasoned about isolation levels.
- Experience owning a service in production, including being on call for it.

The team is eight engineers. You would be the fourth on the ledger squad.`,
      factSheet: [
        { label: "Salary band", value: "$150,000–$185,000, depending on experience" },
        { label: "Location policy", value: "Hybrid — two days a week in the San Francisco office" },
        { label: "Team size", value: "Eight engineers; four on the ledger squad" },
        { label: "Interview process", value: "This screening call, then a technical conversation, then a system design session with the team. Three stages total." },
        { label: "Timeline", value: "Aiming to make a decision within three weeks of the screening call" },
        { label: "Reports to", value: "Head of Engineering" },
      ],
    })
    .returning();

  console.log(`Created job: ${job.title} at ${job.companyName}`);

  const rows = ROSTER.map((entry) => {
    const normalized = normalizePhone(entry.rawPhone, "US");
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
