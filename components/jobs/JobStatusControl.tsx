"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { setJobStatus } from "@/app/(app)/jobs/[id]/actions";
import {
  JOB_STATUS_LABELS,
  acceptsCalls,
  closedReason,
  type JobStatus,
} from "@/lib/jobs/status";

/**
 * Open, fill, or close a posting.
 *
 * Reopening is the only transition that demands typing: it is the one where
 * something went wrong upstream — an accepted offer fell through, a headcount
 * came back — and the next person to open this job should not have to ask what.
 */
export default function JobStatusControl({
  jobId,
  status,
  statusReason,
}: {
  jobId: string;
  status: JobStatus;
  statusReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apply = (next: JobStatus, why: string) => {
    setError(null);
    startTransition(async () => {
      const outcome = await setJobStatus(jobId, next, why);
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setReopening(false);
      setReason("");
    });
  };

  if (acceptsCalls(status)) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Badge tone="good">{JOB_STATUS_LABELS[status]}</Badge>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => apply("filled", "Position filled")}
        >
          <Icon name={pending ? "clock" : "check"} size={14} />
          Mark filled
        </Button>
        {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
      </span>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Badge tone="warn" dot>
          {JOB_STATUS_LABELS[status]}
        </Badge>
        {!reopening && (
          <Button size="sm" variant="ghost" onClick={() => setReopening(true)}>
            <Icon name="plus" size={14} />
            Reopen
          </Button>
        )}
      </span>

      <p style={{ fontSize: 12, color: "var(--ink-2)", maxWidth: 320, textAlign: "right" }}>
        {closedReason(status, statusReason)}
      </p>

      {reopening && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why reopen? e.g. candidate dropped"
            style={{
              fontSize: 12.5,
              fontFamily: "inherit",
              padding: "6px 9px",
              width: 260,
              color: "var(--ink)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReopening(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={pending} onClick={() => apply("open", reason)}>
            {pending ? "Saving…" : "Reopen job"}
          </Button>
        </div>
      )}

      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
