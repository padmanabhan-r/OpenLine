"use client";

import { useState, useTransition, type ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { setStage } from "@/app/(app)/jobs/[id]/actions";
import { STAGE_LABELS, isExit, type Stage } from "@/lib/candidates/stage";

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
 * Where this person stands, and the one decision a recruiter makes next.
 *
 * The pipeline has seven stages, but a recruiter only ever does a few things
 * from a row: put someone on the list or take them off it, take them to
 * interview, or stop. So
 * that is the whole control — no dropdown of every stage. Everything here is a
 * human's call; OpenLine never moves anyone into an exit stage on its own.
 */
export default function StageDecision({
  jobId,
  candidateId,
  candidateName,
  stage,
  shortlistedBy,
  callCompleted,
}: {
  jobId: string;
  candidateId: string;
  candidateName: string;
  stage: Stage;
  shortlistedBy: "ats" | "human" | null;
  /**
   * Whether there is a finished call to decide on. Before one, a shortlisted
   * row offers only Remove: Interview and Reject wait for the evidence.
   */
  callCompleted: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = candidateName.split(" ")[0];

  const move = (next: Stage) => {
    setError(null);
    setConfirmingReject(false);
    startTransition(async () => {
      const outcome = await setStage(jobId, candidateId, next);
      if (!outcome.ok) setError(outcome.reason);
    });
  };

  let controls: ReactNode = null;

  if (stage === "applied") {
    controls = (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("shortlisted")}>
        <Icon name="plus" size={13} /> Shortlist
      </Button>
    );
  } else if (isExit(stage)) {
    controls = (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("shortlisted")}>
        Restore
      </Button>
    );
  } else if (stage === "shortlisted" && !callCompleted) {
    // Before a call there is nothing to decide on, but a shortlist the
    // recruiter cannot take someone off is the ATS score deciding for them.
    controls = (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("applied")}>
        Remove
      </Button>
    );
  } else if (stage === "interview_scheduled" || stage === "selected") {
    controls = (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("screened")}>
        Undo
      </Button>
    );
  } else if (confirmingReject) {
    // Rejecting is reversible (Restore), but it takes someone off the list,
    // so it names the person before it happens.
    controls = (
      <>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmingReject(false)}>
          Cancel
        </Button>
        <Button size="sm" variant="soft" disabled={pending} onClick={() => move("rejected")}>
          Reject {firstName}
        </Button>
      </>
    );
  } else {
    controls = (
      <>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmingReject(true)}>
          Reject
        </Button>
        <Button size="sm" variant="soft" disabled={pending} onClick={() => move("interview_scheduled")}>
          Interview
        </Button>
      </>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span title={shortlistedBy === "human" ? "Shortlisted by a person, over the ATS score" : undefined}>
        <Badge tone={TONE[stage]} dot={isExit(stage)}>
          {STAGE_LABELS[stage]}
        </Badge>
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {pending ? <Icon name="clock" size={13} style={{ color: "var(--ink-3)" }} /> : controls}
      </span>
      {error && <span style={{ fontSize: 11.5, color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}
