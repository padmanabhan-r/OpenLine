# CALL-E hackathon — research and idea selection

Research notes behind **OpenLine**. Kept because the reasoning about what *not*
to build is as useful as the decision itself.

---

## 1. The brief

**"CALL-E: Your Code Is Calling"** — sponsor AIRUDDER Pte Ltd (Singapore), on Devpost.

| | |
|---|---|
| Submission deadline | **Sept 14 2026, 11:45 am SGT** |
| Prizes | Practical **$4,000** · Innovative **$3,000** · 2× Honorable **$1,000** · 5× Feedback **$200** |
| Track selection | **None — every submission is judged for both** main tracks |
| Submit via | PR to `CALLE-AI/awesome-phone-call-agents` + Devpost form |
| Deliverables | PR · <3 min public video · text description · CALL-E account email |
| Call budget | 20 free calls; +200 on request (**1–5 business day lead time**) |

**Four equally weighted criteria (25% each)**, ties broken in listed order — so
Real World Impact is worth the most:

1. **Real World Impact** — a real, *specific* phone-work problem. The rules
   explicitly warn against "a generic 'AI that makes phone calls' concept."
2. **Quality of the Idea** — "creative, **non-obvious**"; clear, well-scoped,
   **reusable by the community**.
3. **Technical Implementation** — "CALL-E imported and **actually called at
   runtime**, not just referenced."
4. **Product Experience & Demo** — coherent experience; the video must land the "why".

Two things most entrants will miss: the **Feedback Survey is a separate prize**
($200 × 5, judged on actionable detail — see §5), and **multiple substantially
different submissions are allowed**. Caveat: submitting *only* feedback
disqualifies you from the main prizes.

---

## 2. What CALL-E actually is

One primitive:

```
task (natural language)  +  result_schema (JSON Schema)  →  validated structured result
```

Best described as **async batch outbound voice-to-JSON**. Five REST endpoints
plus a webhook you host. Base `https://api.heycall-e.com`, API `0.6.0`.

Always returned regardless of your schema: `task_completed`,
`completion_confidence {score,label}`, `evidence[]`, and a
**CallTask → Recipient → Attempt** hierarchy where each attempt carries
`transcript_turns[]` (`offset_seconds`, `speaker`, `text`).

Notably, it **abstains**: when the evidence cannot support a schema-valid
result, `structured_result` is `null` rather than an invention. That property is
load-bearing for anything trustworthy built on top.

### Constraints that decide what is buildable

| Not available | Consequence |
|---|---|
| **No mid-call tool/function calling** | The call is a sealed box. Context frozen at dial time; all intelligence lives *between* calls. |
| **No inbound, no SMS** | Outbound voice only. |
| **No recordings** | Transcripts only. |
| **No scheduling/recurrence** | Delegated to the host — a stated community gap. |
| **No cancellation** | Docs prescribe **wave-based dispatch** for quorum workflows. |
| **No voice/persona/model/timeout/DTMF config** | `task` + `locale` + `region` are the only knobs. |
| **No live transfer** | "Handoff" is only a post-call classification field. |
| **Unsigned webhooks; no `GET /v1/calls` list** | Re-fetch before side effects; persist every `call_id` yourself. |

> **The design insight:** because a call is a sealed box returning typed data,
> the interesting projects are **multi-call state machines** — search,
> verification, quorum, cascade, reconciliation — not "one call does a thing."

**Docs correction:** the docs claim published SDKs are `0.2.x` and Calls-only.
In fact `@call-e/calle@0.6.0` is live on npm and ships `calls`, `goals`, and
`webhooks`. It also accepts a `fetch` injection, which is what makes a
credential-free test suite possible.

---

## 3. Prior art in the submission repo

11 skills, 22 apps, 5 plugins already. The bar is high and the house style is
consistent: consent-first, disclosed AI, **dry-run by default**, abstention over
false confidence, explicit medical/legal/financial/emergency boundaries.
`CONTRIBUTING.md` *requires* a no-call path.

**The genuinely clever existing work:**
- **`voice-preflight`** — CALL-E has no voice preview, so it renders your `task`
  through your *own* TTS and refuses a script whose critical line was edited away.
- **`phone-approval-gate`** — phone as out-of-band CI/CD approval, shipped as a
  GitHub Action with dual control, one-time spoken code, hash-chained audit.
- **`call-on-behalf`** — a *disclosure budget*: an allowlist of what may be said
  about you, checked before and after the call.
- **`hungrycall-cascade`** — must/boundary/**concession**/wish conditions, where a
  concession is an *authorisation*; a "yes" bought with an ungranted concession
  is rejected post-hoc.
- **`researchcall-survey`** — statistical honesty as code: denominators named,
  silence never read as consent, ties stay ties.
- **`accesscall`** — the accessibility audit form is itself inaccessible, so do
  intake by phone → VPAT 2.4 docx.

### Coverage map

**Saturated:** approval gates · verification callbacks · consent machinery ·
scheduling/coordination · batch campaigns · form/CRM intake · surveys · ops
exceptions · **auth plumbing (6+ near-identical login clients)** ·
Zapier/n8n/Dify/HubSpot.

**Absent:** evaluation and regression testing · **webhooks (the endpoint exists
and nothing in either repo consumes it)** · conversational front-ends · chat-ops ·
calendar · multilingual (28 countries, zero non-English examples) · memory across
calls · anything playful.

**Also crowded by construction:** the maintainers' `docs/roadmap.md` publishes an
idea list. Anything on it — appointment confirmation, lead qualification, order
exception, service dispatch, incident escalation, customer callback,
`candidate-availability-call` — will attract multiple submissions.

---

## 4. Ideas considered

Three axes organise the space. Mapping the repo against them shows where it's thin:

| Axis | Saturated | Empty |
|---|---|---|
| **Who you call** | strangers / customers | your own network or infrastructure |
| **What it's for** | get a task done, decide, deliver | measure / monitor |
| **Time** | one-shot, cascade | longitudinal — repeated and diffed |

| Idea | Verdict |
|---|---|
| **`ringcheck`** — pytest/CI for your own IVR and call scripts | Strong: safe to demo, fills the evaluation gap, every contributor is a user. Rested on **undocumented DTMF navigation** — an unverified assumption. |
| **`fieldaudit`** — continuous compliance monitoring for multi-location businesses (automated mystery shopping) | Strong: existing ~$2B industry, clean consent (your own franchisees), showcases `recipients[]` batch fan-out, fits 20 calls. Needs a simulated location network to demo. |
| **`phonewatch`** — change detection for phone-only facts | Fills three gaps at once. But "monitoring" is a mechanism, not a problem; needs an anchoring use case. |
| **`groundtruth`** — calls as a dataset pipeline (e.g. insurer "ghost networks") | Highest impact ceiling. Overlaps `verify-by-phone`, needs many calls, brushes the medical boundary. |
| **`rfq`** — phone procurement quotes | Non-obvious vertical, but mechanically close to `hungrycall-cascade`. |
| **`interpreter`** — call institutions in a language you don't speak | Zero prior art, strong human impact; CALL-E's multilingual quality unverified. |
| **`paired-testing`** — civic accountability auditing | Highest ceiling, but deception is intrinsic to the method and collides with the consent-first house style. **Likely fails Stage One on safety. Rejected.** |

---

## 5. What was chosen, and why

**OpenLine** — candidate-first screening calls.

Recruiting screening is, on its face, the *most* predictable idea in this space
and `candidate-availability-call` is on the maintainers' roadmap. It was chosen
anyway because the differentiation lives in **who the tool serves**, not what it
does:

> A recruiter can phone 5 of 500 applicants. The other 495 get the application
> black hole. That gap exists *precisely because* phone calls don't scale — one
> of the few places where "do it at scale" is the point rather than a gimmick.

Five commitments carry the difference:

1. **Everyone in the queue gets called**, not just a shortlist.
2. **The call is two-way** — the candidate can ask about salary band, remote
   policy, team, timeline.
3. **Bias-safe by construction** — a prohibited-topic guard scans the script
   before dialing and the transcript after. Fail-closed.
4. **Abstain, never guess** — null extraction and low confidence route to a human.
5. **The agent cannot reject.** It only gathers. Rejection stays human, and
   candidates get their transcript with a right of reply.

The hardest technical problem turned out to be the guard: *"are you authorised to
work in India?"* is lawful while *"what is your nationality?"* is not, and both
contain nationality vocabulary — so it matches exemptions before prohibitions.
It also has to handle reported speech, because a generated script says "ask how
old **they are**", not "how old **are you**".

### Rejected framings within recruiting

- *Recruiter-first throughput screening* — the predictable submission.
- *Availability/scheduling only* — explicitly on the published roadmap.
- *Reference checks* — genuinely non-obvious and not on the roadmap, but a
  different product from the one being built.

---

## 6. Appendix — CALL-E gaps (drafts the Feedback Survey)

Found while researching; each is concrete and actionable:

- **Docs are stale on SDK versions.** `sdks.md` says registry packages are
  `0.2.x` and Calls-only; npm has `@call-e/calle@0.6.0` with `goals` and
  `webhooks`. The "Supported scope" list is therefore misleading.
- **Webhooks are unsigned.** Both SDK verification helpers are deprecated, and
  the prescribed mitigation is re-fetching every event. A signing secret would
  remove a whole class of receiver bugs.
- **No `GET /v1/calls` list endpoint.** Losing a `call_id` means losing the call.
- **No client-side cancellation**, so an aborted campaign keeps dialing.
- **No Goal authoring API** — Goals are CALL-E Chat only, which blocks
  multi-tenant provisioning.
- **Goal Run `variables` and `result` are flat scalars only.**
- **No mid-call tool calling**, so every fact must be inlined into `task`.
- **No recordings, no inbound, no scheduling, no live transfer.**
- **No voice/persona/timeout/DTMF configuration.**
- **No async Python client; no Zod/Pydantic schema helpers.**
- **Undocumented:** supported regions and languages, retry/dial policy,
  concurrency limits, per-call credit cost, max recipients per batch.
- **Broken links:** `CALL-E-installation-guide.md` references `./install-guide.md`
  and `./cli.md`, neither of which exists.
