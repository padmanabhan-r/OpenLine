---
name: OpenLine
description: The Exchange — an electromechanical switchboard world for a recruiting console that phones real people.
colors:
  bakelite: "#17130E"
  bakelite-2: "#1D1812"
  bakelite-surface: "#241E16"
  bakelite-surface-2: "#2C251C"
  cream-ink: "#EFE7D3"
  cream-ink-2: "#C9BDA3"
  cream-ink-3: "#A2967C"
  hairline: "rgba(239, 231, 211, 0.18)"
  hairline-2: "rgba(239, 231, 211, 0.09)"
  brass: "#D3A648"
  brass-deep: "#E4BC63"
  brass-soft: "#8A6E2F"
  brass-wash: "rgba(211, 166, 72, 0.14)"
  brass-tint: "rgba(211, 166, 72, 0.07)"
  brass-plate: "#C89B3C"
  brass-plate-hover: "#DBAF52"
  plate-ink: "#1A1510"
  danger-lamp: "#E2593F"
  danger-lamp-deep: "#EE7052"
  danger-wash: "rgba(226, 89, 63, 0.14)"
  green-lamp: "#8FB463"
  green-wash: "rgba(143, 180, 99, 0.14)"
  amber-lamp: "#E0A63E"
  amber-wash: "rgba(224, 166, 62, 0.14)"
  blue-lamp: "#7FAECF"
  blue-wash: "rgba(127, 174, 207, 0.14)"
typography:
  display:
    fontFamily: "Big Shoulders, Archivo, sans-serif"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.015em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "13px"
    lineHeight: 1.5
  label:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontWeight: 700
    fontSize: "12px"
    letterSpacing: "0.16em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "34px"
components:
  button-primary:
    backgroundColor: "{colors.brass-plate}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.pill}"
    height: "46px"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.brass-plate-hover}"
  button-ghost:
    textColor: "{colors.cream-ink}"
    rounded: "{rounded.pill}"
    height: "46px"
    padding: "0 22px"
  badge:
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 11px"
  plate:
    textColor: "{colors.cream-ink-2}"
    rounded: "{rounded.sm}"
    padding: "5px 12px"
---

# Design System: OpenLine

The source of truth for how this product looks. Tokens live in `app/globals.css`;
this file explains what they mean and when to reach for which. If a change here
and a change there disagree, `globals.css` wins and this file is stale — fix it.

## Overview

**Creative North Star: "The Exchange"**

Every screening call is a patch on the exchange board; OpenLine is the operator
who never sleeps. The whole surface is an electromechanical telephone exchange:
a bakelite near-black ground, brass jacks and cords, cream engraved labels,
jewel-lamp status lights, condensed stencilled display caps, and typewriter
mono. The product phones real people and spends real money, so the world's
first job is legibility: whether *this* screen can dial someone must never be
ambiguous, and the lamps have to tell the truth.

Structure is carried by plates, rules, and leader lines — never by card shells.
A plate names a thing; it does not box a paragraph. Sections are delimited by
hairline rules that draw open left to right (the product is called OpenLine),
and dotted leader lines bind related content across space the way a ledger
binds a name to a figure. The console is dense but calm; the landing is the
exchange floor itself — the board, one glowing cord, and a perforated cream
ticker tape printing the transcript.

Confirmed rejections: the AI-SaaS gradient hero, the card-grid feature list,
glassmorphism-as-decoration, per-item accent hues, lorem copy, emoji headings.

**Key Characteristics:**
- Bakelite ground, cream ink, one brass accent, jewel-lamp status colors
- No card shells: plates, rules, and leader lines carry structure
- Typewriter mono for every label, number, and action; condensed caps for display
- Red is a lamp, not a paint — danger and live lines only
- Honest machinery: absences are printed ("NO NUMBER ON FILE"), never faked

## Colors

A near-monochrome warm dark ground with cream ink, a single brass accent, and
four jewel-lamp status hues that light only when state demands it.

### Primary
- **Brass** (`--accent` #D3A648, `--accent-deep` #E4BC63, `--accent-soft` #8A6E2F): the one accent. Links, the focus ring, the drawn-open rule, selection, the Avatar's ring, the one thing on screen that matters most. `--accent-wash` / `--accent-tint` are its translucent settings for chips and tinted fills.
- **Brass plate** (`--cta` #C89B3C → `--cta-hover` #DBAF52, text `--cta-text` #1A1510): the primary button — dark engraved lettering on solid brass.

### Neutral
- **Bakelite grounds** (`--bg` #17130E, `--bg-2` #1D1812, `--surface` #241E16, `--surface-2` #2C251C): page ground and raised machinery. Depth comes from stepping these, not from hue changes.
- **Cream ink ramp** (`--ink` #EFE7D3, `--ink-2` #C9BDA3, `--ink-3` #A2967C): primary / secondary / tertiary text. Engraved-label cream, never pure white.
- **Hairlines** (`--line` at 18% cream, `--line-2` at 9%): borders and row separators — worn cream, never grey.
- **Smoked glass** (`--bg-glass` rgba(36,30,22,.72), `--glass-edge`, `--blur` 22px / `--blur-strong` 32px): the Panel and TopBar material — smoked bakelite over the ground, not decorative glassmorphism.

### Status lamps
- **Danger lamp** (`--danger` #E2593F, `--danger-deep` #EE7052, `--danger-wash`): guard violations, refusals, failed calls, and the armed live line. Nothing else.
- **Green / Amber / Blue lamps** (#8FB463 / #E0A63E / #7FAECF, each with a 14%-alpha `-wash`): badge and lamp status colors — good, warn (including honest absences like "NO NUMBER ON FILE"), info.

### Named Rules
**The Red Lamp Rule.** Red lights only where something is actually wrong or
actually live: a guard finding, a refusal, an armed line, the "Calls are live"
chip. Red anywhere else dilutes the safety story, and the safety story is the
product.

**The One Accent Rule.** One brass accent per view. Two accents competing means
neither is the point. (Avatars obey this too: one bakelite-and-brass treatment
for every person, never a per-name hue.)

**The Token Rule.** Never write a hex literal in a component. Every value above
is a token in `app/globals.css`.

## Typography

**Display Font:** Big Shoulders (with Archivo fallback) — `var(--display-face)`
**Body Font:** Archivo (with system sans fallback) — `var(--sans)`
**Label/Mono Font:** Courier Prime (with ui-monospace fallback) — `var(--mono)`

**Character:** Stencilled equipment lettering over typewriter tags. The display
voice is condensed uppercase like paint on a machine; the mono is the tag on
every jack and lamp; Archivo does the quiet reading work in between.

### Hierarchy
- **Display** (`.display`: weight 700, uppercase, line-height 0.92, letter-spacing .015em, `text-wrap: balance`): page and section headlines. Condensed caps only — this face is never used sentence-case.
- **Title** (weight 700, 21px, letter-spacing −.02em, Archivo): the TopBar page title and panel headings.
- **Body** (Archivo 400–600, 13–14.5px, line-height 1.5): console prose and table cells. This is a dense console — 16px body copy in a table row looks wrong here.
- **Label** (`.eyebrow`: Courier Prime 700, 12px, letter-spacing .16em, uppercase): the workhorse label. Use it instead of inventing a small-caps heading. `.eyebrow.muted` steps down to `--ink-3`.
- **Script** (`.script`: Courier Prime, 12.5px, line-height 1.75, pre-wrap): the exact words the candidate will hear, always in typewriter ink.

### Named Rules
**The Two-Weight Rule.** Courier Prime ships 400 and 700 only. Never request
500/600 in mono — the browser would fake it. Buttons and labels use 700.

**The Mono Voice Rule.** Everything the machine says or counts is mono:
labels, numbers, scores, phone fragments, IDs, transcripts, and every button
("START CALLING", not "Start calling").

## Layout

Console pages run inside `--maxw` (1180px) with 28px top / 34px side padding
(`Page`). The TopBar is sticky smoked glass, 70px minimum, with the title left
and actions right. Observed rhythm steps: 8 (inline gaps), 14 (row padding),
22 (panel padding), 34 (page gutters). List rows separate with
`1px solid var(--line-2)`; match the existing queue density rather than
inventing a new one.

The landing page is a different grammar with the same tokens: full-bleed
switchboard, sections delimited by drawn-open rules instead of containers,
dotted leader lines (`1px dotted var(--line)`) binding transcript lines to
rule plates and names to figures. No card grids anywhere.

## Elevation & Depth

Depth is tonal-plus-shadow: surfaces step through the bakelite ramp, and
black — not grey — shadows seat them. Panels are smoked glass (`--bg-glass` +
`--blur`) with an inset cream `--glass-edge` highlight, reading as a machined
face rather than a floating card.

### Shadow Vocabulary
- **Seat** (`--shadow-sm`: `0 1px 2px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.25)`): rows, chips, plates, panels at rest.
- **Raise** (`--shadow`: `0 4px 16px rgba(0,0,0,.40), 0 12px 40px rgba(0,0,0,.30)`): surfaces lifted above the page.
- **Float** (`--shadow-lg`: `0 8px 32px rgba(0,0,0,.48), 0 24px 80px rgba(0,0,0,.36)`): the rare overlay.
- **Engrave** (inset `0 1px 0 rgba(239,231,211,.08)` + a small drop): the plate treatment — light catching a routed edge.

### Named Rules
**The Black Shadow Rule.** Shadows are pure black at low alpha. A grey or
colored shadow does not exist on this ground.

## Shapes

Machined, not pillowy. Corners are tight: 6px (`--radius-sm`, plates, inputs),
10px (`--radius`, panels), 14px (`--radius-lg`, hero surfaces), and full pills
(`--radius-pill`) for buttons, badges, and chips. Jewel lamps and avatars are
circles — lit glass and bakelite discs. Borders are 1px cream hairlines;
emphasis borders derive from their own tone via
`color-mix(in srgb, <tone> 38%, transparent)` so a retint never orphans them.

## Components

Reuse before inventing: a new one-off button or badge is a bug. Extend the
existing component or use a different tone.

### Buttons (`components/ui/Button`)
Mono uppercase pills — every action reads like machinery.
- **Shape:** full pill (`--radius-pill`); Courier Prime 700, uppercase, .06em tracking. Sizes drop a step from sans equivalents because mono runs wide: sm 38px / default 46px / lg 54px tall.
- **Primary:** solid brass plate (`--cta` → `--cta-hover`), dark engraved text (`--cta-text`), inset top highlight.
- **Ghost:** 5% cream fill, `--line` border; hover fills to `--surface` and sharpens the border.
- **Soft:** `--surface` fill, `--line` border, seat shadow; hover steps to `--surface-2`.
- **Disabled:** opacity .5, `not-allowed` cursor.

### Badges & Chips (`components/ui/Badge`)
- **Style:** 26px pill, 12.5px / 600, tone color on its own 14%-alpha wash, border mixed from the tone itself.
- **Tones:** `accent | good | warn | info | neutral | danger`. Danger stays red — a guard violation in a cheerful tone would be a lie.
- **Dot:** an optional jewel lamp (`currentColor` with a `0 0 5px` glow), not a flat disc.

### Plates (`.plate`)
The world's replacement for the card: an engraved brass-edged strip — mono
uppercase 11.5px / 700 / .14em, cream-to-black gradient fill, inset highlight.
A plate names a thing; it never boxes a paragraph.

### Lamps (`.lamp`)
A 9px glass jewel: `currentColor` fill, outer glow, inset shading. Color comes
from the caller. `.lamp.live` pulses (1.6s) only under
`prefers-reduced-motion: no-preference` — a pulsing lamp means a line is
actually armed.

### Panels (`Panel` in `components/layout/TopBar`)
- **Corner Style:** 10px (`--radius`)
- **Background:** smoked glass (`--bg-glass` + `--blur`)
- **Border / Shadow:** `--line-2` hairline; seat shadow plus inset `--glass-edge` highlight
- **Internal Padding:** 22px, or `padded={false}` for flush lists

### Avatar (`components/ui/Avatar`)
One material, every person: a bakelite disc (radial `--surface-2` → `--bg-2`),
a 45%-brass ring, cream initials. Never a per-name hue — that would put
magenta on the exchange floor and hand every queue row its own accent.

### Navigation (`components/layout/Sidebar`, `TopBar`)
Sticky smoked-glass TopBar (70px min) with Archivo 700 title. The Sidebar
carries the live-status chip, which tells the truth: a red lamp and "Calls are
live" only when `CALLE_API_KEY` is set; neutral "Calls are off" otherwise.

### Switchboard (`components/landing/Switchboard`) — signature
The landing's orchestrated call: jack rows of the real shortlist, one cord
glowing from the live jack into a perforated cream ticker tape that prints the
AI disclosure transcript in typewriter ink, caret blinking (`.ticker-caret`).
No autoplay — the press is the dramatization; before it, the tape honestly
reads "— tape blank. place the call. —". Candidates without numbers show
"NO NUMBER ON FILE" in amber rather than a fabricated value.

### Motion (`.reveal`, `.rule-open`, `.fade-up`)
One idea used everywhere: content arrives from below (.4–.5s,
`cubic-bezier(.2,.7,.3,1)`), and where a rule sits above it the rule draws
open left to right first — a line opening. `.reveal` starts at opacity 0, so
the landing page's `<noscript>` unhide is mandatory wherever it is used.
`prefers-reduced-motion: reduce` collapses all animation and transition
durations globally. Inside the console, everything is still until the user
acts.

## Do's and Don'ts

### Do:
- **Do** use tokens for every color, radius, and shadow; `globals.css` is the only place a raw value lives.
- **Do** keep one brass accent per view and let the status lamps carry state.
- **Do** put every label, number, and action in Courier Prime (400/700 only), uppercase where it is machinery.
- **Do** mask phone numbers everywhere (`+91•••••4321`) — screenshots of this UI end up in a published demo.
- **Do** state absences honestly ("NO NUMBER ON FILE", amber) instead of faking a value.
- **Do** keep all text pairs at ≥4.5:1 on their actual ground — measured: `--ink-3` is 6.3:1 on `--bg` and 5.65:1 on `--surface`; the danger-wash pairing is 4.7:1. Check the real pairing, don't assume.
- **Do** pair every color-coded state with a word or shape — never color alone.

### Don't:
- **Don't** use red outside danger and live-line meaning. The Red Lamp Rule is product law and predates this world.
- **Don't** draw card shells. Plates name, rules delimit, leader lines bind; a bordered box around prose is the old world leaking back.
- **Don't** soften the guard, consent, or disclosure presentation to make a screen prettier — the safety story is the demo.
- **Don't** request mono weights 500/600, use the display face in sentence case, or give avatars per-name hues.
- **Don't** add gradient blobs, mesh heroes, lavender/indigo, centered-everything, or emoji headings.
- **Don't** ship `.reveal` on a page without the `<noscript>` unhide.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-09 | Red demoted to danger-only | The app can dial real people; red has to mean something |
| 2026-08-10 | Phone numbers masked everywhere in the UI | The demo is recorded and published |
| 2026-08-16 | World replaced with **The Exchange** by user decision (seed 34d229b9); butter-yellow/aqua "Open Sky" retired; orb video removed | The switchboard metaphor carries the product thesis — every call is a patch on the board — and the dark ground makes the lamp semantics legible |
