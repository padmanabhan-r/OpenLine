import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import StageDecision from "@/components/candidates/StageDecision";
import RowActions from "@/components/screening/RowActions";
import ConfirmDelete from "@/components/ui/ConfirmDelete";
import { deleteProfile } from "@/app/(app)/profiles/actions";
import { isShortlisted } from "@/lib/candidates/stage";
import { acceptsCalls, closedReason } from "@/lib/jobs/status";
import { getCandidate, listApplicationsForCandidate, listJobs } from "@/lib/db/queries";
import AddToJob from "@/components/candidates/AddToJob";
import { jobRef } from "@/lib/jobs/ref";
import {
  daysSinceActive,
  reachabilityWarnings,
  type CandidateProfile,
} from "@/lib/candidates/profile";
import { operatorStatus, requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

/**
 * Everything the shortlist was made from, on one page.
 *
 * The order is deliberate: the recruiter's decision and its reason come first,
 * then the evidence, then the platform signals. A reviewer should meet the
 * judgement before the numbers that were used to justify it, because a score
 * read first tends to become the conclusion the rest is fitted to.
 */
export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOperator(`/candidates/${id}`);

  const row = await getCandidate(id);
  if (!row) notFound();

  // Every role this person is in play for — the job-scoped facts that used to
  // sit in the profiles list, where only one of them could ever be shown.
  const [applications, allJobs] = await Promise.all([
    listApplicationsForCandidate(id),
    listJobs(),
  ]);

  const { candidate, job, calls } = row;
  const otherJobs = allJobs.filter((j) => !applications.some((a) => a.jobId === j.id));
  const record = candidate.profile;

  // The same one control as the shortlist row, so a recruiter reading the
  // profile can call from here. When they cannot, the reason is on screen.
  const operator = await operatorStatus();
  const latestCall = calls[0] ?? null;
  const dialDisabledReason = !operator.ok
    ? "Unlock the console to dial."
    : !acceptsCalls(job.status)
      ? closedReason(job.status, job.statusReason)
      : !isShortlisted(candidate.stage)
        ? "Shortlist them first. Only the shortlist is called."
        : candidate.phoneE164
          ? null
          : "No usable phone number on file.";

  return (
    <>
      <TopBar
        title={candidate.name}
        subtitle={`Applied for ${job.title} at ${job.companyName}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <RowActions
              jobId={job.id}
              candidateId={candidate.id}
              candidateName={candidate.name}
              call={
                latestCall
                  ? {
                      id: latestCall.id,
                      status: latestCall.status,
                      blocked:
                        latestCall.guardFindings.length > 0 ||
                        latestCall.status === "refused",
                      scriptVersion: latestCall.scriptVersion,
                    }
                  : null
              }
              dialDisabledReason={dialDisabledReason}
            />
            {latestCall && (
              <Link
                href={`/calls/${latestCall.id}`}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}
              >
                Review call
              </Link>
            )}
            <Link
              href={`/jobs/${job.id}`}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
            >
              Back to shortlist
            </Link>
            <ConfirmDelete
              label="Delete"
              confirmLabel={`Delete ${candidate.name.split(" ")[0]}`}
              consequence={`Removes ${applications.length === 1 ? "their application" : `all ${applications.length} applications`}, calls and resume.`}
              action={deleteProfile.bind(null, candidate.id)}
            />
          </div>
        }
      />
      <Page>
        <div style={{ display: "grid", gap: 16 }}>
          {!record ? (
            <Panel>
              <p style={{ fontWeight: 600 }}>No profile on file</p>
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6 }}>
                This candidate was imported without a structured profile. The
                screening script falls back to the one-line summary:{" "}
                {candidate.summary ?? "none recorded."}
              </p>
            </Panel>
          ) : (
            <>
              <Decision candidate={record} name={candidate.name} />
              <Background candidate={record} />
              <Signals candidate={record} />
            </>
          )}

          <Applications
            candidateName={candidate.name}
            applications={applications}
            currentCandidateId={candidate.id}
            addToJob={
              <AddToJob
                candidateId={candidate.id}
                jobs={otherJobs}
                hasResume={Boolean(candidate.resumeKey) && candidate.parseStatus === "parsed"}
              />
            }
          />

          {calls.length > 0 && (
            <Panel padded={false}>
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--line-2)",
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Screening calls</h2>
              </div>
              {calls.map((call) => (
                <div
                  key={call.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 22px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <Badge tone={call.status === "refused" ? "danger" : "info"}>
                    {call.status}
                  </Badge>
                  <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    {call.questions.length} questions
                  </span>
                  <div style={{ flex: 1 }} />
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
                </div>
              ))}
            </Panel>
          )}
        </div>
      </Page>
    </>
  );
}

/**
 * Every role this person applied to, and the decision for each.
 *
 * The shortlist is per job, so the control is too: someone can be right for one
 * posting and wrong for the next, and the toggle says which of the two a human
 * decided rather than leaving it indistinguishable from the ATS's ranking.
 */
function Applications({
  applications,
  currentCandidateId,
  candidateName,
  addToJob,
}: {
  applications: Awaited<ReturnType<typeof listApplicationsForCandidate>>;
  currentCandidateId: string;
  candidateName: string;
  addToJob: ReactNode;
}) {
  if (applications.length === 0) return null;

  return (
    <Panel padded={false}>
      <div
        style={{
          padding: "16px 22px",
          borderBottom: "1px solid var(--line-2)",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>
            Applications{" "}
            <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>
              ({applications.length})
            </span>
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>
            Shortlisting is per job. The score is the ATS ranking against that
            posting; you can overrule it either way.
          </p>
        </div>
        {addToJob}
      </div>

      {applications.map((app) => (
        <div
          key={app.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 22px",
            borderBottom: "1px solid var(--line-2)",
            background:
              app.id === currentCandidateId ? "var(--surface-2)" : undefined,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              href={`/jobs/${app.jobId}`}
              style={{ fontSize: 13.5, fontWeight: 600 }}
            >
              {app.jobTitle}
            </Link>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              <span className="mono">{jobRef(app.jobId)}</span> · {app.companyName}{" "}
              · {app.source === "resume" ? "resume upload" : "from the ATS"}
            </div>
          </div>

          <span
            className="mono"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}
            title="ATS score against this job"
          >
            {app.matchScore ?? "—"}
          </span>

          <StageDecision
            jobId={app.jobId}
            candidateId={app.id}
            candidateName={candidateName}
            stage={app.stage}
            shortlistedBy={app.shortlistedBy}
            callCompleted
/>
        </div>
      ))}
    </Panel>
  );
}

function Decision({
  candidate,
  name,
}: {
  candidate: CandidateProfile;
  name: string;
}) {
  const { screening, profile, signals } = candidate;
  const warnings = signals ? reachabilityWarnings(signals) : [];

  return (
    <Panel>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Avatar name={name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{profile.headline}</h2>
            {screening.shortlisted ? (
              <Badge tone="good">Shortlisted</Badge>
            ) : (
              <Badge tone="neutral">Not shortlisted</Badge>
            )}
            {screening.matchScore != null ? (
              <Badge tone="info">ATS score {screening.matchScore}</Badge>
            ) : (
              <Badge tone="neutral">Not scored for this job</Badge>
            )}
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-2)",
              marginTop: 8,
              maxWidth: 680,
            }}
          >
            <strong>Recruiter&rsquo;s note:</strong> {screening.note}
          </p>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8 }}>
            {profile.currentTitle} at {profile.currentCompany} ·{" "}
            {profile.location}, {profile.country} · {profile.yearsOfExperience}{" "}
            years · applied {screening.appliedDate}
          </p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--line-2)",
          }}
        >
          <Icon
            name="alert"
            size={17}
            style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600 }}>
              Signals that predict an unanswered phone
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                marginTop: 4,
                maxWidth: 620,
              }}
            >
              {warnings.join(" · ")}. This changes nothing about whether the call
              is placed — it is here so an unanswered call is not mistaken for
              disinterest.
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Background({ candidate }: { candidate: CandidateProfile }) {
  const { profile, careerHistory, education, skills, certifications, languages } =
    candidate;

  return (
    <Panel>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
        Background
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: "var(--ink-2)",
          maxWidth: 680,
          marginBottom: 20,
        }}
      >
        {profile.summary}
      </p>

      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
        Career history
      </h3>
      <div style={{ display: "grid", gap: 16, marginBottom: 22 }}>
        {careerHistory.map((entry) => (
          <div key={`${entry.company}-${entry.startDate}`}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{entry.title}</span>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                {entry.company} · {entry.industry} · {entry.companySize} staff
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}
            >
              {entry.startDate.slice(0, 7)} –{" "}
              {entry.endDate ? entry.endDate.slice(0, 7) : "present"} ·{" "}
              {Math.round((entry.durationMonths / 12) * 10) / 10} yrs
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-2)",
                marginTop: 5,
                maxWidth: 680,
              }}
            >
              {entry.description}
            </p>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Skills</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 22,
        }}
      >
        {skills.map((skill) => (
          <span
            key={skill.name}
            style={{
              fontSize: 12,
              border: "1px solid var(--line-2)",
              borderRadius: 999,
              padding: "3px 10px",
              color: "var(--ink-2)",
            }}
            title={`${skill.durationMonths} months · ${skill.endorsements} endorsements`}
          >
            {skill.name}
            <span style={{ color: "var(--ink-3)" }}> · {skill.proficiency}</span>
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Education
          </h3>
          {education.map((entry) => (
            <div key={`${entry.institution}-${entry.endYear}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {entry.degree}, {entry.fieldOfStudy}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                {entry.institution} · {entry.startYear}–{entry.endYear}
                {entry.grade ? ` · ${entry.grade}` : ""}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Certifications and languages
          </h3>
          {certifications.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              No certifications listed
            </div>
          ) : (
            certifications.map((entry) => (
              <div key={entry.name} style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                {entry.name} — {entry.issuer}, {entry.year}
              </div>
            ))
          )}
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8 }}>
            {languages
              .map((entry) => `${entry.language} (${entry.proficiency})`)
              .join(" · ")}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** The eight signals worth a recruiter's eye — or an honest absence. */
function Signals({ candidate }: { candidate: CandidateProfile }) {
  const s = candidate.signals;
  if (!s) {
    return (
      <Panel>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Candidate activity</h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            marginTop: 6,
            maxWidth: 660,
          }}
        >
          None. This profile came from an uploaded resume, and a PDF says
          nothing about how someone behaves on a hiring platform. OpenLine
          shows the absence rather than inventing plausible numbers.
        </p>
      </Panel>
    );
  }
  const idle = daysSinceActive(s);

  /*
   * Eight of the twenty-three signals are shown. A field earns its row by
   * driving `reachabilityWarnings`, by feeding the script, or by being
   * something the call itself asks — so the recruiter can hold the claim next
   * to the answer. Connection counts and search appearances change nothing a
   * recruiter does with a call outcome, so they stay in the record and off
   * the screen.
   */
  const groups: Array<{ heading: string; rows: Array<[string, string]> }> = [
    {
      heading: "Can we reach them",
      rows: [
        ["Last active", `${s.lastActiveDate} (${idle} days ago)`],
        [
          "Recruiter response rate",
          `${Math.round(s.recruiterResponseRate * 100)}%`,
        ],
        [
          "Interview completion",
          `${Math.round(s.interviewCompletionRate * 100)}%`,
        ],
        ["Open to work", s.openToWorkFlag ? "Yes" : "No"],
        ["Phone verified", s.verifiedPhone ? "Yes" : "No"],
      ],
    },
    {
      heading: "What they have told the platform",
      rows: [
        ["Notice period", `${s.noticePeriodDays} days`],
        ["Preferred work mode", s.preferredWorkMode],
        [
          "Salary expectation",
          // A profile stored before salaries moved to USD has no such field.
          s.expectedSalaryRangeUsdK
            ? `$${s.expectedSalaryRangeUsdK.min}k–$${s.expectedSalaryRangeUsdK.max}k a year`
            : "Not stated",
        ],
      ],
    },
  ];

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Candidate activity</h2>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          how this person has behaved on the hiring platform
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-3)",
          marginTop: 6,
          marginBottom: 16,
          maxWidth: 660,
        }}
      >
        Shown so a recruiter reading a poor call outcome can tell a candidate who
        was not interested from one who was never reachable. Notice period and
        work mode also ground the script; the rest of the record does not.
      </p>

      <div style={{ display: "grid", gap: 20 }}>
        {groups.map((group) => (
          <div key={group.heading}>
            <h3
              className="eyebrow muted"
              style={{ fontSize: 11, marginBottom: 9 }}
            >
              {group.heading}
            </h3>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "8px 24px",
              }}
            >
              {group.rows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: "1px solid var(--line-2)",
                    paddingBottom: 5,
                  }}
                >
                  <dt style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                    {label}
                  </dt>
                  <dd
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink)",
                      textAlign: "right",
                      minWidth: 0,
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  );
}
