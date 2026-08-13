"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { setStage } from "@/app/(app)/jobs/[id]/actions";
import {
  STAGE_LABELS,
  isExit,
  isShortlisted,
  nextStages,
  type Stage,
} from "@/lib/candidates/stage";

const TONE: Record<Stage, "neutral" | "info" | "good" | "warn" | "danger"> = {
  applied: "neutral",
  shortlisted: "info",
  screened: "info",
  interview_scheduled: "good",
  selected: "good",
  rejected: "neutral",
  withdrew: "neutral",
};

/**
 * Where this person stands on one job, and the control that moves them.
 *
 * A select rather than a row of buttons: the pipeline has seven stages and a
 * recruiter can go backwards as well as forwards, which is six controls per row
 * on a fifty-row list otherwise.
 */
export default function StageControl({
  jobId,
  candidateId,
  stage,
  shortlistedBy,
}: {
  jobId: string;
  candidateId: string;
  stage: Stage;
  shortlistedBy: "ats" | "human" | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const move = (next: string) => {
    if (next === stage) return;
    setError(null);
    startTransition(async () => {
      const outcome = await setStage(jobId, candidateId, next);
      if (!outcome.ok) setError(outcome.reason);
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Badge tone={TONE[stage]} dot={isExit(stage)}>
        {STAGE_LABELS[stage]}
      </Badge>

      {isShortlisted(stage) && shortlistedBy === "human" && (
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>added by you</span>
      )}

      <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span className="sr-only">Move {STAGE_LABELS[stage]} to</span>
        <select
          value=""
          disabled={pending}
          onChange={(e) => move(e.target.value)}
          style={{
            fontSize: 12,
            fontFamily: "inherit",
            color: "var(--ink-2)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 6px",
            cursor: pending ? "wait" : "pointer",
          }}
        >
          <option value="">{pending ? "Saving…" : "Move to…"}</option>
          {nextStages(stage).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>
      )}
      {pending && <Icon name="clock" size={13} style={{ color: "var(--ink-3)" }} />}
    </span>
  );
}
