/**
 * A short, sayable reference for a job.
 *
 * Jobs are keyed by UUID, which nobody can read back to a colleague or type
 * into a search box. The first block of the UUID is stable, already unique
 * enough for one company's postings, and short enough to print on a row.
 */
export function jobRef(jobId: string): string {
  return `JOB-${jobId.slice(0, 4).toUpperCase()}`;
}
