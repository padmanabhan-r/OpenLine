import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";
import Field, { FIELD_STYLE } from "@/components/jobs/FormField";
import JobDraftFields from "@/components/jobs/JobDraftFields";
import { CALL_LANGUAGES, DEFAULT_CALL_LANGUAGE } from "@/lib/jobs/language";
import { createJob } from "../actions";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ink-3)",
          marginTop: 4,
          maxWidth: 620,
          lineHeight: 1.5,
        }}
      >
        {note}
      </p>
    </div>
  );
}

/**
 * A new job in three parts that look like three parts: the role, an optional
 * AI draft, and the posting itself. The draft only ever fills the posting;
 * nothing is saved until Create job.
 */
export default async function NewJobPage() {
  await requireOperator("/jobs/new");
  return (
    <>
      <TopBar
        title="New job"
        subtitle="Describe the role, draft the posting from a brief or type it yourself, and read it before you save."
      />
      <Page>
        <form action={createJob} style={{ display: "grid", gap: 16, maxWidth: 780 }}>
          <Panel>
            <SectionHeading
              title="The role"
              note="Who is hiring, and how every call for this job sounds."
            />
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <Field label="Job title">
                <input name="title" required placeholder="Senior AI Engineer" style={FIELD_STYLE} />
              </Field>
              <Field label="Company">
                <input name="companyName" required placeholder="Northwind Payments" style={FIELD_STYLE} />
              </Field>
              <Field label="Recruiter name" hint="The agent names this person on every call.">
                <input name="recruiterName" required placeholder="Sam Oyelaran" style={FIELD_STYLE} />
              </Field>
              <Field
                label="Phone region"
                hint="Country used to resolve national-format numbers from resumes."
              >
                <select name="defaultRegion" defaultValue="IN" style={FIELD_STYLE}>
                  <option value="IN">India (+91)</option>
                  <option value="US">United States (+1)</option>
                  <option value="GB">United Kingdom (+44)</option>
                  <option value="SG">Singapore (+65)</option>
                  <option value="AE">UAE (+971)</option>
                  <option value="AU">Australia (+61)</option>
                  <option value="">None — require full international format</option>
                </select>
              </Field>
              <Field
                label="Call language"
                hint="What the agent speaks on every call for this job. The questions stay in English on the script you review."
              >
                <select name="language" defaultValue={DEFAULT_CALL_LANGUAGE} style={FIELD_STYLE}>
                  {CALL_LANGUAGES.map((l) => (
                    <option key={l.locale} value={l.locale}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          <JobDraftFields />

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Button size="lg" type="submit">
              Create job
            </Button>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              Nothing is saved until you press Create job.
            </span>
          </div>
        </form>
      </Page>
    </>
  );
}
