"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { buildScriptFor } from "@/app/(app)/jobs/[id]/actions";

/** Throw the current questions away and draft fresh ones from the job. */
export default function RebuildButton({
  jobId,
  candidateId,
}: {
  jobId: string;
  candidateId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        title="Regenerate the questions from the job description — current questions are replaced"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const outcome = await buildScriptFor(jobId, candidateId);
            if (outcome.status === "skipped") setError(outcome.detail ?? "Skipped.");
          });
        }}
      >
        <Icon name={pending ? "clock" : "spark"} size={14} />
        {pending ? "Rebuilding…" : "Rebuild script"}
      </Button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}
