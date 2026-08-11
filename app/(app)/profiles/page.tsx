import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { listProfiles } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * Every candidate in the system, across jobs — imported and uploaded alike.
 * The job page answers "who will we call for this role"; this page answers
 * "what do we know about everyone who has ever applied".
 */
export default async function ProfilesPage() {
  let rows: Awaited<ReturnType<typeof listProfiles>> = [];
  let error: string | null = null;

  try {
    rows = await listProfiles();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load profiles.";
  }

  return (
    <>
      <TopBar
        title="Profiles"
        subtitle={`${rows.length} candidates across all jobs — parsed, scored, and on the record.`}
      />
      <Page>
        {error && (
          <Panel>
            <p style={{ fontWeight: 600 }}>Could not load profiles</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 5 }}>{error}</p>
          </Panel>
        )}

        {!error && rows.length === 0 && (
          <Panel>
            <p style={{ fontWeight: 600 }}>No profiles yet</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6, maxWidth: 560 }}>
              Open a job and upload resume PDFs — each becomes a profile, scored
              against the posting. Or run <code className="mono">pnpm run db:seed</code>{" "}
              for the demo roster.
            </p>
          </Panel>
        )}

        {rows.length > 0 && (
          <Panel padded={false}>
            {rows.map((row) => (
              <Link key={row.id} href={`/candidates/${row.id}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 22px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <Avatar name={row.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{row.name}</div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 460,
                      }}
                    >
                      {row.headline ?? row.jobTitle}
                    </div>
                  </div>

                  <Badge tone={row.source === "resume" ? "info" : "neutral"}>
                    {row.source === "resume" ? "Uploaded" : "Imported"}
                  </Badge>

                  {row.parseStatus === "parse_failed" && (
                    <Badge tone="danger" dot>
                      Parse failed
                    </Badge>
                  )}

                  {row.shortlisted && <Badge tone="good">Shortlisted</Badge>}

                  <span
                    className="mono"
                    style={{
                      width: 34,
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--ink-2)",
                    }}
                    title="ATS match score"
                  >
                    {row.matchScore ?? "—"}
                  </span>

                  <Icon name="arrow-right" size={16} style={{ color: "var(--ink-3)" }} />
                </div>
              </Link>
            ))}
          </Panel>
        )}
      </Page>
    </>
  );
}
