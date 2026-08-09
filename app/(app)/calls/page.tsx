import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { listCalls } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  let rows: Awaited<ReturnType<typeof listCalls>> = [];
  let error: string | null = null;

  try {
    rows = await listCalls();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load calls.";
  }

  return (
    <>
      <TopBar
        title="Screening Calls"
        subtitle="Every script, before and after it is spoken."
      />
      <Page>
        {error && (
          <Panel>
            <p style={{ fontWeight: 600 }}>Could not load calls</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 5 }}>{error}</p>
          </Panel>
        )}

        {!error && rows.length === 0 && (
          <Panel>
            <p style={{ fontWeight: 600 }}>No scripts yet</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6, maxWidth: 560 }}>
              Open a job and choose <strong>Build call scripts</strong>. Every applicant
              with a usable number gets a script you can read before anything dials.
            </p>
            <Link
              href="/jobs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 14,
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--red)",
              }}
            >
              Go to jobs <Icon name="arrow-right" size={15} />
            </Link>
          </Panel>
        )}

        {rows.length > 0 && (
          <Panel padded={false}>
            {rows.map(({ call, candidateName, jobTitle }) => {
              const blocked = call.guardFindings.length > 0 || call.status === "refused";
              return (
                <Link key={call.id} href={`/calls/${call.id}`}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 22px",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    <Avatar name={candidateName} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{candidateName}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                        {jobTitle}
                      </div>
                    </div>
                    <Badge tone={call.mode === "live" ? "accent" : "neutral"}>
                      {call.mode === "live" ? "Live" : "Dry run"}
                    </Badge>
                    {blocked ? (
                      <Badge tone="danger" dot>
                        Blocked
                      </Badge>
                    ) : (
                      <Badge tone="info">Script ready</Badge>
                    )}
                    <Icon name="arrow-right" size={17} style={{ color: "var(--ink-3)" }} />
                  </div>
                </Link>
              );
            })}
          </Panel>
        )}
      </Page>
    </>
  );
}
