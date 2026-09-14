"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { addProfileToJob } from "@/app/(app)/profiles/actions";

/**
 * Put this person on another job without uploading their resume again.
 * With a resume on file the add re-scores it against that job, which takes
 * a model call, so the button says so while it waits.
 */
export default function AddToJob({
  candidateId,
  jobs,
  hasResume,
}: {
  candidateId: string;
  jobs: Array<{ id: string; title: string; companyName: string }>;
  hasResume: boolean;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (jobs.length === 0) return null;

  const add = () => {
    setResult(null);
    startTransition(async () => {
      const outcome = await addProfileToJob(candidateId, jobId);
      setResult(outcome.ok ? { ok: true, text: outcome.message } : { ok: false, text: outcome.reason });
    });
  };

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          disabled={pending}
          aria-label="Job to add this person to"
          style={{
            fontSize: 12.5,
            fontFamily: "inherit",
            padding: "7px 9px",
            maxWidth: 240,
            color: "var(--ink)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} · {job.companyName}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" disabled={pending || !jobId} onClick={add}>
          <Icon name={pending ? "clock" : "plus"} size={13} />
          {pending ? (hasResume ? "Scoring…" : "Adding…") : "Add to job"}
        </Button>
      </span>
      {result && (
        <span style={{ fontSize: 12, color: result.ok ? "var(--ink-2)" : "var(--danger)" }}>
          {result.text}
        </span>
      )}
    </div>
  );
}
