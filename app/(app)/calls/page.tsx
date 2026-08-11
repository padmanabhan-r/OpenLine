import Link from "next/link";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { listCalls } from "@/lib/db/queries";
import { reconcileStaleCalls } from "@/lib/screening/reconcile";
import type { ScreeningCall } from "@/lib/db/schema";

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

/**
 * What the call actually established, at a glance.
 *
 * These chips exist so the index answers "is this person worth my attention"
 * without opening the transcript.
 */
function SignalChips({ call }: { call: ScreeningCall }) {
  const result = call.structuredResult;
  if (!result) return null;

  const chips: Array<{ label: string; tone: "good" | "warn" | "info" | "neutral" }> = [];

  if (result.reached_candidate && result.reached_candidate !== "yes") {
    chips.push({ label: result.reached_candidate.replace("_", " "), tone: "warn" });
  }
  if (result.interest_level) {
    chips.push({
      label: `interest: ${result.interest_level.replace("_", " ")}`,
      tone:
        result.interest_level === "high"
          ? "good"
          : result.interest_level === "low"
            ? "warn"
            : "info",
    });
  }
  if (result.notice_period) {
    chips.push({ label: result.notice_period, tone: "neutral" });
  }

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {chips.slice(0, 3).map((chip) => (
        <Badge key={chip.label} tone={chip.tone}>
          {chip.label}
        </Badge>
      ))}
    </span>
  );
}

export default async function CallsPage() {
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
                  <SignalChips call={call} />
                  {call.needsHuman && call.status === "completed" && (
                    <Badge tone="warn" dot>
                      Needs you
                    </Badge>
                  )}
                  <Badge tone={call.mode === "live" ? "danger" : "neutral"}>
                    {call.mode === "live" ? "Live" : "Dry run"}
                  </Badge>
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
