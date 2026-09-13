"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import {
  buildScriptFor,
  callAgainFromRow,
  callFromRow,
} from "@/app/(app)/jobs/[id]/actions";

/**
 * The one control on a shortlist row: Call.
 *
 * The script is a fixed template, so there is nothing for a recruiter to
 * build by hand. The first click prepares the row's script (and shows the
 * confirm); the second click dials. The confirm still names the person and
 * the exact version of the words, and the server refuses if either moved —
 * this is the click that spends money and rings someone, and a shorter path
 * to it is not a smaller consequence. The words stay readable on Review.
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
  call: { id: string; status: string; blocked: boolean; scriptVersion: number } | null;
  /** Why the call button is disabled, or null when it may dial. */
  dialDisabledReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"call" | "again" | null>(null);
  // The row prepared on the first click, when none existed before.
  const [prepared, setPrepared] = useState<{ id: string; scriptVersion: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstName = candidateName.split(" ")[0];

  if (call?.status === "dialing") {
    return (
      <Badge tone="info" dot>
        On the line
      </Badge>
    );
  }

  if (call?.blocked) {
    return (
      <Badge tone="danger" dot>
        Blocked
      </Badge>
    );
  }

  if (confirming) {
    const again = confirming === "again";
    const target = call ?? prepared;
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending || !target}
          onClick={() => {
            if (!target) return;
            setError(null);
            startTransition(async () => {
              // The confirmation names this person and this version of the
              // words; the server refuses if either moved since the page loaded.
              const outcome = again
                ? await callAgainFromRow(jobId, target.id)
                : await callFromRow(jobId, target.id, {
                    candidateId,
                    scriptVersion: target.scriptVersion,
                  });
              if (!outcome.ok) setError(outcome.reason);
              setConfirming(null);
            });
          }}
        >
          <Icon name={pending ? "clock" : "phone"} size={14} />
          {pending && !target ? "Preparing…" : pending ? "Starting…" : `Call ${firstName}`}
        </Button>
        {error && (
          <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>
        )}
      </div>
    );
  }

  // A call already happened — offer another attempt.
  if (call && (call.status === "completed" || call.status === "failed")) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming("again")}>
        <Icon name="phone" size={14} /> Call again
      </Button>
    );
  }

  if (dialDisabledReason) {
    // The reason stays visible, not tucked into a hover title — a recruiter
    // tabbing the queue and a screen reader both deserve to know why.
    return (
      <div style={{ textAlign: "right" }}>
        <Button size="sm" variant="soft" disabled>
          <Icon name="phone" size={14} /> Call
        </Button>
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
          {dialDisabledReason}
        </p>
      </div>
    );
  }

  const prepareAndConfirm = () => {
    setError(null);
    setConfirming("call");
    if (call) return;
    startTransition(async () => {
      const outcome = await buildScriptFor(jobId, candidateId);
      if (outcome.status === "previewed" && outcome.screeningCallId) {
        setPrepared({ id: outcome.screeningCallId, scriptVersion: outcome.scriptVersion ?? 1 });
        return;
      }
      setConfirming(null);
      setError(outcome.detail ?? "The script could not be prepared.");
    });
  };

  return (
    <div style={{ textAlign: "right" }}>
      {/* Soft at rest: nineteen black pills in a queue would flatten the one
          that matters. The black pill is reserved for the confirm — the click
          that actually spends money and rings a person. */}
      <Button size="sm" variant="soft" onClick={prepareAndConfirm}>
        <Icon name="phone" size={14} /> Call
      </Button>
      {error && (
        <p style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>
          {error}
          {prepared === null && call === null && (
            <>
              {" "}
              <Link href="/calls" style={{ color: "var(--accent-deep)", fontWeight: 600 }}>
                Review
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
