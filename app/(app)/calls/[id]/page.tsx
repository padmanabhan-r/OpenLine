import Link from "next/link";
import { callAllowlist, liveCallsEnabled } from "@/lib/config";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import ScriptView from "@/components/screening/ScriptView";
import CallButton from "@/components/screening/CallButton";
import CallResult from "@/components/screening/CallResult";
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

  const liveEnabled = liveCallsEnabled();
  const allowlist = callAllowlist();
  const allowlisted = Boolean(
    candidate.phoneE164 && allowlist.includes(candidate.phoneE164),
  );
  const alreadyCalled = Boolean(call.calleCallId);
  const result = call.structuredResult;

  const cannotCall = blocked
    ? "The script is blocked, so it cannot dial."
    : alreadyCalled
      ? "This candidate has already been called."
      : !candidate.phoneE164
        ? "This candidate has no callable number."
        : !liveEnabled
          ? "Dry run — set OPENLINE_LIVE_CALLS=true to dial."
          : !allowlisted
            ? "This number is not on the call allowlist."
            : null;

  return (
    <>
      <TopBar
        title={candidate.name}
        subtitle={`${job.title} · ${job.companyName}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <CallButton
              screeningCallId={call.id}
              candidateName={candidate.name}
              disabled={Boolean(cannotCall)}
              {...(cannotCall ? { disabledReason: cannotCall } : {})}
            />
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
          </div>
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
                  color: blocked ? "var(--danger)" : "var(--green)",
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
                <Badge tone={call.mode === "live" ? "danger" : "neutral"}>
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
                      background: "var(--danger-wash)",
                      border: "1px solid #E5BEA8",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--danger-deep)",
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

          {/* Once the call has happened, its outcome leads. */}
          {result && (
            <Panel>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>What came back</h2>
                {call.completionConfidence && (
                  <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                    CALL-E confidence: {call.completionConfidence.label} (
                    {call.completionConfidence.score})
                  </span>
                )}
              </div>
              <CallResult result={result} questions={call.questions} />
            </Panel>
          )}

          {alreadyCalled && !result && call.status !== "dialing" && (
            <Panel>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Icon
                  name="alert"
                  size={19}
                  style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>
                    The call happened, but no structured result came back
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      marginTop: 5,
                      maxWidth: 620,
                    }}
                  >
                    CALL-E returns nothing rather than inventing an answer it
                    cannot ground in the transcript. Read the transcript below
                    and record the outcome yourself.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {/* The transcript, once there is one. */}
          {call.transcript.length > 0 && (
            <Panel>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Transcript</h2>
                <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                  what was actually said
                </span>
              </div>
              <div style={{ display: "grid", gap: 10, maxHeight: 520, overflowY: "auto" }}>
                {call.transcript.map((turn, i) => {
                  const isAgent = turn.speaker === "bot";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isAgent ? "flex-start" : "flex-end",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "76%",
                          padding: "10px 14px",
                          borderRadius: 14,
                          background: isAgent
                            ? "var(--surface-2)"
                            : "var(--accent-tint)",
                          border: `1px solid ${isAgent ? "var(--line-2)" : "#B9DFD6"}`,
                        }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            color: "var(--ink-3)",
                            marginBottom: 4,
                          }}
                        >
                          {isAgent ? "OpenLine" : candidate.name.split(" ")[0]}
                          {turn.offsetSeconds !== null &&
                            ` · ${Math.floor(turn.offsetSeconds / 60)}:${String(
                              turn.offsetSeconds % 60,
                            ).padStart(2, "0")}`}
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                          {turn.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

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
                      color: "var(--accent)",
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
