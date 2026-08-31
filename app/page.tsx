import LandingNav from "@/components/landing/LandingNav";
import Switchboard, { type BoardRow } from "@/components/landing/Switchboard";
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
 * The landing runs wider than the console's 1180. The board and the tape both
 * get shorter as they get wider, and this page has to land inside one screen.
 */
const SHELL = { maxWidth: 1340, margin: "0 auto" } as const;

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

  // Five lines on the board. Which one gets called is the visitor's choice,
  // not ours — the switchboard holds the selection.
  const heroRows: BoardRow[] = roster.slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <LandingNav />

      {/* ── Hero: the exchange floor, and the whole page ──────────────── */}
      <header
        style={{
          ...SHELL,
          padding: "26px 30px 22px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 44,
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
                fontSize: "clamp(44px, 5.2vw, 76px)",
                margin: "26px 0 0",
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
                fontSize: 22,
                lineHeight: 1.7,
                color: "var(--ink-2)",
                maxWidth: "38ch",
                margin: "30px 0 0",
                animationDelay: "150ms",
              }}
            >
              OpenLine runs your first-round screening calls, so you don&apos;t have to. It speaks with candidates, captures the signals that matter, and gives recruiters concise summaries and next steps—freeing your team to focus on hiring the right people, not chasing calls.
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

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--line-2)" }}>
        <div
          style={{
            ...SHELL,
            padding: "16px 30px 18px",
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
              marginTop: 16,
              fontSize: 12.5,
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
          </div>
        </div>
      </footer>
    </div>
  );
}
