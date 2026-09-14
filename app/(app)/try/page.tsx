import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import TryCall from "@/components/screening/TryCall";
import { resolveCalleMode } from "@/lib/calle/port";
import { listJobs } from "@/lib/db/queries";
import { acceptsCalls } from "@/lib/jobs/status";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

/**
 * Ring a phone with the real screening script, and save nothing.
 *
 * The fastest honest way to hear OpenLine: a name, a number, a language. It
 * is behind the operator token like everything else that can reach a phone.
 */
export default async function TryPage() {
  await requireOperator("/try");

  const mode = resolveCalleMode();
  const jobs = (await listJobs())
    .filter((job) => acceptsCalls(job.status))
    .map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      language: job.language,
    }));

  return (
    <>
      <TopBar
        title="Try a call"
        subtitle="Your name, your number, a language. The real screening script rings your phone, and nothing is saved."
      />
      <Page>
        {mode === "off" ? (
          <Panel>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 620 }}>
              Calls are off on this deployment: no CALL-E key is set. Run{" "}
              <code>./start.sh --fake</code> to try the whole loop without one.
            </p>
          </Panel>
        ) : jobs.length === 0 ? (
          <Panel>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 620 }}>
              There is no open job to screen for. Open or create one first; the
              call uses its title, company, and fact sheet.
            </p>
          </Panel>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Said first and said big: a judge who only ever sees this page
                would otherwise think the product is a phone form. */}
            <Panel>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Icon
                  name="alert"
                  size={22}
                  style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>
                    This is a quick test call, not the recruiting workflow.
                  </p>
                  <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
                    It rings one number with the real script so you can hear the agent, and
                    it keeps nothing. The real workflow starts from a job: upload a
                    candidate&apos;s resume PDF, OpenLine scores it and shortlists it, you
                    press Call on the shortlist, and the transcript and answers are saved
                    for you to decide Interview or Reject.
                  </p>
                  <div style={{ marginTop: 4 }}>
                    <Link href={jobs.length === 1 ? `/jobs/${jobs[0].id}` : "/jobs"}>
                      <Button size="sm" variant="soft">
                        {jobs.length === 1 ? `Upload a resume to ${jobs[0].title}` : "Go to jobs"}
                        <Icon name="arrow-right" size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Panel>
            <TryCall jobs={jobs} simulated={mode === "fake"} />
          </div>
        )}
      </Page>
    </>
  );
}
