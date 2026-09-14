"use client";

import { useState, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Panel } from "@/components/layout/TopBar";
import Field, { FIELD_STYLE } from "@/components/jobs/FormField";
import { draftJob } from "@/app/(app)/jobs/actions";

type Source = "empty" | "typed" | "drafted" | "edited";

const SOURCE_BADGE: Record<Exclude<Source, "empty">, { tone: "accent" | "neutral"; label: string }> = {
  drafted: { tone: "accent", label: "Drafted by AI — read it before you save" },
  edited: { tone: "accent", label: "Drafted by AI, edited by you" },
  typed: { tone: "neutral", label: "Typed by you" },
};

/**
 * The optional AI draft, and the posting it fills.
 *
 * Two sections that cannot be mistaken for each other: the draft sits on its
 * own tinted, dashed surface and says it is optional; the posting is an
 * ordinary panel whose badge says where its words came from. The form still
 * submits the plain server action; this component only owns the two
 * textareas so the draft can fill them.
 */
export default function JobDraftFields() {
  const [brief, setBrief] = useState("");
  const [description, setDescription] = useState("");
  const [factSheet, setFactSheet] = useState("");
  const [source, setSource] = useState<Source>("empty");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const draft = (form: HTMLFormElement | null) => {
    setError(null);
    const title = String((form?.elements.namedItem("title") as HTMLInputElement | null)?.value ?? "").trim();
    const companyName = String(
      (form?.elements.namedItem("companyName") as HTMLInputElement | null)?.value ?? "",
    ).trim();
    if (!title || !companyName || !brief.trim()) {
      setError("Fill in the job title and company above, and a brief here, first.");
      return;
    }
    startTransition(async () => {
      const outcome = await draftJob({ title, companyName, brief: brief.trim() });
      if (!outcome.ok) {
        setError(outcome.reason);
        return;
      }
      setDescription(outcome.description);
      setFactSheet(outcome.factSheet);
      setSource("drafted");
    });
  };

  const typed = (next: string, other: string) => {
    if (source === "drafted") setSource("edited");
    else if (source === "empty" || source === "typed") setSource(next || other ? "typed" : "empty");
  };

  const drafted = source === "drafted" || source === "edited";
  const fieldStyle = {
    ...FIELD_STYLE,
    resize: "vertical" as const,
    ...(drafted ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)" } : {}),
  };

  return (
    <>
      <section
        style={{
          padding: 22,
          borderRadius: "var(--radius)",
          background: "var(--accent-tint)",
          border: "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Icon name="spark" size={17} style={{ color: "var(--accent-deep)" }} />
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Draft with AI</h2>
          <Badge tone="neutral">Optional</Badge>
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-2)",
            marginTop: 6,
            maxWidth: 620,
            lineHeight: 1.5,
          }}
        >
          Write a few lines about the role: what the person will do, what you need, and any facts a
          candidate may ask about, such as pay, location, hours, or process. The draft fills the
          posting below and states only what you put here. Skip this to type the posting yourself.
        </p>

        <textarea
          aria-label="Brief for the AI draft"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder={
            "Senior ML engineer for our fraud team in Bangalore, hybrid two days a week. Owns the retrieval and evaluation for a triage assistant. $65,000–$90,000 a year. Two technical rounds after this screen."
          }
          style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.6, marginTop: 14 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Button
            type="button"
            size="sm"
            variant="soft"
            disabled={pending}
            onClick={(e) => draft(e.currentTarget.form)}
          >
            <Icon name={pending ? "clock" : "spark"} size={14} />
            {pending ? "Drafting…" : "Draft the posting"}
          </Button>
          {error ? (
            <span style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</span>
          ) : drafted ? (
            <span style={{ fontSize: 12.5, color: "var(--accent-deep)" }}>
              Drafted into the posting below.
            </span>
          ) : null}
        </div>
      </section>

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>The posting</h2>
          {source !== "empty" && (
            <Badge tone={SOURCE_BADGE[source].tone} dot={drafted}>
              {SOURCE_BADGE[source].label}
            </Badge>
          )}
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            marginTop: 4,
            marginBottom: 18,
            maxWidth: 620,
            lineHeight: 1.5,
          }}
        >
          What candidates read, and the only facts the agent may state on a call. Type it here, paste
          a real posting, or draft it above.
        </p>

        <div style={{ display: "grid", gap: 18 }}>
          <Field label="Job description" hint="What a candidate reads.">
            <textarea
              name="description"
              required
              rows={14}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                typed(e.target.value, factSheet);
              }}
              placeholder={"ABOUT THE ROLE\n\n…\n\nWHAT WE NEED\n- …"}
              style={{ ...fieldStyle, lineHeight: 1.6 }}
            />
          </Field>

          <Field
            label="Fact sheet — what the agent may say"
            hint="One fact per line as Label: Value. CALL-E cannot look anything up mid-call, so these are the only things it may state when a candidate asks. Anything absent is deferred to a person, never guessed."
          >
            <textarea
              name="factSheet"
              rows={6}
              value={factSheet}
              onChange={(e) => {
                setFactSheet(e.target.value);
                typed(e.target.value, description);
              }}
              placeholder={"Salary band: $65,000–$90,000 a year\nLocation policy: Hybrid — two days a week in office\nInterview process: This call, then two technical rounds"}
              style={{ ...fieldStyle, lineHeight: 1.7 }}
            />
          </Field>
        </div>
      </Panel>
    </>
  );
}
