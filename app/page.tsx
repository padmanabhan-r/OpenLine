import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { CalleCredit, CalleMark } from "@/components/ui/PoweredByCalle";

const STEPS = [
  {
    n: "01",
    icon: "people",
    title: "Bring your shortlist",
    body: "Import the candidates you have already picked for a role. Numbers are normalised, and anything unusable is flagged so nobody silently drops off the list.",
  },
  {
    n: "02",
    icon: "doc",
    title: "A script built for one person",
    body: "Each script is written by reading the candidate's profile against the job description and asking where the two meet and where they don't. Not a technical test — the fit questions a recruiter would spend fifteen minutes finding out.",
  },
  {
    n: "03",
    icon: "eye",
    title: "Approve once, not per call",
    body: "Read the exact words that will be spoken, for every candidate, on one screen. Nothing is summarised and nothing dials until you are happy with it.",
  },
  {
    n: "04",
    icon: "phone",
    title: "Get answers, not voicemails",
    body: "CALL-E works down the whole list and returns structured answers with the candidate's own words as evidence. You review results instead of chasing people.",
  },
];

const FEATURES = [
  {
    icon: "phone",
    title: "The whole list gets called",
    body: "Not the first twenty before the day runs out. Every shortlisted candidate with a working number is reached, and anyone who cannot be is surfaced rather than dropped.",
  },
  {
    icon: "quote",
    title: "Answers you can act on",
    body: "Notice period, availability, interest, and each screening answer come back as structured fields — paired with the candidate's verbatim words, so you can check any of it in a second.",
  },
  {
    icon: "people",
    title: "The call goes both ways",
    body: "Candidates ask about salary, location policy, the team, and timelines, and get real answers from a fact sheet you write. A screening call that only takes is a bad first impression.",
  },
  {
    icon: "doc",
    title: "One approval, not a hundred",
    body: "Read the exact script once, for the whole list. What you see in the preview is the string sent to CALL-E — a script you cannot inspect is one nobody can be responsible for.",
  },
  {
    icon: "ban",
    title: "It abstains rather than guesses",
    body: "When a transcript does not support an answer, the field comes back empty instead of invented, and the call is routed to you. Nothing uncertain becomes a confident record.",
  },
  {
    icon: "shield",
    title: "Safe questions by construction",
    body: "Every script is checked before dialing and every transcript after, so a question that cannot lawfully be asked in hiring never reaches a phone line — even at a hundred calls a day.",
  },
];

const BOUNDARIES = [
  "Reject a candidate, or imply one was rejected",
  "Make, extend, or hint at an offer",
  "Answer anything outside the job fact sheet",
  "Ask a question the recruiter did not approve",
  "Record an answer it did not actually hear",
  "Continue after someone asks for a human",
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <LandingNav />

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "56px 24px 0" }}>
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
          {/* Credit pill, in the shape CALL-E uses for its own partner badge. */}
          <a
            href="https://www.heycall-e.com/"
            target="_blank"
            rel="noreferrer noopener"
            style={{
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
          <p className="eyebrow" style={{ marginTop: 22 }}>
            An AI phone screening agent for recruiting teams
          </p>

          <h1
            className="display"
            style={{
              fontSize: "clamp(40px, 7.2vw, 92px)",
              margin: "14px 0 0",
            }}
          >
            Screen your whole shortlist
            <br />
            <em className="hl">by phone, without dialing.</em>
          </h1>

          <p
            style={{
              fontSize: "clamp(17px, 2.1vw, 21px)",
              color: "var(--ink-2)",
              maxWidth: 680,
              margin: "26px auto 0",
              lineHeight: 1.5,
            }}
          >
            Let your agent make the first calls. You get your day back.
          </p>

          <p
            style={{
              fontSize: "clamp(15px, 1.7vw, 17px)",
              color: "var(--ink-3)",
              maxWidth: 600,
              margin: "14px auto 0",
              lineHeight: 1.5,
            }}
          >
            No working down the list by hand. No voicemail tag. No candidate left
            at the bottom because the day ran out.
          </p>

          <div
            style={{
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
            <Link href="#boundaries">
              <Button size="lg" variant="ghost">
                <Icon name="shield" size={17} />
                What it can&rsquo;t do
              </Button>
            </Link>
          </div>

          <p
            style={{
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
            You read every script before it is spoken — nothing dials until you say so
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        style={{ padding: "100px 24px", maxWidth: "var(--maxw)", margin: "0 auto" }}
      >
        <span className="eyebrow">How it works</span>
        <h2
          className="display"
          style={{ fontSize: "clamp(34px, 5vw, 58px)", margin: "16px 0 0" }}
        >
          From shortlist
          <br />
          <em className="hl">to answers, without dialing.</em>
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 1.8vw, 19px)",
            color: "var(--ink-2)",
            marginTop: 20,
            maxWidth: 640,
          }}
        >
          Four steps. You do the first and the last.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            marginTop: 46,
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-sm)",
                padding: "30px 28px 34px",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: "var(--accent-tint)",
                  color: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 18,
                }}
              >
                <Icon name={step.icon} size={20} />
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 13,
                  color: "var(--accent)",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {step.n}
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  marginBottom: 8,
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Manifesto */}
      <section style={{ padding: "0 24px 100px" }}>
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            background: "var(--ink)",
            color: "var(--bg-2)",
            borderRadius: 34,
            padding: "clamp(48px, 7vw, 96px)",
            textAlign: "center",
          }}
        >
          <span className="eyebrow" style={{ color: "var(--accent-soft)" }}>
            The promise
          </span>
          <p
            style={{
              fontSize: "clamp(22px, 3.2vw, 38px)",
              fontWeight: 600,
              letterSpacing: "-.025em",
              lineHeight: 1.22,
              maxWidth: 900,
              margin: "22px auto 0",
            }}
          >
            Deciding who to call is judgement. Working down the list is not.
            Only one of those is worth a recruiter&rsquo;s afternoon.
          </p>
          <p
            style={{
              fontSize: 15.5,
              color: "#D8D2A4",
              maxWidth: 640,
              margin: "26px auto 0",
              lineHeight: 1.6,
            }}
          >
            You still choose the shortlist, approve the questions, and make every
            decision. OpenLine does the part that was only ever slow because one
            person can hold one phone at a time.
          </p>
        </div>
      </section>

      {/* Boundaries */}
      <section
        id="boundaries"
        style={{ padding: "0 24px 100px", maxWidth: "var(--maxw)", margin: "0 auto" }}
      >
        <div style={{ maxWidth: 720 }}>
          <span className="eyebrow">Boundaries</span>
          <h2
            className="display"
            style={{ fontSize: "clamp(34px, 5vw, 58px)", margin: "16px 0 0" }}
          >
            What it will never
            <br />
            <em className="hl">do on your behalf.</em>
          </h2>
          <p
            style={{
              fontSize: "clamp(16px, 1.8vw, 19px)",
              color: "var(--ink-2)",
              marginTop: 20,
            }}
          >
            Automating the dialing should not mean handing over the judgement. Each
            of these is a check in the code, not a line in a policy document.
          </p>
        </div>

        <ul
          style={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
            marginTop: 40,
          }}
        >
          {BOUNDARIES.map((item) => (
            <li
              key={item}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 18px",
              }}
            >
              <Icon
                name="ban"
                size={18}
                style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}
              />
              <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section
        id="features"
        style={{ padding: "0 24px 100px", maxWidth: "var(--maxw)", margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 48px" }}>
          <span className="eyebrow">Features</span>
          <h2
            className="display"
            style={{ fontSize: "clamp(34px, 5vw, 58px)", margin: "16px 0 0" }}
          >
            Built for the recruiter
            <br />
            <em className="hl">who has to trust it.</em>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
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
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--accent)",
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
              <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ textAlign: "center", padding: "20px 24px 110px" }}>
        <h2
          className="display"
          style={{ fontSize: "clamp(38px, 6.5vw, 78px)" }}
        >
          The shortlist is done.
          <br />
          <em className="hl">Let it call itself.</em>
        </h2>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 40,
            flexWrap: "wrap",
          }}
        >
          <Link href="/jobs">
            <Button size="lg">Open the console</Button>
          </Link>
          <Link href="/calls">
            <Button size="lg" variant="ghost">
              See a real script
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "48px 24px 40px" }}>
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
