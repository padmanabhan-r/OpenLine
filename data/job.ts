import type { FactSheetEntry } from "@/lib/script/build";

/**
 * The open role, written out properly.
 *
 * Two audiences read this text and they want different things. A model reads
 * it to generate screening questions, so vagueness here produces vague
 * questions — "tell me about your AI experience" instead of "you owned a
 * retrieval system in production; what did you do when the index went stale".
 * A candidate may hear parts of it read back to them on the call, so it also
 * has to be honest. Both are served by the same thing: naming the actual work.
 *
 * The fact sheet is separate and much shorter, because it carries a different
 * promise. CALL-E has no mid-call tool calling, so the agent can only answer a
 * candidate's questions from what is inlined into its task text. Everything in
 * the sheet is something we are willing to have said out loud, verbatim, to
 * anyone who asks. Anything absent is deferred to a human rather than guessed.
 */

export const JOB_TITLE = "Senior AI Engineer";
export const COMPANY_NAME = "Northwind Payments";
export const RECRUITER_NAME = "John Doe";
/** Applications arrive with Indian national-format numbers; this resolves them. */
export const DEFAULT_REGION = "IN";

export const JOB_DESCRIPTION = `Senior AI Engineer — Fraud & Support Intelligence
Northwind Payments · Bangalore (hybrid, two days a week in office) · Full-time · 5–9 years

ABOUT THE ROLE

Northwind processes card payments for about eleven thousand Indian merchants. Roughly forty thousand transactions a day get flagged by our rules engine and land in a queue that fourteen human reviewers work through. They are the bottleneck, and the queue is ordered badly, so reviewers spend most of their attention on transactions that turn out to be fine.

You would own the system that fixes that: an LLM-backed assistant that triages the flagged queue, explains in plain language why each transaction looks wrong, pulls the relevant merchant and cardholder history into one view, and gets measurably better every week. The same system answers the support team's questions about a disputed charge.

This is not a research role. It ships to fourteen people whose day gets better or worse depending on what you build, and you will hear about it either way.

WHAT YOU'D OWN

- The retrieval layer. Merchant history, prior disputes, chargeback records, and policy documents, indexed and served fast enough to sit inside a reviewer's workflow.
- The reasoning layer. Prompting, tool use, and where warranted fine-tuning, to produce an explanation a reviewer trusts and a decision they can override.
- The evaluation harness. This is the part we care most about. Before a prompt or model change ships, something has to say whether it is actually an improvement. Today that something is a spreadsheet and an argument. It should be a test suite with a labelled set behind it.
- The service around it. Latency budget, inference cost per review, fallbacks when a provider degrades, and the on-call pager when it breaks at two in the morning.

FIRST 90 DAYS

Weeks 1–4: learn the fraud domain properly — sit with reviewers, read a few hundred flagged transactions, and work out where the current ordering goes wrong. Ship one narrow improvement so you have been through the deploy path.
Weeks 5–9: replace the ranking of the review queue. Architecture is your call. We expect embeddings and hybrid retrieval to be involved; we do not expect you to justify a particular vendor.
Weeks 10–13: stand up the evaluation infrastructure — an offline labelled set, online A/B measurement, and a reviewer feedback loop that feeds both.

WHAT WE NEED

- Production experience shipping ML or LLM systems to real users. Not notebooks, not prototypes that were handed to another team to operationalise. Something you deployed and then had to keep running.
- Retrieval in production: embeddings, vector or hybrid search, and the operational side of it — index refresh, drift, quality regressions you caught before users did.
- Evaluation discipline. You have built the harness that decides whether a change is an improvement, and you can explain what it measured and what it missed.
- Strong Python. TypeScript is useful, since the reviewer-facing surface is ours too.
- Ownership in production, including being on call for something you built.

NICE TO HAVE

- Fine-tuning experience (LoRA/QLoRA/PEFT) and a clear view on when it beats prompting.
- Payments, fraud, risk, or another regulated domain where being wrong is expensive.
- Inference cost and latency optimisation at meaningful volume.
- Open-source work, talks, or writing — anything that shows how you think, not just that you can.

WHO THIS ISN'T FOR

- Pure research backgrounds with no production deployment. We have tried it twice; it worked for nobody.
- AI experience that begins and ends with the last twelve months of calling an LLM API through a framework, without earlier applied ML or IR work underneath it.
- Engineers who have moved fully into architecture or tech lead roles and have not written production code in eighteen months. This role writes code.
- Computer vision, speech, or robotics specialists without NLP or information-retrieval exposure. You would be re-learning fundamentals here, and we cannot afford to be your training ground on this particular hire.

TEAM AND LOGISTICS

Eight engineers total; you would be the fourth on the applied AI squad, reporting to the Head of Engineering. Hybrid, two days a week in the Bangalore office; we do not track which days. The band is $65,000–$90,000 a year depending on experience, and we can buy out up to 30 days of notice.

Three interview stages after this screening call: a technical conversation, a system design session with the team, and a conversation with the Head of Engineering. We aim to decide within three weeks.`;

export const JOB_FACT_SHEET: FactSheetEntry[] = [
  {
    label: "Salary band",
    value: "$65,000–$90,000 a year, depending on experience",
  },
  {
    label: "Location policy",
    value: "Hybrid — two days a week in the Bangalore office, days not tracked",
  },
  {
    label: "Team size",
    value: "Eight engineers; four on the applied AI squad",
  },
  {
    label: "What you'd own",
    value:
      "The LLM assistant that triages flagged transactions for the fraud review team — retrieval, evaluation, and the service around it",
  },
  {
    label: "Interview process",
    value:
      "This screening call, then a technical conversation, then a system design session with the team, then a conversation with the Head of Engineering",
  },
  {
    label: "Notice period",
    value: "We can buy out up to 30 days of notice",
  },
  {
    label: "Timeline",
    value: "Aiming to decide within three weeks of the screening call",
  },
  {
    label: "Reports to",
    value: "Head of Engineering",
  },
];
