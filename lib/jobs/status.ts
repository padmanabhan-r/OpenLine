/**
 * A posting's lifecycle.
 *
 * `filled` and `closed` both stop the calling: dialling people about a role
 * that no longer exists is precisely the kind of thing a machine will do
 * cheerfully, at scale, to a hundred people. Everything already recorded stays
 * readable — closing a job hides nothing.
 */
export type JobStatus = "open" | "filled" | "closed";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Open",
  filled: "Filled",
  closed: "Closed",
};

export function isJobStatus(value: string): value is JobStatus {
  return value === "open" || value === "filled" || value === "closed";
}

export function acceptsCalls(status: JobStatus): boolean {
  return status === "open";
}

/** Why calling is off, in words a recruiter can act on. */
export function closedReason(status: JobStatus, reason: string | null): string {
  const label = status === "filled" ? "filled" : "closed";
  return reason
    ? `This job is ${label}: ${reason}`
    : `This job is ${label}, so no new calls can be placed.`;
}
