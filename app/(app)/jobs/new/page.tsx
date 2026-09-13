import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";
import Field, { FIELD_STYLE } from "@/components/jobs/FormField";
import JobDraftFields from "@/components/jobs/JobDraftFields";
import { CALL_LANGUAGES, DEFAULT_CALL_LANGUAGE } from "@/lib/jobs/language";
import { createJob } from "../actions";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <>
      <TopBar
        title="New job"
        subtitle="Title, company, a brief — the draft does the rest, and you read it before it exists."
      />
      <Page>
        <Panel>
          <form action={createJob} style={{ display: "grid", gap: 18, maxWidth: 680 }}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
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

            <JobDraftFields />

            <div>
              <Button size="lg" type="submit">
                Create job
              </Button>
            </div>
          </form>
        </Panel>
      </Page>
    </>
  );
}
