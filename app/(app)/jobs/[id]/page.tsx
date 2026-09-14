import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import JobDescription from "@/components/jobs/JobDescription";
import RowActions from "@/components/screening/RowActions";
import ResumeUpload from "@/components/candidates/ResumeUpload";
import StageDecision from "@/components/candidates/StageDecision";
import SignalChips from "@/components/screening/SignalChips";
import { getJob, listJobCandidates } from "@/lib/db/queries";
import { jobRef } from "@/lib/jobs/ref";
import { isExit, isShortlisted } from "@/lib/candidates/stage";
import JobStatusControl from "@/components/jobs/JobStatusControl";
import { acceptsCalls, closedReason } from "@/lib/jobs/status";
import { languageLabel } from "@/lib/jobs/language";
import { operatorStatus, requireOperator } from "@/lib/operator";

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
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  explanation: string;
  /** One more line under the explanation, for a number worth stating. */
  note?: React.ReactNode;
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
      {note && (
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-2)",
            marginTop: 6,
            maxWidth: 640,
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

/** Numbers in mono, as the console does everywhere. */
function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono" style={{ color: "var(--ink)" }}>
      {children}
    </span>
  );
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOperator(`/jobs/${id}`);

  const job = await getJob(id);
  if (!job) notFound();

  const applicants = await listJobCandidates(id);
  // Whether this browser may dial. The server checks again in startCall; this
  // only decides whether the button is worth offering.
  const operator = await operatorStatus();
  // Highest ATS score first: the recruiter works the list top down, so the
  // strongest fit is the first call. Unscored rows sink; ties go by name.
  const roster = applicants
    .filter((r) => isShortlisted(r.candidate.stage))
    .sort(
      (a, b) =>
        (b.candidate.matchScore ?? -1) - (a.candidate.matchScore ?? -1) ||
        a.candidate.name.localeCompare(b.candidate.name),
    );
  const pool = applicants.filter((r) => r.candidate.stage === "applied");
  // Rejected or withdrew: off the list, still on the record, one click back.
  const exited = applicants.filter((r) => isExit(r.candidate.stage));
  const callable = roster.filter((r) => r.candidate.phoneE164);
  const unreachable = roster.filter((r) => !r.candidate.phoneE164);

  return (
    <>
      <TopBar
        title={job.title}
        subtitle={`${jobRef(job.id)} · ${job.companyName} · ${applicants.length} applied · ${roster.length} shortlisted · calls in ${languageLabel(job.language)}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <JobStatusControl
              jobId={job.id}
              status={job.status}
              statusReason={job.statusReason}
            />
            <ResumeUpload jobId={job.id} />
          </div>
        }
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          {!acceptsCalls(job.status) && (
            <Panel>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Icon
                  name="alert"
                  size={19}
                  style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>
                    Calling is off for this job
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      marginTop: 5,
                      maxWidth: 620,
                    }}
                  >
                    {closedReason(job.status, job.statusReason)} Everything
                    already recorded stays readable — transcripts, results, and
                    the shortlist are all still here. Reopen the job to dial
                    again.
                  </p>
                </div>
              </div>
            </Panel>
          )}

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
              explanation="The only people OpenLine will call. Call each one, read what came back, then decide — the words the agent says are fixed and readable on Review before anything dials. Highest ATS score first."
              note={
                <>
                  {callable.length > 0 && (
                    <>
                      Screening all <Num>{callable.length}</Num> takes about{" "}
                      <Num>{callable.length * 2} minutes</Num> of machine time,
                      in parallel — a basic screen runs two minutes. By hand,
                      that is a day of dialing.
                    </>
                  )}
                  {!operator.ok && (
                    <>
                      {" "}
                      <Link href="/unlock" style={{ color: "var(--accent-deep)", fontWeight: 600 }}>
                        Unlock the console
                      </Link>{" "}
                      to place calls.
                    </>
                  )}
                </>
              }
            >
              <Badge tone="good">
                {callable.length} with a phone number
              </Badge>
              {unreachable.length > 0 && (
                <Badge tone="warn">{unreachable.length} missing a number</Badge>
              )}
            </SectionHeader>

            {roster.map(({ candidate, call }) => {
              const blocked = Boolean(
                call && (call.guardFindings.length > 0 || call.status === "refused"),
              );

              const dialDisabledReason = !operator.ok
                ? "Unlock the console to dial."
                : !acceptsCalls(job.status)
                  ? closedReason(job.status, job.statusReason)
                  : candidate.phoneE164
                    ? null
                    : "No phone number for this candidate.";

              return (
                <div
                  key={candidate.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "9px 22px",
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
                    {/* What the call found, on the row — the recruiter decides
                        from here without opening every transcript. */}
                    {call?.status === "completed" && (
                      <div style={{ marginTop: 6 }}>
                        <SignalChips
                          reachedCandidate={call.reachedCandidate}
                          interestLevel={call.interestLevel}
                          noticePeriod={call.noticePeriod}
                          needsHuman={call.needsHuman}
                        />
                      </div>
                    )}
                  </div>

                  {/* The score that put them here — arguable, so shown, and
                      named: a bare number in a queue is a guess for anyone
                      who cannot hover. One line, so the row stays one line. */}
                  <div
                    className="mono"
                    style={{
                      width: 108,
                      flexShrink: 0,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      fontSize: 11,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                    title={
                      candidate.shortlistedBy === "human"
                        ? "ATS score — a person shortlisted them anyway"
                        : "ATS score"
                    }
                  >
                    ATS score{" "}
                    {candidate.matchScore != null ? (
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          letterSpacing: 0,
                          color:
                            candidate.matchScore >= 85
                              ? "var(--accent-deep)"
                              : "var(--ink-2)",
                        }}
                      >
                        {candidate.matchScore}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, letterSpacing: 0 }}>—</span>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <StageDecision
                      jobId={job.id}
                      candidateId={candidate.id}
                      candidateName={candidate.name}
                      stage={candidate.stage}
                      shortlistedBy={candidate.shortlistedBy}
                      callCompleted={call?.status === "completed"}
                    />
                  </div>

                  {/* Grows with what it holds: a confirm naming a long first
                      name is wider than a lone Call, and a fixed width let it
                      spill over the Review link beside it. */}
                  <div
                    style={{
                      minWidth: 210,
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
                            ? {
                                id: call.id,
                                status: call.status,
                                blocked,
                                scriptVersion: call.scriptVersion,
                              }
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
                explanation="Nobody here gets a call unless a person shortlists them. The reasons are on the record because a filter nobody can see is a filter nobody can correct — and some of these reasons deserve an argument."
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
                  <StageDecision
                    jobId={job.id}
                    candidateId={candidate.id}
                    candidateName={candidate.name}
                    stage={candidate.stage}
                    shortlistedBy={candidate.shortlistedBy}
                    callCompleted={false}
                  />
                </div>
              ))}
            </Panel>
          )}

          {/* Decided against, or gone — kept in view, one click from back on. */}
          {exited.length > 0 && (
            <Panel padded={false}>
              <SectionHeader
                eyebrow="Closed"
                title="Not proceeding"
                count={exited.length}
                explanation="A person moved each of these off the list. Restore puts them back on the shortlist; nothing about their calls is lost either way."
              />

              {exited.map(({ candidate }) => (
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
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                      {candidate.headline ?? candidate.summary}
                    </div>
                  </div>
                  <StageDecision
                    jobId={job.id}
                    candidateId={candidate.id}
                    candidateName={candidate.name}
                    stage={candidate.stage}
                    shortlistedBy={candidate.shortlistedBy}
                    callCompleted={false}
                  />
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
