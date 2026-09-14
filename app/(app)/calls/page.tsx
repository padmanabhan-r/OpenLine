import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import SignalChips from "@/components/screening/SignalChips";
import { listCalls } from "@/lib/db/queries";
import { reconcileStaleCalls } from "@/lib/screening/reconcile";
import type { ScreeningCall } from "@/lib/db/schema";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

/** One badge that tells the truth about where a call is in its life. */
function StatusBadge({ call }: { call: ScreeningCall }) {
  if (call.guardFindings.length > 0 && call.status !== "completed") {
    return (
      <Badge tone="danger" dot>
        Blocked
      </Badge>
    );
  }
  switch (call.status) {
    case "dialing":
      return (
        <Badge tone="info" dot>
          On the line
        </Badge>
      );
    case "completed":
      return <Badge tone="good">Completed</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    case "refused":
      return (
        <Badge tone="danger" dot>
          Refused
        </Badge>
      );
    default:
      return <Badge tone="neutral">Script ready</Badge>;
  }
}

export default async function CallsPage() {
  await requireOperator("/calls");
  let rows: Awaited<ReturnType<typeof listCalls>> = [];
  let error: string | null = null;

  try {
    // Rescue any row whose detached waiter died with a restart, so the list
    // never shows a call as "on the line" that ended twenty minutes ago.
    await reconcileStaleCalls();
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
              Open a job and build a script for someone on the shortlist. Every
              candidate gets a script you can read before anything dials.
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
                color: "var(--accent)",
              }}
            >
              Go to jobs <Icon name="arrow-right" size={15} />
            </Link>
          </Panel>
        )}

        {rows.length > 0 && (
          <Panel padded={false}>
            {rows.map(({ call, candidateName, jobTitle }) => (
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
                  <SignalChips
                    reachedCandidate={call.structuredResult?.reached_candidate}
                    interestLevel={call.structuredResult?.interest_level}
                    noticePeriod={call.structuredResult?.notice_period}
                    needsHuman={call.needsHuman && call.status === "completed"}
                  />
                  <StatusBadge call={call} />
                  <Icon name="arrow-right" size={17} style={{ color: "var(--ink-3)" }} />
                </div>
              </Link>
            ))}
          </Panel>
        )}
      </Page>
    </>
  );
}
