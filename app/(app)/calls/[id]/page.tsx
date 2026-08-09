import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import ScriptView from "@/components/screening/ScriptView";
import { getCall } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getCall(id);
  if (!row) notFound();

  const { call, candidate, job } = row;
  const findings = call.guardFindings;
  const blocked = findings.length > 0 || call.status === "refused";

  return (
    <>
      <TopBar
        title={candidate.name}
        subtitle={`${job.title} · ${job.companyName}`}
        actions={
          <Link
            href={`/jobs/${job.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--ink-2)",
            }}
          >
            <Icon name="arrow-left" size={15} /> Back to queue
          </Link>
        }
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          {/* Verdict first — it decides whether the script below may be spoken. */}
          <Panel>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
              <Icon
                name={blocked ? "ban" : "check-circle"}
                size={22}
                style={{
                  color: blocked ? "var(--red)" : "var(--green)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 15.5, fontWeight: 700 }}>
                  {blocked
                    ? "This script will not dial"
                    : "Cleared to dial"}
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--ink-2)",
                    marginTop: 5,
                    maxWidth: 640,
                  }}
                >
                  {blocked
                    ? call.refusalDetail ??
                      "The script contains a question that cannot lawfully be asked in a hiring conversation. It is blocked before dialing, not flagged afterwards."
                    : "The script passed the prohibited-topic check. Every question is lawful, and the assistant may only state facts from the job fact sheet."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Badge tone={call.mode === "live" ? "accent" : "neutral"}>
                  {call.mode === "live" ? "Live" : "Dry run"}
                </Badge>
              </div>
            </div>

            {findings.length > 0 && (
              <ul style={{ listStyle: "none", marginTop: 16, display: "grid", gap: 9 }}>
                {findings.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 11,
                      padding: "11px 13px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--red-tint)",
                      border: "1px solid #F0D6CC",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--red-deep)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        flexShrink: 0,
                        paddingTop: 2,
                      }}
                    >
                      {f.category.replace(/_/g, " ")}
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                        “{f.matched}”
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>
                        {f.explanation}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* The questions, as a list, before the full script. */}
          <Panel>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              Questions for {candidate.name.split(" ")[0]}
            </h2>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14 }}>
              Asked in this order. The assistant may not add its own.
            </p>
            <ol style={{ display: "grid", gap: 8, paddingLeft: 0, listStyle: "none" }}>
              {call.questions.map((q) => (
                <li key={q.id} style={{ display: "flex", gap: 11 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--red)",
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {q.id}
                  </span>
                  <span style={{ fontSize: 14 }}>{q.text}</span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* The artefact that matters: the exact words. */}
          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>The script</h2>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                exactly what CALL-E will be instructed to do
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16, maxWidth: 640 }}>
              Nothing is summarised here. This is the string sent to CALL-E, so what
              you read is what the candidate hears.
            </p>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--radius-sm)",
                padding: "18px 20px",
                maxHeight: 520,
                overflowY: "auto",
              }}
            >
              <ScriptView task={call.task} findings={findings} />
            </div>
          </Panel>

          {call.needsHuman && call.needsHumanReasons.length > 0 && (
            <Panel>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                Routed to a human
              </h2>
              <ul style={{ display: "grid", gap: 6, listStyle: "none" }}>
                {call.needsHumanReasons.map((reason, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: "var(--ink-2)", display: "flex", gap: 9 }}>
                    <Icon
                      name="arrow-right"
                      size={15}
                      style={{ color: "var(--ink-3)", flexShrink: 0, marginTop: 3 }}
                    />
                    {reason}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </Page>
    </>
  );
}
