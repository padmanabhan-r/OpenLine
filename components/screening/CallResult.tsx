import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import type { ScreeningResult } from "@/lib/script/schema";
import type { ScriptQuestion } from "@/lib/script/build";

/**
 * What came back from the call.
 *
 * Every answer is shown beside the candidate's own words, because an extracted
 * field with no evidence behind it is a claim, not a record. Fields CALL-E
 * declined to fill are shown as declined rather than hidden — an empty answer
 * is information too.
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  answered: "good",
  partially_answered: "warn",
  declined: "neutral",
  not_asked: "neutral",
  unclear: "warn",
};

const STATUS_LABEL: Record<string, string> = {
  answered: "Answered",
  partially_answered: "Partial",
  declined: "Declined",
  not_asked: "Not asked",
  unclear: "Unclear",
};

const INTEREST_TONE: Record<string, BadgeTone> = {
  high: "good",
  medium: "warn",
  low: "neutral",
  withdrew: "danger",
  unknown: "neutral",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

export default function CallResult({
  result,
  questions,
}: {
  result: ScreeningResult;
  questions: ScriptQuestion[];
}) {
  const questionText = new Map(questions.map((q) => [q.id, q.text]));

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* The headline facts a recruiter scans first. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 18,
          paddingBottom: 20,
          borderBottom: "1px solid var(--line-2)",
        }}
      >
        <Field label="Notice period" value={result.notice_period ?? ""} />
        <Field label="Availability" value={result.availability ?? ""} />
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Interest
          </div>
          <Badge tone={INTEREST_TONE[result.interest_level] ?? "neutral"}>
            {result.interest_level}
          </Badge>
        </div>
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginBottom: 6,
            }}
          >
            Next step
          </div>
          <Badge
            tone={
              result.followup === "human_callback_requested" ? "warn" : "neutral"
            }
          >
            {result.followup.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Answers, each with the words that justify it. */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Answers
        </h3>
        <div style={{ display: "grid", gap: 14 }}>
          {result.answers.map((answer) => (
            <div
              key={answer.question_id}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-2)",
                border: "1px solid var(--line-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent-deep)",
                    flexShrink: 0,
                    paddingTop: 3,
                  }}
                >
                  {answer.question_id}
                </span>
                <span style={{ fontSize: 13.5, color: "var(--ink-2)", flex: 1 }}>
                  {questionText.get(answer.question_id) ?? answer.question_id}
                </span>
                <Badge tone={STATUS_TONE[answer.answer_status] ?? "neutral"}>
                  {STATUS_LABEL[answer.answer_status] ?? answer.answer_status}
                </Badge>
              </div>

              {answer.answer && (
                <p style={{ fontSize: 14.5, marginBottom: answer.evidence ? 10 : 0 }}>
                  {answer.answer}
                </p>
              )}

              {answer.evidence && (
                <blockquote
                  style={{
                    display: "flex",
                    gap: 9,
                    padding: "9px 12px",
                    borderLeft: "2px solid var(--accent-soft)",
                    background: "var(--accent-tint)",
                    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                  }}
                >
                  <Icon
                    name="quote"
                    size={14}
                    style={{
                      color: "var(--accent-deep)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{answer.evidence}&rdquo;
                  </span>
                </blockquote>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* What the candidate wanted to know — the half that goes the other way. */}
      {result.candidate_questions.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            What {result.candidate_questions.length === 1 ? "they asked" : "they asked"}
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>
            Anything unanswered is yours to follow up.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {result.candidate_questions.map((q, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "11px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line-2)",
                }}
              >
                <span style={{ fontSize: 13.5, flex: 1 }}>{q.question}</span>
                <Badge
                  tone={
                    q.was_answered === "yes"
                      ? "good"
                      : q.was_answered === "no"
                        ? "warn"
                        : "neutral"
                  }
                >
                  {q.was_answered === "yes"
                    ? "Answered"
                    : q.was_answered === "no"
                      ? "Needs you"
                      : q.was_answered}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.call_recap && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recap</h3>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {result.call_recap}
          </p>
        </div>
      )}
    </div>
  );
}
