import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";
import { createJob } from "../actions";

export const dynamic = "force-dynamic";

const FIELD_STYLE = {
  width: "100%",
  fontSize: 14,
  fontFamily: "inherit",
  padding: "10px 13px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
} as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>
        {label}
      </span>
      {hint && (
        <span
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            display: "block",
            marginBottom: 7,
            maxWidth: 560,
          }}
        >
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

export default function NewJobPage() {
  return (
    <>
      <TopBar
        title="New job"
        subtitle="Describe the role properly — the screening questions are drawn from it."
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
            </div>

            <Field
              label="Job description"
              hint="Paste the real posting. Vague descriptions produce vague screening questions — the model reads this against each candidate's background."
            >
              <textarea
                name="description"
                required
                rows={14}
                placeholder={"About the role…\n\nWHAT WE NEED\n- …"}
                style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.6 }}
              />
            </Field>

            <Field
              label="Fact sheet — what the agent may say"
              hint={
                "One fact per line as Label: Value. CALL-E cannot look anything up mid-call, so these are the ONLY things it may state when a candidate asks. Anything absent is deferred to a human, never guessed."
              }
            >
              <textarea
                name="factSheet"
                rows={6}
                placeholder={"Salary band: ₹55–75 lakh per annum\nLocation policy: Hybrid — two days a week in office\nInterview process: This call, then two technical rounds"}
                style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.7 }}
              />
            </Field>

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
