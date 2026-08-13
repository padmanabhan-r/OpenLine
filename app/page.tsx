import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Reveal from "@/components/landing/Reveal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { CalleCredit, CalleMark } from "@/components/ui/PoweredByCalle";

/**
 * Deliberately not numbered. These are not steps a recruiter performs — they
 * are the screening work OpenLine takes off the week, which is why the section
 * reads as claims rather than a setup guide.
 */
const WHAT_IT_TAKES_OVER = [
  {
    icon: "doc",
    title: "It reads before it dials",
    body: "Every resume is parsed and set against the job description, so the questions come from what that specific profile raises. Not a template and not a technical test — the fit questions a recruiter would spend fifteen minutes finding out.",
  },
  {
    icon: "phone",
    title: "It calls all of them",
    body: "Not the first few before the day runs out. Every shortlisted candidate with a working number is reached, and anyone who cannot be is surfaced rather than quietly dropped.",
  },
  {
    icon: "quote",
    title: "It answers their questions too",
    body: "Salary band, location policy, team, timelines. Candidates get real answers from a fact sheet you write. A screening call that only takes is a bad first impression.",
  },
];

/**
 * Only what the section above does not already say — reach and the two-way
 * call live there.
 */
const FEATURES = [
  {
    icon: "eye",
    title: "Every script is yours to read",
    body: "Each candidate gets their own questions, and you can read the exact words before the call, edit any of them, or throw them out and rebuild. What is on screen is the string sent to CALL-E.",
  },
  {
    icon: "quote",
    title: "Answers you can act on",
    body: "Notice period, availability, interest, and each screening answer come back as structured fields — paired with the candidate's verbatim words, so you can check any of it in a second.",
  },
  {
    icon: "ban",
    title: "It abstains rather than guesses",
    body: "When a transcript does not support an answer, the field comes back empty instead of invented, and the call is routed to you. Nothing uncertain becomes a confident record.",
  },
];

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      {/* Scroll reveal hides its content until observed; without JS it stays. */}
      <noscript>
        <style>{".reveal{opacity:1}.rule-open::before{transform:none}"}</style>
      </noscript>
      <LandingNav />

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "56px 24px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <video
          aria-hidden
          className="hero-orb"
          src="/orb.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div aria-hidden className="aqua-sheen" />
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Credit pill, in the shape CALL-E uses for its own partner badge. */}
          <a
            href="https://www.heycall-e.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="fade-up"
            style={{
              animationDelay: "0ms",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 18px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: ".13em",
                textTransform: "uppercase",
                color: "var(--ink-2)",
              }}
            >
              Powered by
            </span>
            <CalleMark height={19} />
          </a>

          {/* Category line: what this is and who it is for, before the pitch.
              It says "AI" because the agent says it out loud on every call —
              the disclosure starts here, not at the dial tone. */}
          <p
            className="eyebrow fade-up"
            style={{ marginTop: 22, animationDelay: "70ms" }}
          >
            An AI phone screening agent for recruiting teams
          </p>

          <h1
            className="display fade-up"
            style={{
              animationDelay: "140ms",
              fontSize: "clamp(40px, 7.2vw, 92px)",
              margin: "14px 0 0",
            }}
          >
            Screen your whole shortlist
            <br />
            <em className="hl">by phone, without dialing.</em>
          </h1>

          <p
            className="fade-up"
            style={{
              animationDelay: "230ms",
              fontSize: "clamp(17px, 2.1vw, 21px)",
              color: "var(--ink-2)",
              maxWidth: 680,
              margin: "26px auto 0",
              lineHeight: 1.5,
            }}
          >
            Skip the calling. Keep the deciding.
          </p>

          <div
            className="fade-up"
            style={{
              animationDelay: "300ms",
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 34,
              flexWrap: "wrap",
            }}
          >
            <Link href="/jobs">
              <Button size="lg">Open the console</Button>
            </Link>
          </div>

          <p
            className="fade-up"
            style={{
              animationDelay: "370ms",
              marginTop: 16,
              fontSize: 13,
              color: "var(--ink-3)",
              display: "flex",
              gap: 7,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="check" size={14} style={{ color: "var(--green)" }} />
            Every profile read, matched to the job description, and called
          </p>
        </div>
      </section>

      {/* Where OpenLine sits */}
      <section
        id="how-it-works"
        style={{
          padding: "100px 24px",
          maxWidth: "var(--maxw)",
          margin: "0 auto",
        }}
      >
        <Reveal
          style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 56px" }}
        >
          <span className="eyebrow">Where OpenLine sits</span>
          <h2
            className="display"
            style={{ fontSize: "clamp(34px, 5vw, 58px)", margin: "16px 0 0" }}
          >
            The ATS hands you a list.
            <br />
            <em className="hl">Then the real work starts.</em>
          </h2>
          <p
            style={{
              fontSize: "clamp(16px, 1.8vw, 19px)",
              color: "var(--ink-2)",
              marginTop: 20,
              lineHeight: 1.55,
            }}
          >
            Calling, screening, scheduling — that is the week. OpenLine takes
            the screening off it entirely, so what is left on your desk is
            deciding what happens next.
          </p>
        </Reveal>

        {/* A drawn rule per column, so this does not read as a second copy of
            the Features card grid below. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "44px 44px",
          }}
        >
          {WHAT_IT_TAKES_OVER.map((item, i) => (
            <Reveal key={item.title} rule delay={i * 90}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  fontSize: "clamp(20px, 2vw, 23px)",
                  fontWeight: 700,
                  letterSpacing: "-.025em",
                  marginBottom: 12,
                }}
              >
                <Icon
                  name={item.icon}
                  size={21}
                  style={{ color: "var(--accent)", flexShrink: 0 }}
                />
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 15.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                }}
              >
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        style={{
          padding: "0 24px 100px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div aria-hidden className="aqua-sheen low" />
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Reveal
            style={{
              textAlign: "center",
              maxWidth: 760,
              margin: "0 auto 56px",
            }}
          >
            <span className="eyebrow">Features</span>
            <h2
              className="display"
              style={{ fontSize: "clamp(34px, 5vw, 58px)", margin: "16px 0 0" }}
            >
              Built for the recruiter
              <br />
              <em className="hl">who has to trust it.</em>
            </h2>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 80}
                className="lift"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "28px 26px 30px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: "var(--accent-tint)",
                    border: "1px solid var(--accent-wash)",
                    color: "var(--accent-deep)",
                    display: "grid",
                    placeItems: "center",
                    marginBottom: 18,
                  }}
                >
                  <Icon name={f.icon} size={18} />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    marginBottom: 7,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                  }}
                >
                  {f.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing statement. The hero carries the page's only call to action. */}
      <section style={{ textAlign: "center", padding: "20px 24px 110px" }}>
        <Reveal>
          <h2
            className="display"
            style={{ fontSize: "clamp(38px, 6.5vw, 78px)" }}
          >
            The shortlist is done.
            <br />
            <em className="hl">Let it call itself.</em>
          </h2>
        </Reveal>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          padding: "48px 24px 40px",
        }}
      >
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
          <CalleCredit />
        </div>
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "26px auto 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>
              OpenLine
            </span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: ".1em",
                padding: "3px 7px",
                borderRadius: "var(--radius-pill)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--ink-2)",
              }}
            >
              ALPHA
            </span>
            <span>· the screening call that goes both ways</span>
          </div>
          <span>
            Built for the &ldquo;CALL-E: Your Code Is Calling&rdquo; hackathon
          </span>
        </div>
      </footer>
    </div>
  );
}
