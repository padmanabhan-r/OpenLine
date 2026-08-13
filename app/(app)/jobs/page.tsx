import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { listJobs } from "@/lib/db/queries";
import Button from "@/components/ui/Button";

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
        subtitle="Every shortlisted candidate gets called — without you working down the list."
        actions={
          <Link href="/jobs/new">
            <Button size="sm">New job</Button>
          </Link>
        }
      />
      <Page>
        {error && (
          <Panel>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Icon name="alert" size={20} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
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
            const unreachable = job.shortlistedCount - job.callableCount;
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <article
                  style={{
                    background: "var(--bg-glass)",
                    backdropFilter: "var(--blur)",
                    WebkitBackdropFilter: "var(--blur)",
                    border: "1px solid rgba(29,27,16,0.14)",
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
                      <Badge tone="neutral">{job.candidateCount} applied</Badge>
                      <Badge tone="info">{job.shortlistedCount} shortlisted</Badge>
                      <Badge tone="good">
                        {job.callableCount} with a phone number
                      </Badge>
                      {unreachable > 0 && (
                        <Badge tone="warn">{unreachable} missing a number</Badge>
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
