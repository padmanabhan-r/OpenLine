import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import JobDescription from "@/components/jobs/JobDescription";
import RowActions from "@/components/screening/RowActions";
import { getJob, listJobCandidates } from "@/lib/db/queries";
import { callAllowlist, liveCallsEnabled } from "@/lib/config";

export const dynamic = "force-dynamic";

const REJECTION_COPY: Record<string, string> = {
  empty: "No number on file",
  unparseable: "Not a phone number",
  invalid: "Not a valid number",
  no_region: "No country code and no region",
};

/**
 * The shared header treatment for the two applicant sections. The eyebrow is
 * the machine's word for the section; the sentence underneath is the human
 * explanation of what belonging to it means.
 */
function SectionHeader({
  eyebrow,
  title,
  count,
  explanation,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  explanation: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface-2)",
        borderRadius: "var(--radius) var(--radius) 0 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="eyebrow" style={{ color: "var(--accent-deep)" }}>
          {eyebrow}
        </span>
        <div style={{ flex: 1 }} />
        {children}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginTop: 6,
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>
          {title}
        </h2>
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            padding: "2px 9px",
            borderRadius: "var(--radius-pill)",
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            color: "var(--ink-2)",
          }}
        >
          {count}
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-3)",
          marginTop: 5,
          maxWidth: 640,
        }}
      >
        {explanation}
      </p>
    </div>
  );
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  const applicants = await listJobCandidates(id);
  const roster = applicants.filter((r) => r.candidate.shortlisted);
  const pool = applicants.filter((r) => !r.candidate.shortlisted);
  const callable = roster.filter((r) => r.candidate.phoneE164);
  const unreachable = roster.filter((r) => !r.candidate.phoneE164);

  const liveEnabled = liveCallsEnabled();
  const allowlist = callAllowlist();

  return (
    <>
      <TopBar
        title={job.title}
        subtitle={`${job.companyName} · ${applicants.length} applied · ${roster.length} shortlisted`}
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          {/* The posting, as a candidate would read it. */}
          <Panel>
            <JobDescription description={job.description} />
          </Panel>

          {/* The shortlist — the people whose phones will ring. */}
          <Panel padded={false}>
            <SectionHeader
              eyebrow="The queue"
              title="Shortlisted"
              count={roster.length}
              explanation="The only people OpenLine will call. Build each script, read it, then place the call — nothing dials without a human having seen the words first."
            >
              <Badge tone="good">{callable.length} callable</Badge>
              {unreachable.length > 0 && (
                <Badge tone="warn">{unreachable.length} need a human</Badge>
              )}
            </SectionHeader>

            {roster.map(({ candidate, call }) => {
              const blocked = Boolean(
                call && (call.guardFindings.length > 0 || call.status === "refused"),
              );

              const dialDisabledReason = !candidate.phoneE164
                ? "No callable number."
                : !liveEnabled
                  ? "Dry run — set OPENLINE_LIVE_CALLS=true to dial."
                  : !allowlist.includes(candidate.phoneE164)
                    ? "This number is not on the call allowlist."
                    : null;

              return (
                <div
                  key={candidate.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 22px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <Avatar name={candidate.name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/candidates/${candidate.id}`}
                      style={{ fontSize: 14.5, fontWeight: 600 }}
                    >
                      {candidate.name}
                    </Link>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 440,
                      }}
                    >
                      {candidate.headline
                        ? `${candidate.headline} · ${candidate.yearsOfExperience} yrs`
                        : candidate.summary}
                    </div>
                  </div>

                  {/* The score that put them here — arguable, so shown. */}
                  <div style={{ width: 64, flexShrink: 0, textAlign: "right" }}>
                    {candidate.matchScore != null ? (
                      <span
                        className="mono"
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color:
                            candidate.matchScore >= 85
                              ? "var(--accent-deep)"
                              : "var(--ink-2)",
                        }}
                        title="ATS match score"
                      >
                        {candidate.matchScore}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>—</span>
                    )}
                  </div>

                  <div
                    style={{
                      width: 210,
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {!candidate.phoneE164 ? (
                      <Badge tone="warn">
                        {REJECTION_COPY[candidate.phoneRejection ?? ""] ??
                          "Unusable number"}
                      </Badge>
                    ) : (
                      <RowActions
                        jobId={job.id}
                        candidateId={candidate.id}
                        candidateName={candidate.name}
                        call={
                          call
                            ? { id: call.id, status: call.status, blocked }
                            : null
                        }
                        dialDisabledReason={dialDisabledReason}
                      />
                    )}
                  </div>

                  <div style={{ width: 82, flexShrink: 0, textAlign: "right" }}>
                    {call ? (
                      <Link
                        href={`/calls/${call.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--accent)",
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

          {/* Everyone the shortlist left out, with the reason, in the open. */}
          {pool.length > 0 && (
            <Panel padded={false}>
              <SectionHeader
                eyebrow="The rest of the pool"
                title="Not shortlisted"
                count={pool.length}
                explanation="No call is scripted for these applicants. The reasons are on the record because a filter nobody can see is a filter nobody can correct — and some of these reasons deserve an argument."
              />

              {pool.map(({ candidate }) => (
                <div
                  key={candidate.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 22px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/candidates/${candidate.id}`}
                      style={{ fontSize: 13.5, fontWeight: 600 }}
                    >
                      {candidate.name}
                    </Link>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        maxWidth: 620,
                      }}
                    >
                      {candidate.note}
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}
                  >
                    {candidate.matchScore ?? "—"}
                  </span>
                </div>
              ))}
            </Panel>
          )}

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
                    {unreachable.length} candidate{unreachable.length === 1 ? "" : "s"} could not be
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
                    would dial a stranger. They stay on the list, visible, waiting for
                    someone to correct the number — which is exactly how people fall
                    off a shortlist when it is worked by hand.
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
