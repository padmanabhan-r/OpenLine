import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { getCandidate } from "@/lib/db/queries";
import {
  daysSinceActive,
  reachabilityWarnings,
  type CandidateProfile,
} from "@/lib/candidates/profile";

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

  const row = await getCandidate(id);
  if (!row) notFound();

  const { candidate, job, calls } = row;
  const record = candidate.profile;

  return (
    <>
      <TopBar
        title={candidate.name}
        subtitle={`Applied for ${job.title} at ${job.companyName}`}
        actions={
          <Link
            href={`/jobs/${job.id}`}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}
          >
            Back to shortlist
          </Link>
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
                    {call.mode === "live" ? "Live call" : "Dry run"} ·{" "}
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
            <Badge tone="info">ATS match {screening.matchScore}</Badge>
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

/** All 23 platform signals, unabridged — or an honest absence. */
function Signals({ candidate }: { candidate: CandidateProfile }) {
  const s = candidate.signals;
  if (!s) {
    return (
      <Panel>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Platform signals</h2>
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

  const rows: Array<[string, string]> = [
    ["Profile completeness", `${s.profileCompletenessScore}%`],
    ["Signed up", s.signupDate],
    ["Last active", `${s.lastActiveDate} (${idle} days ago)`],
    ["Open to work", s.openToWorkFlag ? "Yes" : "No"],
    ["Profile views, 30d", `${s.profileViewsReceived30d}`],
    ["Applications, 30d", `${s.applicationsSubmitted30d}`],
    ["Recruiter response rate", `${Math.round(s.recruiterResponseRate * 100)}%`],
    ["Median response time", `${s.avgResponseTimeHours} hours`],
    [
      "Assessment scores",
      Object.entries(s.skillAssessmentScores)
        .map(([name, score]) => `${name} ${score}`)
        .join(", ") || "None taken",
    ],
    ["Connections", `${s.connectionCount}`],
    ["Endorsements received", `${s.endorsementsReceived}`],
    ["Notice period", `${s.noticePeriodDays} days`],
    [
      "Salary expectation",
      `₹${s.expectedSalaryRangeInrLpa.min}–${s.expectedSalaryRangeInrLpa.max} LPA`,
    ],
    ["Preferred work mode", s.preferredWorkMode],
    ["Willing to relocate", s.willingToRelocate ? "Yes" : "No"],
    [
      "GitHub activity",
      s.githubActivityScore < 0 ? "No GitHub linked" : `${s.githubActivityScore}/100`,
    ],
    ["Search appearances, 30d", `${s.searchAppearance30d}`],
    ["Saved by recruiters, 30d", `${s.savedByRecruiters30d}`],
    [
      "Interview completion",
      `${Math.round(s.interviewCompletionRate * 100)}%`,
    ],
    [
      "Offer acceptance",
      s.offerAcceptanceRate < 0
        ? "No offer history"
        : `${Math.round(s.offerAcceptanceRate * 100)}%`,
    ],
    ["Email verified", s.verifiedEmail ? "Yes" : "No"],
    ["Phone verified", s.verifiedPhone ? "Yes" : "No"],
    ["LinkedIn connected", s.linkedinConnected ? "Yes" : "No"],
  ];

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Platform signals</h2>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          how this person behaves, not what they claim
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
        None of these feed the call script. They are shown so a recruiter reading
        a poor call outcome can tell the difference between a candidate who was
        not interested and one who was never reachable in the first place.
      </p>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "8px 24px",
        }}
      >
        {rows.map(([label, value]) => (
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
            <dt style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{label}</dt>
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
    </Panel>
  );
}
