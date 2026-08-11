"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { saveScriptEdits } from "@/app/(app)/calls/[id]/actions";
import type { ScriptQuestion } from "@/lib/script/build";
import type { GuardFinding } from "@/lib/script/guard";

/**
 * Edit the questions; never the frame.
 *
 * The consent gate, disclosure, and boundaries live in the assembled task and
 * are not inputs here — a recruiter can rewrite what gets asked, not whether
 * the candidate is told it's an AI and asked for permission first.
 */
export default function ScriptEditor({
  screeningCallId,
  questions,
  editable,
  lockedReason,
}: {
  screeningCallId: string;
  questions: ScriptQuestion[];
  editable: boolean;
  lockedReason?: string;
}) {
  const [texts, setTexts] = useState(questions.map((q) => q.text));
  const [findings, setFindings] = useState<GuardFinding[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editable) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8 }}>
        <Icon name="lock" size={13} style={{ verticalAlign: -2 }} />{" "}
        {lockedReason ?? "This script is locked once dialing starts."}
      </p>
    );
  }

  const dirty =
    texts.length !== questions.length ||
    texts.some((t, i) => t !== questions[i]?.text);

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
      {texts.map((text, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span
            className="mono"
            style={{ fontSize: 11.5, color: "var(--ink-3)", paddingTop: 10, width: 24 }}
          >
            q{i + 1}
          </span>
          <textarea
            value={text}
            rows={2}
            onChange={(e) => {
              setTexts(texts.map((t, j) => (j === i ? e.target.value : t)));
              setSaved(false);
            }}
            style={{
              flex: 1,
              fontSize: 13.5,
              fontFamily: "inherit",
              lineHeight: 1.5,
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={texts.length <= 1}
            onClick={() => {
              setTexts(texts.filter((_, j) => j !== i));
              setSaved(false);
            }}
          >
            <Icon name="x" size={14} />
          </Button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTexts([...texts, ""]);
            setSaved(false);
          }}
        >
          <Icon name="plus" size={14} /> Add question
        </Button>
        <div style={{ flex: 1 }} />
        {saved && !dirty && (
          <Badge tone="good">Saved — script reassembled</Badge>
        )}
        <Button
          size="sm"
          disabled={pending || !dirty}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await saveScriptEdits(screeningCallId, texts);
              if (!result.ok) {
                setError(result.reason);
                return;
              }
              setFindings(result.findings);
              setSaved(true);
            });
          }}
        >
          <Icon name={pending ? "clock" : "check"} size={14} />
          {pending ? "Saving…" : "Save questions"}
        </Button>
      </div>

      {findings.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "var(--danger-wash)",
            border: "1px solid var(--danger)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-deep)" }}>
            Saved, but this script will not dial
          </p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {findings.map((f, i) => (
              <li key={i} style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                <strong>{f.category}</strong>: “{f.matched}” — {f.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
