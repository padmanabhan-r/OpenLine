import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Switchboard, { type BoardRow } from "@/components/landing/Switchboard";
import Button from "@/components/ui/Button";
import { CalleCredit, CalleMark } from "@/components/ui/PoweredByCalle";
import { APPLICANTS } from "@/data/applicants";
import { COMPANY_NAME, JOB_TITLE } from "@/data/job";
import { normalizePhone } from "@/lib/phone/normalize";

/*
 * The landing is one screen: the board, the cord, the tape, and the four rules
 * the call obeys. A judge gets three minutes for the whole project, so the page
 * gets one viewport — everything on it traces to code or to the seeded demo
 * fixtures. The switchboard is the argument; the rest is caption.
 */

/**
 * The call in order: it says what it is, asks before starting, stays inside the
 * guard, and hands anything uncertain to a person. No count of guard passes —
 * the prose that used to carry one had drifted out of step with the README.
 */
const RULES = [
  "Discloses it's an AI",
  "Asks permission first",
  "Every question guard-checked",
  "No machine rejects anyone",
];

export default function LandingPage() {
  // CAND_0000001 is the one real person in the fixtures (the maintainer,
  // seeded for the live demo call). A published landing page shows only the
  // invented candidates — a real name here would be doxxing.
  const shortlisted = APPLICANTS.filter(
    (a) => a.screening.shortlisted && a.candidateId !== "CAND_0000001",
  );

  const roster = shortlisted.map((a) => ({
    name: a.profile.anonymizedName,
    headline: a.profile.currentTitle,
    score: a.screening.matchScore,
    hasPhone: normalizePhone(a.rawPhone, "IN").ok,
  }));

  // The hero board shows a handful of lines; the live one must be dialable.
  const liveIndex = roster.findIndex((r) => r.hasPhone);
  const live = roster[liveIndex];
  const heroRows: BoardRow[] = roster
    .filter((_, i) => i !== liveIndex)
    .slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <LandingNav />

      {/* ── Hero: the exchange floor, and the whole page ──────────────── */}
      <header
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "40px 34px 56px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 48,
            alignItems: "start",
          }}
        >
          <div>
            <a
              className="plate fade-up"
              href="https://www.heycall-e.com/"
              target="_blank"
              rel="noreferrer noopener"
              style={{
                color: "var(--ink-2)",
                // .plate is nowrap; at 390px that pushed the CALL-E mark past
                // the clipped edge of the page. It wraps rather than truncates.
                whiteSpace: "normal",
                flexWrap: "wrap",
              }}
            >
              <span>An AI phone-screening agent ·</span>
              {/* The credit and the mark break together or not at all. */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                built on
                <CalleMark height={13} />
              </span>
            </a>

            <h1
              className="display fade-up"
              style={{
                fontSize: "clamp(40px, 5vw, 68px)",
                margin: "24px 0 0",
                animationDelay: "70ms",
              }}
            >
              An agent calls
              <br />
              <span style={{ color: "var(--accent-deep)" }}>every name</span>
              <br />
              on the shortlist.
            </h1>

            <p
              className="fade-up"
              style={{
                fontSize: 16,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                maxWidth: "46ch",
                margin: "22px 0 0",
                animationDelay: "150ms",
              }}
            >
              OpenLine places the first screening call to the whole shortlist,
              however long it is, and comes back with what you need to act on:
              interview, or drop. It takes the repetitive calling so your time
              goes to the work that matters.
            </p>

            <div
              className="fade-up"
              style={{ margin: "26px 0 0", animationDelay: "230ms" }}
            >
              <Link href="/jobs">
                <Button size="lg">Open the console</Button>
              </Link>
            </div>
          </div>

          {/* The board sits inside the column with the copy. The old full-bleed
              pulled it past the right edge with a 100vw calc, which counts the
              scrollbar the container does not — so the gutter read as 173px of
              air on the left against nothing on the right, and the panel's own
              edge was clipped. */}
          <div className="fade-up" style={{ animationDelay: "160ms" }}>
            <Switchboard
              rows={heroRows}
              liveName={live?.name ?? "Asha Nair"}
              company={COMPANY_NAME}
              jobTitle={JOB_TITLE}
            />
            <noscript>
              <p
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginTop: 12,
                  lineHeight: 1.7,
                }}
              >
                The demonstration call: “Hi — this is an AI assistant calling
                for the recruiting team at {COMPANY_NAME}. Is now a good time
                for a few questions about your {JOB_TITLE} application?”
              </p>
            </noscript>
          </div>
        </div>

        {/* ── The floor rule: what the call obeys, in the order it obeys it ── */}
        <div
          className="mono fade-up"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px 22px",
            marginTop: 40,
            paddingTop: 26,
            borderTop: "1px solid var(--line-2)",
            fontSize: 12,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            animationDelay: "300ms",
          }}
        >
          {RULES.map((rule, i) => (
            <span
              key={rule}
              style={{ display: "inline-flex", alignItems: "center", gap: 22 }}
            >
              {i > 0 && (
                <span aria-hidden style={{ color: "var(--line)" }}>
                  ·
                </span>
              )}
              {rule}
            </span>
          ))}
        </div>
      </header>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--line-2)" }}>
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "36px 34px 34px",
          }}
        >
          <CalleCredit />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginTop: 26,
              fontSize: 13,
              color: "var(--ink-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 700, color: "var(--ink-2)" }}>
                OpenLine
              </span>
              <span className="plate" style={{ fontSize: 10.5, padding: "2px 8px" }}>
                Alpha
              </span>
            </div>
            <span>
              Built for the &ldquo;CALL-E: Your Code Is Calling&rdquo; hackathon
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
