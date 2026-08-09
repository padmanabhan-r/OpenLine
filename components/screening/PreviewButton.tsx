"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { generatePreviews } from "@/app/(app)/jobs/[id]/actions";

export default function PreviewButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await generatePreviews(jobId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not build scripts.");
            }
          });
        }}
      >
        <Icon name={pending ? "clock" : "eye"} size={16} />
        {pending ? "Building scripts…" : "Build call scripts"}
      </Button>
      {error && (
        <span style={{ fontSize: 12, color: "var(--danger)", maxWidth: 280, textAlign: "right" }}>
          {error}
        </span>
      )}
    </div>
  );
}
