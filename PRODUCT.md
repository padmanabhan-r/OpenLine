# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a hackathon judge watching a ~3-minute demo of OpenLine for the
*CALL-E: Your Code Is Calling* hackathon. Every product decision optimizes for
that judge understanding the product quickly.

Secondary: a recruiter working a shortlist — the workflow the demo dramatizes.
The recruiter uploads resumes, reviews generated screening scripts, arms calls
one candidate at a time, and reads transcripts and structured results afterward.

## Product Purpose

OpenLine is a recruiting console that phones shortlisted candidates with an AI
screener built on CALL-E, then hands a human the transcript, the structured
result, and a confidence score. It exists to remove the manual phone-screening
grind from a recruiter's day. Success, in this build's context, is a judge
grasping the product and its craft inside three minutes.

## Positioning

**OpenLine automates the manual calling part of recruiting.** The first phone
screen is repetitive human labor — dialing, asking the same questions, taking
notes — and OpenLine turns it into a reviewed, structured pipeline step.

Explicitly *not* the positioning (confirmed by the maintainer, 2026-08-16):
neither "safety is the product" nor "call the whole shortlist" is the claim.
The safety model and shortlist throughput are supporting facts, not the pitch.

## Operating Context

- Hackathon submission: a PR to `CALLE-AI/awesome-phone-call-agents` plus a
  ~3-minute demo video. The demo video is recorded and published, which is why
  phone numbers are masked everywhere in the UI.
- Calls are live whenever `CALLE_API_KEY` is set; they cost real money and
  reach real people. The per-candidate confirm button is the only gate.
- The recruiter's ATS does shortlisting upstream; OpenLine displays the
  shortlist reason and never rejects anyone — uncertain calls route to a human
  via `needsHuman`.

## Capabilities and Constraints

- Pipeline: resume PDF → R2 → parse+score (OpenAI) → candidate row →
  script generation → guard → human-editable script → CALL-E dial →
  transcript + structured result → human review.
- CALL-E constraints that shape the product: no endpoint to list calls (every
  call id is persisted before dialing), no mid-call tool calling (the job fact
  sheet is inlined into the task text; anything absent defers to a human),
  unsigned webhooks (always re-fetch through the authenticated API).
- The safety model is load-bearing and must not be softened for demos: AI
  disclosure and consent in `assembleTask()`, the guard run three times,
  `lib/calle/port.ts` as the only door to the SDK, phone numbers refused
  rather than guessed.
- Hackathon build mode: ship what demos well, no gold-plating; the safety
  model is the one exception to speed trade-offs.

## Brand Commitments

- Name: **OpenLine**. Built visibly *on* CALL-E — the design language is
  deliberately CALL-E-native (butter-yellow ground, aqua accent, black pills)
  so the build reads as native to their platform. `PoweredByCalle` is an
  existing component.
- The incumbent visual system is recorded in DESIGN.md and `app/globals.css`;
  it is confirmed design authority, not a placeholder.
- Red means danger only; one aqua accent per view; phone numbers always masked.

## Evidence on Hand

- A live-call demo: a real recorded call to the maintainer's phone
  (`OPENLINE_DEMO_PHONE`), and the ~3-minute demo video.
- Real CALL-E transcripts and structured results from test runs exist and can
  be shown.
- Seeded fixtures: one demo job and 50 applicants (20 shortlisted) in `data/`
  — illustrative, not real candidates. Demo films live in `docs/story/`.
- No real customers, testimonials, or usage metrics exist; future work must
  not fabricate any.

## Product Principles

1. **Automate the drudgework, keep the judgment.** Machines dial and ask;
   humans read, edit, and decide. No code path rejects a candidate.
2. **Legible in three minutes.** A judge must grasp any surface at a glance;
   prefer the boring, visible solution over the clever one.
3. **Live means live.** Whether a screen can dial a real person and spend real
   money must never be ambiguous.
4. **Show real artifacts.** Transcripts, structured results, and guard
   findings are the product's proof — surface them rather than summarizing
   them away.
5. **Half-finished says so.** State it in the UI rather than faking it.
