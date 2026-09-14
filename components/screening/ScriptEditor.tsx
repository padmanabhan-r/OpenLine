"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { draftOverride, saveScriptEdits } from "@/app/(app)/calls/[id]/actions";
import type { ScriptQuestion } from "@/lib/script/build";
import type { GuardFinding } from "@/lib/script/guard";

const INPUT_STYLE = {
  width: "100%",
  fontSize: 13.5,
  fontFamily: "inherit",
  lineHeight: 1.5,
  padding: "9px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
} as const;

/**
 * Edit the questions and the goal; never the frame.
 *
 * The consent gate, disclosure, and boundaries live in the assembled task and
 * are not inputs here — a recruiter can rewrite what gets asked, not whether
 * the candidate is told it's an AI and asked for permission first.
 *
 * Override defaults lets the recruiter write what the call should find out in
 * their own words; a model drafts a goal and questions from exactly that, and
 * the recruiter reads and edits them before anything is saved.
 */
export default function ScriptEditor({
  screeningCallId,
  questions,
  goal,
  editable,
  lockedReason,
}: {
  screeningCallId: string;
  questions: ScriptQuestion[];
  goal: string | null;
  editable: boolean;
  lockedReason?: string;
}) {
  const [texts, setTexts] = useState(questions.map((q) => q.text));
  const [goalText, setGoalText] = useState(goal ?? "");
  const [findings, setFindings] = useState<GuardFinding[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [overriding, setOverriding] = useState(false);
  const [notes, setNotes] = useState("");
  const [drafting, startDrafting] = useTransition();

  if (!editable) {
    return (
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {goal && (
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
            <strong style={{ color: "var(--ink)" }}>Goal:</strong> {goal}
          </p>
        )}
        <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
          <Icon name="lock" size={13} style={{ verticalAlign: -2 }} />{" "}
          {lockedReason ?? "This script is locked once dialing starts."}
        </p>
      </div>
    );
  }

  const dirty =
    texts.length !== questions.length ||
    texts.some((t, i) => t !== questions[i]?.text) ||
    goalText.trim() !== (goal ?? "");

  const draft = () => {
    setError(null);
    startDrafting(async () => {
      const outcome = await draftOverride(screeningCallId, notes);
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setGoalText(outcome.goal);
      setTexts(outcome.questions);
      setSaved(false);
      setOverriding(false);
    });
  };

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
      {overriding && (
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: "14px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600 }}>Override the default questions</p>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5, maxWidth: 620 }}>
            Write what this call should find out, in your own words. AI turns it into a goal
            and a few short questions for you to review; nothing is saved until you press Save.
            The AI disclosure, the consent question, and the prohibited-topic check stay as
            they are.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Check they can relocate to Singapore within three months, and whether they have run Kafka in production."
            style={{ ...INPUT_STYLE, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="ghost" disabled={drafting} onClick={() => setOverriding(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={drafting || !notes.trim()} onClick={draft}>
              <Icon name={drafting ? "clock" : "spark"} size={14} />
              {drafting ? "Drafting…" : "Draft goal and questions"}
            </Button>
          </div>
        </div>
      )}

      {((goal ?? "") !== "" || goalText !== "") && (
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            Goal{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>
              for you: what this call is for. The agent is given the questions below, not this line
            </span>
          </span>
          <input
            value={goalText}
            maxLength={240}
            onChange={(e) => {
              setGoalText(e.target.value);
              setSaved(false);
            }}
            style={INPUT_STYLE}
          />
        </label>
      )}

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
            style={{ ...INPUT_STYLE, flex: 1, width: "auto", resize: "vertical" }}
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
        {!overriding && (
          <Button size="sm" variant="ghost" onClick={() => setOverriding(true)}>
            <Icon name="spark" size={14} /> Override defaults
          </Button>
        )}
        <div style={{ flex: 1 }} />
        {saved && !dirty && <Badge tone="good">Saved — script reassembled</Badge>}
        <Button
          size="sm"
          disabled={pending || !dirty}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await saveScriptEdits(screeningCallId, texts, goalText.trim() || null);
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
      {error && <p style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
