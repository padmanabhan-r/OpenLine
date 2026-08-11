# How OpenLine works

*A plain-English tour. The diagram version lives at [`docs/architecture.html`](docs/architecture.html) — open it in a browser.*

OpenLine is a recruiting console that phones every shortlisted candidate with an AI
screening agent built on **CALL-E**, then hands a human the transcript, the structured
answers, and the decision. It was built for the *CALL-E: Your Code Is Calling*
hackathon.

The design has one organizing idea: **the machine does the repetitive part, and every
judgement stays with a person.** Everything below is that idea applied four times.

## 1. A job, then a pile of resumes

A recruiter creates a job — title, description, and a *fact sheet*: the short list of
things the agent is allowed to say out loud (salary band, location policy, interview
process). The fact sheet exists because CALL-E cannot look anything up mid-call;
whatever the agent might need to answer has to be written down before dialing, and
anything not written down is deferred to a human instead of guessed.

Resumes arrive as PDFs. Each one takes the same path:

1. The original file goes to **Cloudflare R2** first. The parsed profile is a lossy
   reading of a document someone wrote about themselves — the original is kept so any
   parse can be checked against what the candidate actually said.
2. The text is extracted and handed to **OpenAI** with the job description. One call
   returns a structured profile *and* a fit score (0–100) with a note in a
   recruiter's voice explaining it.
3. The phone number the model found is **normalized or refused, never guessed** — a
   guessed country code dials a stranger.
4. A score of 70 or above lands the candidate on the shortlist automatically. The
   recruiter can flip anyone either way — the score is shown precisely so it can be
   argued with.

A resume that fails to parse still becomes a visible row that says so. A file that
silently vanishes from a hiring pipeline is the worst outcome this system can produce.

## 2. A script per candidate, read by a human

For each shortlisted candidate, OpenAI drafts screening questions by reading the
candidate's background against the job description — fit questions, never a technical
quiz. The questions are stitched into a fixed frame that carries the ethics:

- the agent **says it is an AI** and asks whether now is a good time,
- if the candidate declines, it thanks them and ends the call,
- it answers only from the fact sheet, never guesses,
- it cannot reject, decide, or hint at an outcome,
- it hands over to a human the moment one is asked for.

A recruiter can edit the questions — and *only* the questions. The frame is
reassembled around every edit, so the consent gate cannot be edited out even on
purpose. Every save re-runs the **guard**: a checker for questions that cannot
lawfully be asked in hiring (age, religion, marital status, current salary, and so
on). The guard runs three times per call — on each question, on the assembled
script, and again at the moment of dialing — because the model is never trusted to
have followed its instructions.

## 3. The call

Dialing goes through a single door (`lib/calle/port.ts`). That door refuses to open
unless the script is guard-clean, the number is real, live calling is explicitly
switched on, *and* the number is on an allowlist. A fresh clone of this repository
cannot place a phone call — dry run is the default, and an empty allowlist means
nobody, never everybody.

When a call starts, the row is written to the database *before* dialing and CALL-E's
call id is stored the moment it exists — CALL-E has no endpoint to list calls, so an
unpersisted id would be a paid conversation lost forever. The recruiter's button
returns in a second ("Call initiated"); the wait for the conversation to finish runs
detached, and the page refreshes itself. If the process dies mid-call, a reconciler
notices the stale row and re-fetches the result by the stored id.

## 4. What comes back

CALL-E returns a transcript and a structured result: notice period, availability,
interest level, each answer paired with the candidate's verbatim words as evidence.
The guard runs once more — over what the agent *actually said* on the line, not just
what it was told to say.

Then a routing decision, which is deliberately not a rejection decision: anything
uncertain — low confidence, a question the fact sheet couldn't answer, a request for
a human, a wrong-person answer — sets `needs_human` and lands in the recruiter's
queue with reasons. **There is no code path in OpenLine that rejects a candidate.**
The candidate is told they'll receive a copy of what was discussed and can correct
anything misheard.

## What runs where

| Piece | Technology |
|---|---|
| Console & pipeline | Next.js 16 (App Router, server actions) |
| Data | Neon Postgres via Drizzle — jobs, candidates, screening calls |
| Resume originals | Cloudflare R2 |
| Parsing, scoring, question drafting | OpenAI (`OPENAI_MODEL`, default gpt-4o-mini) |
| The phone call itself | CALL-E — dialing, conversation, transcript, structured result |
| Safety | `lib/script/guard.ts` (three-pass), `lib/calle/port.ts` (the only door), allowlist + dry-run defaults |

## What it will not do

Reject a candidate or imply rejection · make or hint at an offer · answer beyond the
fact sheet · ask an unapproved question · record an answer it did not hear · keep
talking after someone asks for a human · dial anyone not explicitly allowlisted.
