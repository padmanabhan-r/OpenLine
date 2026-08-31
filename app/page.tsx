import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Reveal from "@/components/landing/Reveal";
import Switchboard, { type BoardRow } from "@/components/landing/Switchboard";
import Button from "@/components/ui/Button";
import { CalleCredit, CalleMark } from "@/components/ui/PoweredByCalle";
import { APPLICANTS } from "@/data/applicants";
import { COMPANY_NAME, JOB_TITLE } from "@/data/job";
import { normalizePhone } from "@/lib/phone/normalize";

/*
 * The landing is the exchange floor: the board, the cord, the tape. Every
 * claim on this page traces to code or to the seeded demo fixtures — the
 * transcript is the real disclosure grammar, the board is the real shortlist.
 */

/** Each transcript moment, annotated with the rule that governs it. */
const RULES = [
  {
    line: "“…this is an AI assistant calling for the recruiting team at Northwind Payments.”",
    rule: "Discloses itself",
    detail:
      "The disclosure lives in assembleTask(), pure and unit-tested, so it cannot vary between candidates or runs.",
  },
  {
    line: "“Is now a good time for a few questions? You can stop me at any point.”",
    rule: "Asks permission first",
    detail:
      "A no ends the call. The candidate is thanked, told a human will follow up, and nothing is asked.",
  },
  {
    line: "“What notice period would you need?” — and never anything else",
    rule: "Every question guard-checked",
    detail:
      "Age, marital status, religion, current salary and the rest are forbidden topics. The guard runs three times: on each question, on the assembled script, and again before dialing.",
  },
  {
    line: "“…I don't want to answer that.” — recorded exactly as said",
    rule: "It abstains rather than guesses",
    detail:
      "A declined answer is information too. Anything uncertain routes to a human for review — no code path rejects a candidate.",
  },
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
      {/* Reveal animations start hidden; without JS they must not stay hidden. */}
      <noscript>
        <style>{`.reveal { opacity: 1 !important; }`}</style>
      </noscript>

      <LandingNav />

      {/* ── Hero: the exchange floor ─────────────────────────────────── */}
      <header
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "64px 34px 90px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 56,
            alignItems: "start",
          }}
        >
          <div>
            <a
              className="plate fade-up"
              href="https://www.heycall-e.com/"
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "var(--ink-2)" }}
            >
              An AI phone-screening agent · built on
              <span style={{ display: "inline-flex" }}>
                <CalleMark height={13} />
              </span>
            </a>

            <h1
              className="display fade-up"
              style={{
                fontSize: "clamp(54px, 7.4vw, 108px)",
                margin: "26px 0 0",
                animationDelay: "70ms",
              }}
            >
              The operator
              <br />
              who never{" "}
              <span style={{ color: "var(--accent-deep)" }}>sleeps.</span>
            </h1>

            <p
              className="fade-up"
              style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                maxWidth: "44ch",
                margin: "26px 0 0",
                animationDelay: "150ms",
              }}
            >
              OpenLine places the first screening call for every name on your
              shortlist — discloses itself, asks permission, and hands you the
              transcript with structured answers. Skip the calling. Keep the
              deciding.
            </p>

            <div
              className="fade-up"
              style={{ margin: "30px 0 0", animationDelay: "230ms" }}
            >
              <Link href="/jobs">
                <Button size="lg">Open the console</Button>
              </Link>
            </div>

            <p
              className="mono fade-up"
              style={{
                fontSize: 12,
                letterSpacing: ".08em",
                color: "var(--ink-3)",
                margin: "22px 0 0",
                animationDelay: "300ms",
              }}
            >
              NO MACHINE EVER REJECTS A CANDIDATE. UNCERTAIN CALLS GO TO A
              HUMAN.
            </p>
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
      </header>

      {/* ── The rules, annotated on the call itself ─────────────────── */}
      <section
        id="the-rules"
        style={{
          borderTop: "1px solid var(--line-2)",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "84px 34px 90px",
          }}
        >
          <Reveal rule>
            <h2
              className="display"
              style={{ fontSize: "clamp(38px, 4.6vw, 64px)", margin: "12px 0 0" }}
            >
              Wired in, not promised.
            </h2>
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                maxWidth: "62ch",
                margin: "16px 0 0",
              }}
            >
              Four moments from the same call, each tied to the code that
              enforces it. This is the machine ringing real people, so none of
              this is decoration.
            </p>
          </Reveal>

          <div style={{ marginTop: 46 }}>
            {RULES.map((r, i) => (
              <Reveal key={r.rule} delay={i * 90}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    gap: 14,
                    padding: "22px 0",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <p
                    className="mono"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      color: "var(--ink)",
                      flex: "1 1 340px",
                      maxWidth: "52ch",
                    }}
                  >
                    {r.line}
                  </p>
                  <span
                    aria-hidden
                    style={{
                      flex: "1 1 60px",
                      borderBottom: "1px dotted var(--line)",
                      alignSelf: "center",
                      minWidth: 40,
                    }}
                  />
                  <div style={{ flex: "1 1 300px", maxWidth: "46ch" }}>
                    <span className="plate" style={{ color: "var(--accent-deep)" }}>
                      {r.rule}
                    </span>
                    <p
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.65,
                        color: "var(--ink-3)",
                        margin: "10px 0 0",
                      }}
                    >
                      {r.detail}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The board at full density ────────────────────────────────── */}
      <section id="the-board">
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "84px 34px 90px",
          }}
        >
          <Reveal rule>
            <h2
              className="display"
              style={{ fontSize: "clamp(38px, 4.6vw, 64px)", margin: "12px 0 0" }}
            >
              It calls all of them.
            </h2>
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                maxWidth: "62ch",
                margin: "16px 0 0",
              }}
            >
              The shortlist is the bottleneck, so OpenLine works the whole
              board — one confirmed call at a time, never without a human
              having read the script first. This is the demo job&apos;s real
              seeded shortlist, gaps included.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div
              style={{
                marginTop: 40,
                columnGap: 56,
                columns: "2 380px",
              }}
            >
              {roster.map((r, i) => (
                <div
                  key={r.name}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--line-2)",
                    breakInside: "avoid",
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)", width: 22 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      flex: 1,
                      borderBottom: "1px dotted var(--line-2)",
                      minWidth: 16,
                    }}
                  />
                  {r.hasPhone ? (
                    <span
                      className="mono"
                      style={{ fontSize: 11.5, color: "var(--ink-3)" }}
                    >
                      MATCH {r.score}
                    </span>
                  ) : (
                    <span
                      className="mono"
                      style={{ fontSize: 11.5, color: "var(--amber)" }}
                    >
                      NO NUMBER ON FILE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--line-2)",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "110px 34px",
            textAlign: "center",
          }}
        >
          <Reveal>
            <h2
              className="display"
              style={{ fontSize: "clamp(44px, 6vw, 92px)" }}
            >
              Every word,
              <br />
              <span style={{ color: "var(--accent-deep)" }}>
                yours to read.
              </span>
            </h2>
            <div style={{ marginTop: 34 }}>
              <Link href="/jobs">
                <Button size="lg">Open the console</Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--line-2)" }}>
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "44px 34px 40px",
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
              <span>· the screening call that goes both ways</span>
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
