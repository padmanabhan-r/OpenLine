# How OpenLine works

*The diagram version lives at [`docs/architecture.html`](docs/architecture.html) — open it in a browser.*

OpenLine is a recruiting console that phones every shortlisted candidate with an AI
screening agent built on **CALL-E**, then hands a human the transcript, the answers,
and the decision. Built for the *CALL-E: Your Code Is Calling* hackathon.

One idea organizes everything: **the machine does the repetitive part; every
judgement stays with a person.**

## The flow

**1. A recruiter creates a job and uploads resumes.**
The job carries a description (which drives resume scoring) and a short
*fact sheet* — the only things the agent is allowed to state on a call, because
CALL-E can't look anything up mid-conversation. Uploaded PDFs are kept in storage
so any parse can be checked against what the candidate actually wrote.

**2. AI reads and scores each resume.**
One OpenAI call turns the PDF into a profile and a 0–100 fit score against the job
description, with a note in a recruiter's voice explaining the score. Phone numbers
are cleaned up or refused — never guessed.

**3. The shortlist forms.**
High scores go on automatically; the recruiter can add or remove anyone. The score
is shown precisely so it can be argued with. People left off stay visible with the
reason on the record.

**4. The recruiter approves each script.**
Every candidate gets tailored questions — fit questions drawn from *their*
background against *this* job, never a technical quiz. The recruiter reads the
exact words before they're spoken, and can edit the questions. The parts that
carry the ethics — the agent introducing itself as an AI, asking if now is a good
time, stopping if the answer is no — are fixed and can't be edited out.

**5. CALL-E makes the calls.** All of them, in parallel. The agent asks the
approved questions, answers the candidate's own questions from the fact sheet
(and says "I don't have that detail" for anything else), and never hints at a
decision. If the candidate asks for a human, it agrees and ends the call.

**6. Answers come back, a person decides.**
Notice period, availability, interest, and every answer paired with the
candidate's verbatim words from the transcript. Anything unclear — low confidence,
an unanswered question, a request for a human — is flagged for the recruiter with
reasons. **No machine ever rejects a candidate.** Candidates are told they'll get
a copy of the conversation and can correct anything misheard.

## The one check that runs the whole way through

Every question is screened against a list of things that can't lawfully be asked
in hiring — age, religion, marital status, current salary, and the rest. The check
runs three times: when a script is written, again whenever a human edits it, and
once more at the moment of dialing. A script that fails is blocked with the reason
shown, never quietly skipped — and after every call, the same check runs over what
the agent *actually said* on the line.

## What runs where

| Piece | Technology |
|---|---|
| Console & pipeline | Next.js |
| Data | Neon Postgres |
| Resume originals | Cloudflare R2 |
| Resume parsing and scoring | OpenAI |
| The phone call itself | CALL-E |

## What it will not do

Reject a candidate or imply rejection · make or hint at an offer · answer beyond
the fact sheet · ask an unapproved question · record an answer it did not hear ·
keep talking after someone asks for a human.
