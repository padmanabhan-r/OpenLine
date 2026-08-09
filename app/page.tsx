import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import QueueStage from "@/components/landing/QueueStage";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

const STEPS = [
  {
    n: "01",
    icon: "people",
    title: "Bring the queue",
    body: "Import the applicant roster for a role. Numbers are normalised to E.164, and anything that cannot be resolved is flagged rather than guessed.",
  },
  {
    n: "02",
    icon: "doc",
    title: "Build the scripts",
    body: "Questions are grounded in the job description and the candidate's own background, then checked against a prohibited-topic guard before anything dials.",
  },
  {
    n: "03",
    icon: "eye",
    title: "Read before it speaks",
    body: "The dry-run preview shows the exact words CALL-E will be instructed to say. Nothing is summarised. Violations are highlighted in the sentence they came from.",
  },
  {
    n: "04",
    icon: "phone",
    title: "Call, then review",
    body: "CALL-E holds the conversation and returns a structured result with the candidate's own words as evidence. Uncertain calls go to a human, never to a decision.",
  },
];

const FEATURES = [
  {
    icon: "shield",
    title: "It cannot ask an unlawful question",
    body: "Age, marital and family status, pregnancy, religion, caste, national origin, disability, gender, politics, and salary history are all blocked — before dialing and again after. Work authorisation and salary expectations are permitted.",
  },
  {
    icon: "quote",
    title: "Every answer carries evidence",
    body: "Each extracted field is paired with the candidate's verbatim words. Nothing reaches a recruiter's screen that cannot be traced to something the candidate actually said.",
  },
  {
    icon: "ban",
    title: "It abstains rather than guesses",
    body: "When the transcript does not support an answer, the result is empty rather than invented. Low confidence routes the call to a person.",
  },
  {
    icon: "people",
    title: "The call goes both ways",
    body: "Candidates ask about salary, location policy, the team, and timelines. The assistant answers from a fixed fact sheet and hands anything else to a human.",
  },
  {
    icon: "doc",
    title: "The script is the artefact",
    body: "What you read in the preview is the exact string sent to CALL-E. A script you cannot inspect is a script nobody can be responsible for.",
  },
  {
    icon: "check-circle",
    title: "Dry run by default",
    body: "Live dialing needs an explicit switch and the destination number on an allowlist. An empty allowlist means nobody, never everybody.",
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
          <span className="eyebrow">Screening calls, powered by CALL-E</span>
          <h1
            className="display"
            style={{
              fontSize: "clamp(44px, 8vw, 100px)",
              margin: "18px 0 0",
            }}
          >
            Everyone applied.
            <br />
            <em style={{ color: "var(--red)", fontStyle: "normal" }}>
              Almost no one heard back.
            </em>
          </h1>
          <p
            style={{
              fontSize: "clamp(17px, 2.1vw, 21px)",
              color: "var(--ink-2)",
              maxWidth: 620,
              margin: "26px auto 0",
              lineHeight: 1.5,
            }}
          >
            A recruiter can phone five of five hundred applicants. OpenLine calls
            every one of them — a real, two-way conversation that cannot ask an
            unlawful question, and cannot reject anybody.
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
            <Link href="/safety">
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
            Dry run by default — nothing dials until you say so
          </p>

          <QueueStage />
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
          Read the script
          <br />
          <em style={{ color: "var(--red)", fontStyle: "normal" }}>
            before anyone hears it.
          </em>
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 1.8vw, 19px)",
            color: "var(--ink-2)",
            marginTop: 20,
            maxWidth: 640,
          }}
        >
          Four steps, and a human sees the words at step three.
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
                  background: "var(--red-tint)",
                  color: "var(--red)",
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
                  color: "var(--red)",
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
          <span className="eyebrow" style={{ color: "var(--red-soft)" }}>
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
            Applying for a job should not end in silence. If a company has time to
            read your CV, it has time to tell you what happened.
          </p>
          <p
            style={{
              fontSize: 15.5,
              color: "#C9BBA9",
              maxWidth: 620,
              margin: "26px auto 0",
              lineHeight: 1.6,
            }}
          >
            Phone calls did not scale, so almost nobody got one. That is the only
            reason the black hole exists — and the one thing worth automating.
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
            What the assistant
            <br />
            <em style={{ color: "var(--red)", fontStyle: "normal" }}>
              is not allowed to do.
            </em>
          </h2>
          <p
            style={{
              fontSize: "clamp(16px, 1.8vw, 19px)",
              color: "var(--ink-2)",
              marginTop: 20,
            }}
          >
            Enforced in code, not in policy. Each of these is a check that runs
            before or after every call.
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
                style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }}
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
            Built so a candidate
            <br />
            <em style={{ color: "var(--red)", fontStyle: "normal" }}>
              would agree to the call.
            </em>
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
                  color: "var(--red)",
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
          The queue is already there.
          <br />
          <em style={{ color: "var(--red)", fontStyle: "normal" }}>
            Call all of it.
          </em>
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
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
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
            <span>· the screening call that goes both ways</span>
          </div>
          <span>Built with CALL-E for &ldquo;Your Code Is Calling&rdquo;</span>
        </div>
      </footer>
    </div>
  );
}
