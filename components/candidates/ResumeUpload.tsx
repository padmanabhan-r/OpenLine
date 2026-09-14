"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

interface Outcome {
  filename: string;
  status: "created" | "parse_failed" | "duplicate" | "rejected";
  candidateId?: string;
  name?: string;
  matchScore?: number;
  shortlisted?: boolean;
  reason?: string;
}

function headline(outcomes: Outcome[]): string {
  if (outcomes.length === 1) {
    const [o] = outcomes;
    if (o.status === "created") {
      return o.shortlisted ? "Resume added and shortlisted" : "Resume added";
    }
    if (o.status === "parse_failed") return "Resume added, but it could not be read";
    if (o.status === "duplicate") return "Already on this job";
    return "Resume not added";
  }
  const added = outcomes.filter((o) => o.status === "created" || o.status === "parse_failed").length;
  return `${added} of ${outcomes.length} resumes added`;
}

function summary(outcomes: Outcome[]): string | null {
  if (outcomes.length === 1) return null;
  const shortlisted = outcomes.filter((o) => o.status === "created" && o.shortlisted).length;
  const pool = outcomes.filter((o) => o.status === "created" && !o.shortlisted).length;
  const check = outcomes.filter((o) => o.status !== "created").length;
  const parts = [
    shortlisted > 0 && `${shortlisted} shortlisted for review`,
    pool > 0 && `${pool} below the shortlist line`,
    check > 0 && `${check} for a person to check`,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(", ")}.` : null;
}

function OutcomeRow({ outcome: o }: { outcome: Outcome }) {
  const shortlisted = o.status === "created" && o.shortlisted;
  const icon =
    o.status === "created" ? (shortlisted ? "check-circle" : "doc") : "alert";
  const color =
    o.status === "created"
      ? shortlisted
        ? "var(--accent-deep)"
        : "var(--ink-3)"
      : o.status === "rejected"
        ? "var(--danger)"
        : "var(--amber)";

  const body =
    o.status === "created"
      ? shortlisted
        ? "Shortlisted for review, and ready to call from the job's shortlist."
        : "Added to the job's pool. The score is below the shortlist line; you can still shortlist them from the job page."
      : o.status === "parse_failed"
        ? `The resume could not be read. ${o.reason ?? ""} It is listed on the job for a person to check.`
        : o.status === "duplicate"
          ? `Not added again. ${o.reason ?? ""}`
          : `Not added. ${o.reason ?? ""}`;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "14px 16px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        border: "1px solid var(--line-2)",
      }}
    >
      <Icon name={icon} size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{o.name ?? o.filename}</span>
          {o.status === "created" && o.matchScore != null && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              ATS score{" "}
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0, color }}>
                {o.matchScore}
              </span>
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{body}</p>
        {o.name && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {o.filename}
          </span>
        )}
      </div>
      {o.status === "created" && o.candidateId && (
        <Link
          href={`/candidates/${o.candidateId}`}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent-deep)",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          View <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </div>
  );
}

/**
 * Upload resumes to a job. Each file becomes a candidate: parsed, scored
 * against the posting, and auto-shortlisted at the threshold.
 *
 * What happened to each file opens in a dialog the recruiter has to dismiss,
 * rather than a line of text under a button: a resume that silently failed,
 * or a candidate who quietly landed below the line, is exactly what a glance
 * misses. Failures are also rows on the job page, so closing the dialog loses
 * nothing.
 */
export default function ResumeUpload({ jobId }: { jobId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = outcomes !== null || error !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function dismiss() {
    setOutcomes(null);
    setError(null);
  }

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

  const title = error ? "Upload failed" : outcomes ? headline(outcomes) : "";
  const note = outcomes ? summary(outcomes) : null;

  return (
    <>
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
        {busy ? "Reading resumes…" : "Upload resumes"}
      </Button>

      <dialog
        ref={dialogRef}
        className="ol-dialog"
        aria-labelledby="resume-upload-title"
        onClose={dismiss}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === e.currentTarget) dismiss();
        }}
        style={{
          margin: "auto",
          width: "min(580px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          padding: 0,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          color: "var(--ink)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {open && (
          <div style={{ display: "grid", gap: 16, padding: "22px 22px 20px" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <h2 id="resume-upload-title" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                {title}
              </h2>
              {note && <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{note}</p>}
            </div>

            {error ? (
              <p style={{ fontSize: 13.5, color: "var(--danger)", lineHeight: 1.5 }}>{error}</p>
            ) : (
              <div style={{ display: "grid", gap: 10, maxHeight: "55vh", overflowY: "auto" }}>
                {outcomes?.map((o, i) => (
                  <OutcomeRow key={`${o.filename}-${i}`} outcome={o} />
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button size="sm" onClick={dismiss} autoFocus>
                Done
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
