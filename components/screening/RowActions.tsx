"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { buildScriptFor, callFromRow } from "@/app/(app)/jobs/[id]/actions";

/**
 * The per-row controls on the shortlist: build the script, then place the call.
 *
 * Calling keeps the two-step confirm even at this size — this is still the
 * control that spends money and rings a person, and a smaller button is not
 * a smaller consequence.
 */
export default function RowActions({
  jobId,
  candidateId,
  candidateName,
  call,
  dialDisabledReason,
}: {
  jobId: string;
  candidateId: string;
  candidateName: string;
  call: { id: string; status: string; blocked: boolean } | null;
  /** Why the call button is disabled, or null when it may dial. */
  dialDisabledReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = candidateName.split(" ")[0];

  // Terminal states carry no buttons — the Review link next to this does.
  if (call?.status === "dialing") {
    return (
      <Badge tone="info" dot>
        On the line
      </Badge>
    );
  }
  if (call?.status === "completed" || call?.status === "failed") {
    return null;
  }

  if (!call) {
    return (
      <div style={{ textAlign: "right" }}>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const outcome = await buildScriptFor(jobId, candidateId);
              if (outcome.status === "skipped") setError(outcome.detail ?? "Skipped.");
            });
          }}
        >
          <Icon name={pending ? "clock" : "doc"} size={14} />
          {pending ? "Building…" : "Build script"}
        </Button>
        {error && (
          <p style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>{error}</p>
        )}
      </div>
    );
  }

  if (call.blocked) {
    return (
      <Badge tone="danger" dot>
        Blocked
      </Badge>
    );
  }

  if (dialDisabledReason) {
    return (
      <span title={dialDisabledReason}>
        <Button size="sm" variant="ghost" disabled>
          <Icon name="phone" size={14} /> Call
        </Button>
      </span>
    );
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const outcome = await callFromRow(jobId, call.id);
              if (!outcome.ok) setError(outcome.reason);
              setConfirming(false);
            });
          }}
        >
          <Icon name={pending ? "clock" : "phone"} size={14} />
          {pending ? "Starting…" : `Call ${firstName}`}
        </Button>
        {error && (
          <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>
        )}
      </div>
    );
  }

  return (
    <Button size="sm" onClick={() => setConfirming(true)}>
      <Icon name="phone" size={14} /> Call
    </Button>
  );
}
