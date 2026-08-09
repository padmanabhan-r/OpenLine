import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { listJobs } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let error: string | null = null;

  try {
    jobs = await listJobs();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load jobs.";
  }

  return (
    <>
      <TopBar
        title="Jobs"
        subtitle="Every applicant on a job gets a call, not just the shortlist."
      />
      <Page>
        {error && (
          <Panel>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Icon name="alert" size={20} style={{ color: "var(--red)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600 }}>Could not load jobs</p>
                <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 4 }}>{error}</p>
                <p style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 8 }}>
                  Check DATABASE_URL in <code className="mono">.env</code>, then run{" "}
                  <code className="mono">pnpm run db:migrate &amp;&amp; pnpm run db:seed</code>.
                </p>
              </div>
            </div>
          </Panel>
        )}

        {!error && jobs.length === 0 && (
          <Panel>
            <p style={{ fontWeight: 600 }}>No jobs yet</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 6 }}>
              Run <code className="mono">pnpm run db:seed</code> to load the demo job and roster.
            </p>
          </Panel>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {jobs.map((job) => {
            const unreachable = job.candidateCount - job.callableCount;
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <article
                  style={{
                    background: "var(--bg-glass)",
                    backdropFilter: "var(--blur)",
                    WebkitBackdropFilter: "var(--blur)",
                    border: "1px solid rgba(50,30,5,0.10)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--glass-edge)",
                    padding: "20px 22px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="eyebrow muted" style={{ marginBottom: 6 }}>
                      {job.companyName}
                    </div>
                    <h2
                      style={{
                        fontSize: 19,
                        fontWeight: 700,
                        letterSpacing: "-.02em",
                        marginBottom: 8,
                      }}
                    >
                      {job.title}
                    </h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge tone="neutral">{job.candidateCount} applicants</Badge>
                      <Badge tone="good">{job.callableCount} callable</Badge>
                      {unreachable > 0 && (
                        <Badge tone="warn">{unreachable} need a human</Badge>
                      )}
                      {job.callCount > 0 && (
                        <Badge tone="info">{job.callCount} scripted</Badge>
                      )}
                    </div>
                  </div>
                  <Icon
                    name="arrow-right"
                    size={20}
                    style={{ color: "var(--ink-3)", flexShrink: 0 }}
                  />
                </article>
              </Link>
            );
          })}
        </div>
      </Page>
    </>
  );
}
