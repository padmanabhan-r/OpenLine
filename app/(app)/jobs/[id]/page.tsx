import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import PreviewButton from "@/components/screening/PreviewButton";
import { getJob, listJobCandidates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const REJECTION_COPY: Record<string, string> = {
  empty: "No number on file",
  unparseable: "Not a phone number",
  invalid: "Not a valid number",
  no_region: "No country code and no region",
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  const roster = await listJobCandidates(id);
  const callable = roster.filter((r) => r.candidate.phoneE164);
  const unreachable = roster.filter((r) => !r.candidate.phoneE164);
  const scripted = roster.filter((r) => r.call);

  return (
    <>
      <TopBar
        title={job.title}
        subtitle={`${job.companyName} · ${roster.length} applicants, all of them getting a call`}
        actions={<PreviewButton jobId={job.id} />}
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          {/* What the agent is allowed to say. */}
          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Job fact sheet</h2>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                the only things the assistant may state on the call
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16, maxWidth: 620 }}>
              CALL-E cannot look anything up mid-call, so every fact must be written
              into the script before dialing. Anything a candidate asks that is not
              here is handed to a human instead of guessed.
            </p>
            <dl style={{ display: "grid", gap: 10 }}>
              {job.factSheet.map((fact) => (
                <div
                  key={fact.label}
                  style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 14 }}
                >
                  <dt style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-3)" }}>
                    {fact.label}
                  </dt>
                  <dd style={{ fontSize: 13.5, color: "var(--ink)" }}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {/* The queue. */}
          <Panel padded={false}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 22px",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Queue</h2>
              <div style={{ flex: 1 }} />
              <Badge tone="good">{callable.length} callable</Badge>
              {unreachable.length > 0 && (
                <Badge tone="warn">{unreachable.length} need a human</Badge>
              )}
              {scripted.length > 0 && <Badge tone="info">{scripted.length} scripted</Badge>}
            </div>

            {roster.map(({ candidate, call }) => {
              const guardFindings = call?.guardFindings ?? [];
              const blocked = guardFindings.length > 0 || call?.status === "refused";

              return (
                <div
                  key={candidate.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 22px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <Avatar name={candidate.name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{candidate.name}</div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 480,
                      }}
                    >
                      {candidate.summary}
                    </div>
                  </div>

                  {/* Phone state — masked, since a full number never needs to be on screen. */}
                  <div style={{ width: 150, flexShrink: 0 }}>
                    {candidate.phoneE164 ? (
                      <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                        {maskPhone(candidate.phoneE164)}
                      </span>
                    ) : (
                      <Badge tone="warn">
                        {REJECTION_COPY[candidate.phoneRejection ?? ""] ?? "Unusable number"}
                      </Badge>
                    )}
                  </div>

                  <div style={{ width: 130, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
                    {!candidate.phoneE164 ? (
                      <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Not queued</span>
                    ) : blocked ? (
                      <Badge tone="danger" dot>
                        Blocked
                      </Badge>
                    ) : call ? (
                      <Badge tone="info">Script ready</Badge>
                    ) : (
                      <Badge tone="neutral">No script yet</Badge>
                    )}
                  </div>

                  <div style={{ width: 92, flexShrink: 0, textAlign: "right" }}>
                    {call ? (
                      <Link
                        href={`/calls/${call.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--red)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        Review
                        <Icon name="arrow-right" size={14} />
                      </Link>
                    ) : (
                      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </Panel>

          {unreachable.length > 0 && (
            <Panel>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Icon
                  name="alert"
                  size={19}
                  style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>
                    {unreachable.length} applicant{unreachable.length === 1 ? "" : "s"} could not be
                    dialled
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      marginTop: 5,
                      maxWidth: 620,
                    }}
                  >
                    Their numbers could not be resolved without guessing, and guessing
                    would dial a stranger who never applied. They stay in the queue,
                    visible, waiting for someone to correct the number — rather than
                    quietly disappearing.
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </Page>
    </>
  );
}

/** Show enough to recognise the number, never the whole thing. */
function maskPhone(e164: string) {
  return `${e164.slice(0, 3)}•••••${e164.slice(-4)}`;
}
