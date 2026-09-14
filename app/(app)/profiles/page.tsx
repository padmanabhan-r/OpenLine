import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { listProfiles } from "@/lib/db/queries";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

/**
 * Every person in the system, one row each.
 *
 * A candidates row is an application, so somebody who applied to three roles is
 * three rows in the table and one row here. Which job, what they scored against
 * it, and whether they made its shortlist are job-scoped facts, and they live on
 * the profile rather than in a column that can only ever show one of them.
 */
export default async function ProfilesPage() {
  await requireOperator("/profiles");
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
        subtitle={`${rows.length} people across all jobs. Open one to see every role they applied to.`}
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
                        maxWidth: 520,
                      }}
                    >
                      {row.headline ?? "No headline on file"}
                    </div>
                  </div>

                  {/* Per-job facts live on the profile. All this row claims is
                      how many roles this person is in play for. */}
                  <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    {row.applicationCount === 1
                      ? "1 application"
                      : `${row.applicationCount} applications`}
                  </span>

                  {row.shortlistedCount > 0 && (
                    <Badge tone="good">
                      In play for {row.shortlistedCount}
                    </Badge>
                  )}

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
