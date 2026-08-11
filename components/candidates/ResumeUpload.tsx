"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";

interface Outcome {
  filename: string;
  status: "created" | "parse_failed" | "duplicate" | "rejected";
  matchScore?: number;
  shortlisted?: boolean;
  reason?: string;
}

/**
 * Upload resumes to a job. Each file becomes a candidate — parsed, scored
 * against the posting, and auto-shortlisted at the threshold. Failures are
 * listed here AND become visible rows, so nothing vanishes into a toast.
 */
export default function ResumeUpload({ jobId }: { jobId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);
    setOutcomes(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("files", file);

      const response = await fetch(`/api/jobs/${jobId}/resumes`, {
        method: "POST",
        body: form,
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Upload failed.");
        return;
      }
      setOutcomes(body.outcomes);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />
      <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Icon name={busy ? "clock" : "plus"} size={14} />
        {busy ? "Parsing resumes…" : "Upload resumes"}
      </Button>

      {error && (
        <p style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>{error}</p>
      )}

      {outcomes && (
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {outcomes.map((o) => (
            <div
              key={o.filename}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
              }}
            >
              {o.status === "created" ? (
                <>
                  <Badge tone={o.shortlisted ? "good" : "neutral"}>
                    {o.shortlisted ? "shortlisted" : "below the line"}
                  </Badge>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {o.matchScore}
                  </span>
                  <span style={{ color: "var(--ink-2)" }}>{o.filename}</span>
                </>
              ) : (
                <>
                  <Badge tone={o.status === "duplicate" ? "warn" : "danger"}>
                    {o.status.replace("_", " ")}
                  </Badge>
                  <span style={{ color: "var(--ink-2)" }}>
                    {o.filename} — {o.reason}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
