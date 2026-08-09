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
 * called on camera. Everyone else is invented.
 *
 * The mock numbers are US fiction-reserved (555-01xx) even though this role is
 * based in India, and that is deliberate. India publishes no reserved range for
 * fiction, so any plausible-looking +91 mobile number may well belong to a real
 * subscriber — committing a handful of them to a public repository would be
 * handing out numbers for strangers to dial. 555-01xx is genuinely reserved and
 * can never connect. Numbers are masked in the UI regardless.
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
      "7 years across ML and platform engineering. Took a retrieval-augmented support assistant from prototype to production and owns it on call. Python and TypeScript, embeddings and vector search, LLM evaluation harnesses.",
  },
  {
    name: "Arjun Mehta",
    rawPhone: "+1 415 555 0114",
    email: "arjun.mehta@example.com",
    summary:
      "8 years, currently staff engineer. Built the model-serving platform their whole ML org deploys through, and led the migration from batch scoring to real-time inference. Strong on observability and latency.",
  },
  {
    name: "Sana Qureshi",
    rawPhone: "+1 415 555 0127",
    email: "sana.qureshi@example.com",
    summary:
      "4 years. Fine-tuned and shipped the transaction-classification models behind a payments processor's fraud queue. Python, PyTorch, heavy feature engineering.",
  },
  {
    name: "Daniel Okafor",
    rawPhone: "+1 415 555 0132",
    email: "daniel.okafor@example.com",
    summary:
      "9 years across infrastructure and ML platform. Ran GPU capacity and the training pipeline for a team of twenty researchers, and owns their experiment-tracking stack.",
  },
  {
    name: "Meera Iyer",
    rawPhone: "+1 415 555 0143",
    email: "meera.iyer@example.com",
    summary:
      "5 years. Built the LLM agent that drafts responses in a support tool used by 200 agents daily, including the eval suite that gates every prompt change.",
  },
  {
    name: "Tom Whitfield",
    rawPhone: "+1 415 555 0148",
    email: "tom.whitfield@example.com",
    summary:
      "7 years, data and ML engineering. Built the feature store and the offline-to-online consistency checks that keep training and serving from drifting apart.",
  },
  // These two cannot be dialled. The queue must say so rather than skip them.
  {
    name: "Rahul Nair",
    rawPhone: "phone on request",
    email: "rahul.nair@example.com",
    summary:
      "6 years. Applied ML for fraud and risk, plus the tooling that lets analysts label and audit model decisions.",
  },
  {
    name: "Ananya Bose",
    rawPhone: "12345",
    email: "ananya.bose@example.com",
    summary:
      "5 years. NLP and document extraction for a card-issuing platform. Python and Kotlin, transformer fine-tuning.",
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
      title: "Senior AI Engineer",
      companyName: "Northwind Payments",
      recruiterName: "Sam Oyelaran",
      defaultRegion: "IN",
      description: `We are hiring a Senior AI Engineer to build the models and agents behind our fraud review and customer support systems.

You will own an LLM-backed system end to end: the assistant that triages flagged transactions, explains its reasoning to a human reviewer, and gets measurably better every week. It is the system our review team trusts to tell them what to look at first.

What we look for:
- Substantial experience shipping ML or LLM systems to production, not only notebooks and prototypes.
- Evaluation discipline — you have built the harness that decides whether a prompt or model change is actually an improvement.
- Comfort across the stack: retrieval, fine-tuning, inference cost and latency, and the service that wraps it all.
- Experience owning a system in production, including being on call for it.

The team is eight engineers. You would be the fourth on the applied AI squad.`,
      factSheet: [
        { label: "Salary band", value: "₹55–75 lakh per annum, depending on experience" },
        { label: "Location policy", value: "Hybrid — two days a week in the Bangalore office" },
        { label: "Team size", value: "Eight engineers; four on the applied AI squad" },
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
