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
 * The landing runs wider than the console's 1180. The board and the tape both
 * get shorter as they get wider, and this page has to land inside one screen.
 */
const SHELL = { maxWidth: 1340, margin: "0 auto" } as const;

export default function LandingPage() {
  const shortlisted = APPLICANTS.filter((a) => a.screening.shortlisted);

  const roster = shortlisted.map((a) => ({
    name: a.profile.anonymizedName,
    headline: a.profile.currentTitle,
    score: a.screening.matchScore,
    hasPhone: normalizePhone(a.rawPhone, "IN").ok,
  }));

  // Five lines on the board. Which one gets called is the visitor's choice,
  // not ours — the switchboard holds the selection.
  const heroRows: BoardRow[] = roster.slice(0, 5);

  // The number the page makes: the whole seeded shortlist, screened in
  // parallel, at the two minutes a basic screen takes. Derived from the same
  // fixtures the console seeds, so the claim and the demo cannot drift apart.
  const shortlistSize = APPLICANTS.filter((a) => a.screening.shortlisted).length;
  const callable = APPLICANTS.filter(
    (a) => a.screening.shortlisted && normalizePhone(a.rawPhone, "IN").ok,
  ).length;
  const machineMinutes = callable * 2;

  // The video is set per deployment; its button stays hidden until it is.
  const videoUrl = process.env.OPENLINE_VIDEO_URL?.trim();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <LandingNav />

      {/* ── Hero: the exchange floor, and the whole page ──────────────── */}
      <header
        style={{
          ...SHELL,
          width: "100%",
          flex: 1,
          padding: "22px 30px 20px",
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
                fontSize: "clamp(44px, 5.6vw, 80px)",
                margin: "22px 0 0",
                animationDelay: "70ms",
              }}
            >
              First-round
              <br />
              screens,
              <br />
              <span style={{ color: "var(--accent-deep)" }}>on autopilot.</span>
            </h1>

            <p
              className="fade-up"
              style={{
                fontSize: 20,
                lineHeight: 1.6,
                color: "var(--ink-2)",
                maxWidth: "40ch",
                margin: "24px 0 0",
                animationDelay: "150ms",
              }}
            >
              A shortlist of{" "}
              <span className="mono" style={{ color: "var(--ink)" }}>
                {shortlistSize}
              </span>{" "}
              is a day of dialing. OpenLine screens all of them in about{" "}
              <span className="mono" style={{ color: "var(--ink)" }}>
                {machineMinutes} minutes
              </span>{" "}
              of machine time, in parallel, and hands you each transcript, the
              structured answers, and a confidence score. The recruiter still
              decides. Only the dialing moves.
            </p>

            <div
              className="fade-up"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 24,
                animationDelay: "220ms",
              }}
            >
              {/* The page's one action: ring your own phone with the real script.
                  The console asks for the operator token first. */}
              <Link href="/try">
                <Button>Try a call</Button>
              </Link>
              {videoUrl && (
                <a href={videoUrl} target="_blank" rel="noreferrer noopener">
                  <Button variant="ghost">Watch the video</Button>
                </a>
              )}
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
                for the recruiting team at {COMPANY_NAME}. May I ask you a few
                short screening questions about your {JOB_TITLE} application?”
              </p>
            </noscript>
          </div>
        </div>

      </header>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      {/* The credit only. The wordmark and the Alpha tag are in the nav
          already; repeating them here was the row that pushed the page past
          one screen. */}
      <footer style={{ borderTop: "1px solid var(--line-2)" }}>
        <div style={{ ...SHELL, padding: "14px 30px 16px" }}>
          <CalleCredit />
        </div>
      </footer>
    </div>
  );
}
