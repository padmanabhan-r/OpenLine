<div align="center">

# OpenLine

**Screen your whole shortlist by phone, without dialing.**

A recruiting console that phones every shortlisted candidate with an AI
screener built on [CALL-E](https://www.heycall-e.com/), then hands a human the
transcript, the structured result, and a confidence score.

[**Live demo**](https://openline-calle.vercel.app/) ·
[Architecture](ARCHITECTURE.md) · [Design system](DESIGN.md)

Built for the **CALL-E: Your Code Is Calling** hackathon.

</div>

---

## The problem

An ATS hands a recruiter twenty names. Calling them is a day of work, so the
first five get a real conversation and the rest get an email, or nothing. The
shortlist is not the bottleneck — the phone is.

OpenLine calls all of them. Each candidate gets questions written from their own
profile against the job description, a recruiter reads the exact words before
anything dials, and every answer comes back as a structured field paired with
the candidate's own words.

**The recruiter still decides. Only the dialing moves.**

## What it does

- **Resume in, profile out.** Upload PDFs; each is stored in R2, parsed, and
  scored against the job description. Scores at or above the threshold
  auto-shortlist, and a human can overrule either way.
- **A script per person.** Questions are generated from where that candidate's
  background and the posting actually meet — not a template, not a technical
  test.
- **Readable and editable before it dials.** The exact spoken text is persisted
  as a record. Edit any question, or rebuild the lot; the frame is reassembled
  and re-guarded on every change.
- **Calls that answer back.** Candidates ask about salary, location, and
  timelines and get real answers from a fact sheet the recruiter writes.
- **Structured results with evidence.** Notice period, availability, interest,
  and each answer come back as fields, paired with verbatim quotes.
- **A pipeline, not a list.** Applied → Shortlisted → Screened → Interview
  scheduled → Selected, with Rejected and Withdrew as exits. A completed call
  advances the candidate to Screened; only a person writes an exit.
- **Jobs close.** A filled or closed posting stops accepting calls, enforced
  immediately before dialing. Reopening requires a written reason.

## The safety model

This is the part worth reading, and the part that does not get traded for a
smoother demo.

| | |
|---|---|
| **Disclosure and consent** | The agent states it is an AI, names who it is calling for, and asks permission before the first question. Decline ends the call. This text lives in a pure, unit-tested function, so it cannot vary between candidates or runs. |
| **The guard runs four times** | On every generated question, on the assembled script, inside the port immediately before dialing, and over the transcript afterwards. The model is never trusted to have obeyed its instructions. Forbidden topics — age, marital status, religion, caste, nationality, disability, gender, current salary — live in `lib/script/guard.ts`. |
| **One door to CALL-E** | Everything CALL-E-facing goes through `lib/calle/port.ts`. Guard re-inspection and E.164 validation live there, so no component, route, or script can route around them. |
| **Numbers are refused, not guessed** | `normalizePhone` returns a typed rejection reason. An unresolvable number keeps the candidate visible in the queue with the reason shown, rather than dialing a stranger in another country. |
| **OpenLine never rejects anyone** | There is no code path that declines a candidate. An uncertain call becomes a human's problem via `needsHuman`. Shortlisting happens upstream in the ATS and is shown with its reason so a human can argue with it. |
| **Nothing dials by itself** | No scheduler, no queue, no batch. Every call is a person pressing a button that names the candidate. |

## How a call happens

```
resume PDF → R2 → unpdf → OpenAI parse + score → candidate row
                                                 (≥70 auto-shortlists, human overrides)
shortlisted candidate
  → preview    generate questions (OpenAI) → guard each one → assembleTask()
               → guard the whole script → persist the exact words a recruiter can read
               → edit.ts reassembles the frame on any edit and re-runs the guard

  → dispatch   startCall:  job open? → atomic claim → port.dial()
                           → store CALL-E's id immediately → return
               finishCall: (detached) waitForCall → transcript + structured result
                           → guard the agent's own turns → needsHuman routing
                           → advance the candidate to Screened

  → reconcile  a row stuck at "dialing" is re-fetched by its stored id on page load
```

Three facts about CALL-E shape this design:

1. **There is no endpoint to list calls.** A `call_id` we fail to persist is a
   call we can never read back, so every dispatch writes its row *before* it
   dials.
2. **There is no mid-call tool calling.** Anything the agent may say has to be
   inlined into the task text up front — that is what the fact sheet is.
   Anything absent is deferred to a human, never guessed.
3. **Webhooks are unsigned.** Nothing is trusted from a webhook without
   re-fetching through the authenticated API, which is why reconciliation
   re-fetches by id instead.

## Setup

```bash
pnpm install
cp .env.example .env        # fill it in — see below
pnpm run db:migrate         # apply migrations to Neon
pnpm run db:seed            # demo job + 51 applicants, 21 shortlisted
./start.sh                  # dev server, with a banner saying whether calls are armed
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `CALLE_API_KEY` | for real calls | **Calls are live whenever this is set.** They ring real phones and cost money. |
| `OPENAI_API_KEY` | recommended | Screening questions and resume parsing. Without it, generic fallback questions are used. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini` |
| `OPENLINE_CALL_LOCALE` | no | BCP 47, e.g. `en-US`. The only voice control CALL-E exposes. |
| `OPENLINE_DEMO_PHONE` | for the demo | The one number the seeded roster actually rings. Never committed. |
| `R2_*` | for resume upload | Without them the rest of the app still works. |

Every other seeded number is US fiction-reserved (`555-01xx`) and cannot
connect.

## Usage

1. Open the console and pick the seeded **Senior AI Engineer** job.
2. Upload resume PDFs, or use the seeded roster.
3. On a shortlisted row, **Build script** — then open it and read the exact
   words, including the consent line.
4. Edit a question if you want; the guard re-runs and the script version bumps.
5. **Call** — a two-step confirm that names the person. The page shows the call
   in progress and updates itself when the result lands.
6. Review the transcript, the structured result, and anything flagged for a
   human.

## Side effects, and how to stop it

- **Calls are live whenever `CALLE_API_KEY` is set.** There is no test mode by
  design — the per-candidate confirm is the gate.
- Writes candidate and call records to Neon; stores uploaded PDFs in R2.
- **There is nothing queued.** Calls are single-shot: no scheduler, no
  recurring jobs, nothing to cancel between runs.
- To stop future calls for a role, **mark the job Filled or Closed**. The block
  is enforced in `startCall()` immediately before dialing, not only in the UI.
  Reopening requires a written reason.
- Moving a candidate to **Rejected** or **Withdrew** removes them from the
  callable set entirely.
- None of this deletes anything. Transcripts and results stay readable.

## Stack

**Next.js 16** (App Router, Turbopack, React 19) · **TypeScript** · **Neon
Postgres** + **Drizzle** · **CALL-E SDK** (`@call-e/calle`) · **OpenAI** ·
**Cloudflare R2** · **Vitest** · plain CSS with design tokens.

## Layout

```
app/
  page.tsx              landing
  (app)/                the console — jobs, profiles, candidates, calls
  api/jobs/[id]/        preview (scriptable) and resume upload
components/             ui/, layout/, screening/, candidates/, jobs/, landing/
lib/
  calle/port.ts         the ONLY place that talks to CALL-E
  script/               question generation, the guard, the result schema
  screening/            preview, dispatch, reconcile, human edits
  resume/               extract → parse + score → ingest
  candidates/           profile shape, pipeline stages
  phone/normalize.ts    E.164, or an explicit refusal
  db/                   Drizzle schema, queries, Neon client
docs/story/             the demo films
```

## Development

```bash
pnpm run verify     # test + typecheck + lint — the gate before claiming done
pnpm run db:seed    # reset the demo data
./start.sh --test   # the full gate, then exit
```

Tests cover the pure, safety-bearing logic: phone normalization, the guard,
script assembly, the port, script edits, and the pipeline stages.

---

<div align="center">

Built with [CALL-E](https://www.heycall-e.com/) · **CALL-E: Your Code Is
Calling**

</div>
