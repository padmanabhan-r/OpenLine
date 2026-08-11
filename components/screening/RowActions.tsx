"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import {
  buildScriptFor,
  callAgainFromRow,
  callFromRow,
} from "@/app/(app)/jobs/[id]/actions";

/**
 * The per-row controls on the shortlist: build or rebuild the script, place
 * the call, place it again.
 *
 * Every dial keeps the two-step confirm naming the person — this is still the
 * control that spends money and rings someone, and a smaller button is not a
 * smaller consequence.
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
  const [confirming, setConfirming] = useState<"call" | "again" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstName = candidateName.split(" ")[0];

  const rebuild = (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      title="Regenerate this candidate's questions from the job description"
      onClick={() => {
        setError(null);
        startTransition(async () => {
          const outcome = await buildScriptFor(jobId, candidateId);
          if (outcome.status === "skipped") setError(outcome.detail ?? "Skipped.");
        });
      }}
    >
      <Icon name={pending ? "clock" : "doc"} size={14} />
      {pending ? "Building…" : "Rebuild"}
    </Button>
  );

  if (call?.status === "dialing") {
    return (
      <Badge tone="info" dot>
        On the line
      </Badge>
    );
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

  if (confirming) {
    const again = confirming === "again";
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const outcome = again
                ? await callAgainFromRow(jobId, call.id)
                : await callFromRow(jobId, call.id);
              if (!outcome.ok) setError(outcome.reason);
              setConfirming(null);
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

  // A call already happened — offer another attempt.
  if (call.status === "completed" || call.status === "failed") {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming("again")}>
        <Icon name="phone" size={14} /> Call again
      </Button>
    );
  }

  if (call.blocked) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Badge tone="danger" dot>
          Blocked
        </Badge>
        {rebuild}
      </div>
    );
  }

  if (dialDisabledReason) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {rebuild}
        <span title={dialDisabledReason}>
          <Button size="sm" variant="ghost" disabled>
            <Icon name="phone" size={14} /> Call
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {rebuild}
      <Button size="sm" onClick={() => setConfirming("call")}>
        <Icon name="phone" size={14} /> Call
      </Button>
      {error && (
        <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>
      )}
    </div>
  );
}
