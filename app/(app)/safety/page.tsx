import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const COMMITMENTS = [
  {
    title: "Everyone in the queue gets called",
    body: "Not just a shortlist. A recruiter can phone five of five hundred applicants; the rest hear nothing. That gap exists because phone calls do not scale, which is the one thing automation genuinely fixes here.",
  },
  {
    title: "The call goes both ways",
    body: "After the screening questions the candidate can ask about salary, location policy, the team, and timelines. The assistant answers from the job fact sheet and defers anything else to a person.",
  },
  {
    title: "It cannot ask an unlawful question",
    body: "Every script is checked before dialing and every transcript after. Age, marital and family status, pregnancy, religion, caste, national origin, disability, gender, political views, and salary history are all blocked. Work authorisation and salary expectations are permitted.",
  },
  {
    title: "It abstains rather than guesses",
    body: "CALL-E returns nothing rather than inventing an answer it cannot ground in the transcript. Low confidence, absent consent, or an unanswered candidate question routes the call to a human.",
  },
  {
    title: "It cannot reject anyone",
    body: "The assistant only gathers. Rejection stays a human decision. Candidates receive a copy of what was discussed and can correct anything that was misheard.",
  },
];

export default function SafetyPage() {
  const liveCalls = process.env.OPENLINE_LIVE_CALLS === "true";
  const allowlist = (process.env.OPENLINE_CALL_ALLOWLIST ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const hasKey = Boolean(process.env.CALLE_API_KEY);

  const canDial = liveCalls && allowlist.length > 0 && hasKey;

  return (
    <>
      <TopBar
        title="Safety"
        subtitle="What this deployment can and cannot do right now."
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          <Panel>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
              <Icon
                name={canDial ? "phone" : "shield"}
                size={22}
                style={{
                  color: canDial ? "var(--danger)" : "var(--green)",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  {canDial
                    ? "This deployment can place real calls"
                    : "This deployment cannot place a call"}
                </h2>
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6, maxWidth: 640 }}>
                  {canDial
                    ? `Live dialing is enabled and ${allowlist.length} number${allowlist.length === 1 ? " is" : "s are"} allowed. Calls cost money and reach real people.`
                    : "Scripts are generated, checked, and previewed, but nothing dials. Live dialing requires all three conditions below."}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <Condition
                met={liveCalls}
                label="Live calls enabled"
                detail="OPENLINE_LIVE_CALLS is exactly “true”"
              />
              <Condition
                met={allowlist.length > 0}
                label={`${allowlist.length} number${allowlist.length === 1 ? "" : "s"} on the allowlist`}
                detail="An empty allowlist means nobody, never everybody"
              />
              <Condition
                met={hasKey}
                label="CALL-E API key present"
                detail="Read from the environment, never shown here"
              />
            </div>
          </Panel>

          <Panel>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              What OpenLine promises a candidate
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>
              These are enforced in code, not policy.
            </p>
            <ol style={{ display: "grid", gap: 16, listStyle: "none" }}>
              {COMMITMENTS.map((c, i) => (
                <li key={c.title} style={{ display: "flex", gap: 14 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--accent)",
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>{c.title}</h3>
                    <p
                      style={{
                        fontSize: 13.5,
                        color: "var(--ink-2)",
                        marginTop: 4,
                        maxWidth: 660,
                      }}
                    >
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </Page>
    </>
  );
}

function Condition({
  met,
  label,
  detail,
}: {
  met: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        border: "1px solid var(--line-2)",
      }}
    >
      <Icon
        name={met ? "check-circle" : "ban"}
        size={18}
        style={{ color: met ? "var(--green)" : "var(--ink-3)", flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{detail}</div>
      </div>
      <Badge tone={met ? "good" : "neutral"}>{met ? "Yes" : "No"}</Badge>
    </div>
  );
}
