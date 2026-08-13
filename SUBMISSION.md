# Submitting OpenLine to the CALL-E hackathon

Everything needed to open the pull request, in the order it has to happen.
Sources: the Devpost requirements, the target repo's `README.md`, its
`apps/README.md`, and `docs/git-naming-conventions.md` (all read 2026-08-13).

---

## 1. What the hackathon asks for

| Requirement | Where it goes | Status |
|---|---|---|
| Pull request to `CALLE-AI/awesome-phone-call-agents` | GitHub | **pending** |
| Demonstration video, ~3 minutes, public on YouTube or Vimeo | Devpost form | **pending** |
| PR URL | Devpost form | after the PR |
| Email on the CALL-E account | Devpost form | **you supply** |
| Live demo URL | Devpost form, optional | **done** — https://openline-calle.vercel.app/ |
| Feedback survey | Optional, prize-eligible | your call |

---

## 2. Contribution area

**User-facing Apps** → `apps/web/openline/`.

The target repo takes three kinds of contribution:

| Area | Location | Their examples |
|---|---|---|
| Agent Skills | `skills/` | callbacks, appointment confirmation, lead qualification |
| Workflow Plugins | `plugins/` | Dify tools, n8n nodes, Zapier actions |
| **User-facing Apps** | `apps/{language}/{app-name}/` | **call review console**, call scheduler UI, business call workbench |

OpenLine is a call review console, so `apps/`. The `web` subdirectory is the
right one for a Next.js app (`apps/python/`, `apps/typescript/`, `apps/web/`,
`apps/shared/` are the choices).

**Also required:** add a row to the table in `apps/README.md` — app
name/directory link, language, purpose.

---

## 3. Naming conventions (theirs, not ours)

From `docs/git-naming-conventions.md` in their repo:

- **Branch** — `<type>/<short-kebab-summary>` →
  `feat/openline-screening-console`
- **Commits** — `<type>(<scope>): <summary>`, present-tense imperative,
  lowercase start, no trailing period →
  `feat(openline): add recruiter screening-call console`
- **PR title** — same format; when it squashes several commits it should
  "describe the final result that is visible to users" →
  `feat(openline): add recruiter screening-call console`

Our own rules still apply on top: **no `Co-Authored-By` or any trailer**, and
commit with the repo's configured git identity.

---

## 4. What the app README must contain

Their `apps/README.md` names six mandatory sections. Draft answers, so nobody
has to invent them at submission time:

### Setup
`pnpm install` → Neon `DATABASE_URL` → `pnpm run db:migrate` →
`pnpm run db:seed` → `./start.sh`. Env vars: `DATABASE_URL`, `CALLE_API_KEY`,
`OPENAI_API_KEY` (optional), `OPENAI_MODEL` (optional),
`OPENLINE_CALL_LOCALE`, `OPENLINE_DEMO_PHONE`, and the four `R2_*` keys.

### Usage
Create or seed a job → upload resume PDFs (parsed and scored against the job
description) → review the shortlist → build a script per candidate → read or
edit it → place the call → review the transcript and structured result.

### Side effects
**Calls are live whenever `CALLE_API_KEY` is set. They ring real phones and
spend real money.** There is no separate live/test switch by design — the
per-candidate confirm button is the gate. The app also writes candidate rows
and call records to Neon Postgres, and stores uploaded resume PDFs in
Cloudflare R2.

### Credential handling
Every secret comes from the environment; `.env*` is gitignored except
`.env.example`, and a repo hook blocks edits to it through the agent. No key
is ever written to the database, logged, or sent to the browser. The CALL-E
SDK is only ever constructed inside `lib/calle/port.ts`.

### Dry-run or preview behavior
There is no dry-run mode — it was removed deliberately, because a
half-connected pipeline is worse to demo than a real one. **Preview is the
safeguard instead:** every call's exact spoken text is generated, guarded, and
persisted as a readable record *before* anything dials. A human can read it,
edit any question, or rebuild it; the assembled task is re-guarded on every
edit and again inside the port at dial time. Nothing dials without a
per-candidate confirmation naming the person.

### Cancellation or rollback
Calls are single-shot: no scheduler, no recurring jobs, nothing queued for
later. Consequently there is nothing to cancel between runs. To stop future
calls for a role, **mark the job Filled or Closed** — the block is enforced in
`startCall()` immediately before dialling, not only in the UI, and reopening
requires a written reason. A candidate moved to Rejected or Withdrew leaves
the callable set entirely. Records are never deleted by any of this.

### Safety details they explicitly ask for
- **Phone numbers** — normalised to E.164 or refused with a typed reason;
  never guessed. An unresolvable number keeps the candidate visible in the
  queue with the reason shown.
- **Consent** — the agent states it is an AI, names who it is calling for, and
  asks permission before the first question. Decline ends the call. This text
  lives in a pure, unit-tested function so it cannot vary between candidates.
- **Boundaries** — a prohibited-topic guard runs three times (on each
  generated question, on the assembled script, and inside the port before
  dialling) plus once more over the transcript afterwards. Forbidden topics
  are in `lib/script/guard.ts`.
- **No decisions** — OpenLine has no code path that rejects anyone. Uncertain
  calls route to a human via `needsHuman`.

---

## 5. Blockers, in the order to clear them

- [ ] **Commit the working tree.** ~25 modified files: the landing rebuild,
      pipeline stages, job lifecycle, and migrations `0004`–`0006`.
- [x] **Rewrite `README.md`.** Done — covers the pitch, the safety model, the
      call flow, setup, side effects, and how to stop it. It doubles as the
      basis for the app README in §4.
- [ ] **Replace the `+91` fixture number in `lib/phone/normalize.test.ts`** —
      11 instances of the same number. Their rules say fictional numbers only,
      and India publishes no reserved range, so that number plausibly belongs
      to a real person. Use US fiction-reserved `555-01xx`, as the rest of the
      repo does. (The repo's own commit hook flags it, which is how it was
      found.)
- [ ] **Confirm no real number anywhere in the tree.** `OPENLINE_DEMO_PHONE`
      is env-only and must stay that way.
- [x] **Deploy** — live at https://openline-calle.vercel.app/ (Vercel, against
      the same Neon and R2). Re-deploy after the final commits so the judges
      see the pipeline stages and job lifecycle.
- [ ] **Re-seed before recording** — `pnpm run db:seed` clears the test
      uploads so the demo roster is clean.
- [ ] **Run their validator** — `python3 scripts/validate_repository.py` from
      the root of their repo, before opening the PR.

---

## 6. Open decision: vendor or link

Their `apps/` spec lists **source code files** as required, so the default is
to vendor the app into `apps/web/openline/`.

**Exclude from the vendored copy** — agent scaffolding and private notes that
mean nothing to them:

```
.claude/          CLAUDE.md      AGENTS.md
.remember/        docs/hackathon/  SUBMISSION.md
.env*             node_modules/  .next/
```

**Include:** `app/`, `components/`, `lib/`, `data/`, `drizzle/`, `scripts/`,
`public/`, `docs/story/`, `docs/architecture.html`, `ARCHITECTURE.md`,
`DESIGN.md`, `start.sh`, `.env.example`, config files, and the new
`README.md`.

The alternative — a README plus a link to
`github.com/padmanabhan-r/OpenLine` — is a much smaller PR but reads as a
thinner contribution against a spec that asks for source.

---

## 7. Video plan (~3 minutes)

Assets already built for this:

| Asset | Use |
|---|---|
| `docs/story/before.html` | the problem, 20s — a recruiter dialling one at a time |
| `docs/story/after.html` | the fix, 20s — CALL-E calls all twenty |
| `docs/architecture.html` | how it works, 30s |
| The console | the real run |

Suggested run of show: problem → shortlist → upload a resume and watch it
parse and score → open a generated script and read the consent line → edit a
question and watch the guard re-run → **place the one real call to
`OPENLINE_DEMO_PHONE`** → transcript and structured result → mark the job
filled and show calling switch off.

The real call is the whole point — a screen recording of a fake one proves
nothing, and the CALL-E account has free calls for exactly this.

---

## 8. Sequence on the day

1. Fork and clone `CALLE-AI/awesome-phone-call-agents`.
2. `git checkout -b feat/openline-screening-console`
3. Copy the app to `apps/web/openline/` per §6.
4. Write `apps/web/openline/README.md` from §4.
5. Add the row to `apps/README.md`.
6. `python3 scripts/validate_repository.py` — fix whatever it says.
7. Commit as `feat(openline): add recruiter screening-call console`. No
   trailers.
8. Push, open the PR with the same title.
9. Devpost: PR URL, video URL, CALL-E account email, demo URL.
