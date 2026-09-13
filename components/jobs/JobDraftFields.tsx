"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Field, { FIELD_STYLE } from "@/components/jobs/FormField";
import { draftJob } from "@/app/(app)/jobs/actions";

/**
 * The description and fact sheet, with a model to write the first draft.
 *
 * A recruiter types the title, the company, and a few lines of brief; the
 * draft fills both fields, and they read and edit before Create job saves
 * anything. The form still submits the plain server action — this component
 * only owns the two textareas so it can fill them.
 */
export default function JobDraftFields() {
  const [brief, setBrief] = useState("");
  const [description, setDescription] = useState("");
  const [factSheet, setFactSheet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const draft = (form: HTMLFormElement | null) => {
    setError(null);
    const title = String((form?.elements.namedItem("title") as HTMLInputElement | null)?.value ?? "").trim();
    const companyName = String(
      (form?.elements.namedItem("companyName") as HTMLInputElement | null)?.value ?? "",
    ).trim();
    if (!title || !companyName || !brief.trim()) {
      setError("Fill in the title, the company, and a brief first.");
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
    });
  };

  return (
    <>
      <Field
        label="Brief"
        hint="A few lines in your own words: what the person will do, what you need, and any facts a candidate may ask about — pay, location, hours, process. The draft states only what you put here."
      >
        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder={
              "Senior ML engineer for our fraud team in Bangalore, hybrid two days a week. Owns the retrieval and evaluation for a triage assistant. ₹55–75 lakh. Two technical rounds after this screen."
            }
            style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              type="button"
              size="sm"
              variant="soft"
              disabled={pending}
              onClick={(e) => draft(e.currentTarget.form)}
            >
              <Icon name={pending ? "clock" : "spark"} size={14} />
              {pending ? "Drafting…" : "Draft with AI"}
            </Button>
            {error && <span style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</span>}
          </div>
        </div>
      </Field>

      <Field
        label="Job description"
        hint="What a candidate reads. Draft it from the brief, or paste the real posting — either way, read it before you save."
      >
        <textarea
          name="description"
          required
          rows={14}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"ABOUT THE ROLE\n\n…\n\nWHAT WE NEED\n- …"}
          style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.6 }}
        />
      </Field>

      <Field
        label="Fact sheet — what the agent may say"
        hint={
          "One fact per line as Label: Value. CALL-E cannot look anything up mid-call, so these are the ONLY things it may state when a candidate asks. Anything absent is deferred to a human, never guessed — which is why the draft leaves out anything the brief did not say."
        }
      >
        <textarea
          name="factSheet"
          rows={6}
          value={factSheet}
          onChange={(e) => setFactSheet(e.target.value)}
          placeholder={"Salary band: ₹55–75 lakh per annum\nLocation policy: Hybrid — two days a week in office\nInterview process: This call, then two technical rounds"}
          style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.7 }}
        />
      </Field>
    </>
  );
}
