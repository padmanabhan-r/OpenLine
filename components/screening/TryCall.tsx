"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Panel } from "@/components/layout/TopBar";
import Field, { FIELD_STYLE } from "@/components/jobs/FormField";
import CallResult from "@/components/screening/CallResult";
import Transcript from "@/components/screening/Transcript";
import { CALL_LANGUAGES, DEFAULT_CALL_LANGUAGE, languageLabel } from "@/lib/jobs/language";
import type { ScriptQuestion } from "@/lib/script/build";
import { checkTryCall, startTryCall, type TryCheck } from "@/app/(app)/try/actions";

export interface TryJob {
  id: string;
  title: string;
  companyName: string;
  language: string;
}

type Finished = Extract<TryCheck, { done: true }>;

type Stage =
  | { kind: "form" }
  | { kind: "confirm" }
  | {
      kind: "dialing";
      callId: string;
      masked: string;
      name: string;
      locale: string;
      questions: ScriptQuestion[];
      startedAt: number;
    }
  | { kind: "done"; masked: string; name: string; questions: ScriptQuestion[]; check: Finished };

/** A screening call runs about two minutes; past this, the page stops asking. */
const GIVE_UP_AFTER_MS = 12 * 60_000;

/**
 * A name, a number, a language, and one phone rings.
 *
 * The confirm step names the person and the last four digits before anything
 * dials, and the server checks every field again. The result lives in this
 * component's state only: leave the page and it is gone, which is the promise
 * the page makes.
 */
export default function TryCall({ jobs, simulated }: { jobs: TryJob[]; simulated: boolean }) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState(job?.language ?? DEFAULT_CALL_LANGUAGE);
  const [attested, setAttested] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef("");
  // What the current key was minted for. The same job, name, number and
  // language keep the same key, so a retry after a lost response is the same
  // CALL-E call, never a second ring.
  const keyFor = useRef("");

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const last4 = phone.replace(/\D/g, "").slice(-4);

  // While the call is live, ask the server what CALL-E says about it. The
  // server re-fetches through the authenticated API; the page trusts nothing
  // it holds about the call except the id.
  useEffect(() => {
    if (stage.kind !== "dialing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const check = await checkTryCall(stage.callId, stage.locale);
      if (cancelled) return;
      if (check.ok && check.done) {
        setStage({
          kind: "done",
          masked: stage.masked,
          name: stage.name,
          questions: stage.questions,
          check,
        });
        return;
      }
      if (check.ok) setLiveStatus(check.status);
      if (Date.now() - stage.startedAt > GIVE_UP_AFTER_MS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, 4_000);
    };

    timer = setTimeout(tick, 2_000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [stage]);

  const review = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const signature = [job?.id, name.trim(), phone.replace(/\D/g, ""), language].join("|");
    if (signature !== keyFor.current) {
      requestId.current = crypto.randomUUID();
      keyFor.current = signature;
    }
    setStage({ kind: "confirm" });
  };

  const dial = () => {
    if (!job) return;
    setError(null);
    startTransition(async () => {
      let outcome: Awaited<ReturnType<typeof startTryCall>>;
      try {
        outcome = await startTryCall({
          jobId: job.id,
          name,
          phone,
          language,
          attested,
          requestId: requestId.current,
        });
      } catch {
        // It may or may not have reached CALL-E. Stay on the confirm with the
        // same key, so pressing Call again cannot ring twice.
        setError("The server did not answer. Press Call again; it will not ring twice.");
        return;
      }
      if (!outcome.ok) {
        setError(outcome.reason);
        setStage({ kind: "form" });
        return;
      }
      setLiveStatus(null);
      setGaveUp(false);
      setStage({
        kind: "dialing",
        callId: outcome.callId,
        masked: outcome.masked,
        name: name.trim(),
        locale: outcome.locale,
        questions: outcome.questions,
        startedAt: Date.now(),
      });
    });
  };

  const startOver = () => {
    requestId.current = "";
    keyFor.current = "";
    setStage({ kind: "form" });
    setAttested(false);
    setError(null);
  };

  if (!job) return null;

  if (stage.kind === "form" || stage.kind === "confirm") {
    const confirming = stage.kind === "confirm";
    return (
      <Panel>
        <form onSubmit={review} style={{ display: "grid", gap: 18, maxWidth: 640 }}>
          {jobs.length > 1 ? (
            <Field
              label="Job"
              hint="The role the agent screens for. Its title, company, and fact sheet go into the script."
            >
              <select
                value={job.id}
                disabled={confirming}
                onChange={(e) => {
                  const next = jobs.find((j) => j.id === e.target.value);
                  setJobId(e.target.value);
                  if (next) setLanguage(next.language);
                }}
                style={FIELD_STYLE}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} · {j.companyName}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
              Screening for <strong style={{ color: "var(--ink)" }}>{job.title}</strong> at{" "}
              {job.companyName}.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <Field label="Your first name" hint="The agent asks for you by it. One word.">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={confirming}
                required
                maxLength={30}
                autoComplete="off"
                placeholder="Priya"
                style={FIELD_STYLE}
              />
            </Field>
            <Field label="Phone number" hint="With the country code, starting with +.">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={confirming}
                required
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+1 415 555 0100"
                style={FIELD_STYLE}
              />
            </Field>
          </div>

          <Field
            label="Language"
            hint="What the agent speaks on the call. The questions stay in English on the script."
          >
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={confirming}
              style={FIELD_STYLE}
            >
              {CALL_LANGUAGES.map((l) => (
                <option key={l.locale} value={l.locale}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 13.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              disabled={confirming}
              style={{ marginTop: 3, accentColor: "var(--accent)" }}
            />
            <span>This is my number, or its owner has agreed to take an AI screening call.</span>
          </label>

          {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}

          {confirming ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                padding: "14px 16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600 }}>
                Call {name.trim()} at <span className="mono">••• {last4}</span>, in{" "}
                {languageLabel(language)}?
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 560 }}>
                {simulated
                  ? "Calls are simulated here, so nothing rings: the fake CALL-E answers with a canned conversation."
                  : "The phone rings now, and it spends one CALL-E call."}{" "}
                The agent says it is an AI assistant calling about the {job.title} role and asks
                before any question.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setStage({ kind: "form" })}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={pending} onClick={dial}>
                  <Icon name={pending ? "clock" : "phone"} size={14} />
                  {pending ? "Dialing…" : `Call ${firstName}`}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Button type="submit" disabled={!name.trim() || !phone.trim() || !attested}>
                <Icon name="phone" size={15} /> Call
              </Button>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                Nothing is saved: no candidate, no call record.
              </span>
            </div>
          )}
        </form>
      </Panel>
    );
  }

  if (stage.kind === "dialing") {
    return (
      <Panel>
        <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge tone="info" dot>
              On the line
            </Badge>
            {liveStatus && (
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                CALL-E: {liveStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600 }}>
            Calling {stage.name} at <span className="mono">{stage.masked}</span>
          </p>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {gaveUp
              ? "CALL-E still has this call, but this page has stopped waiting. Nothing was saved, so its result cannot be shown here."
              : "Pick up. The agent opens with one line and asks whether it may put a few questions to you. Stay on this page: the transcript and the result appear here when the call ends, and nowhere else."}
          </p>
        </div>
      </Panel>
    );
  }

  const { check } = stage;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Badge tone={check.status === "completed" ? "good" : "warn"} dot>
            {check.status === "completed" ? "Call ended" : "Call failed"}
          </Badge>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {stage.name} · <span className="mono">{stage.masked}</span>
          </span>
          {check.confidence && (
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
              CALL-E confidence: {check.confidence.label} (
              <span className="mono">{check.confidence.score}</span>)
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Badge tone="neutral">Not saved</Badge>
          <Button size="sm" variant="ghost" onClick={startOver}>
            Call another number
          </Button>
        </div>
      </Panel>

      {check.reasons.length > 0 && (
        <Panel>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>For a person to read</p>
          <ul
            style={{
              display: "grid",
              gap: 6,
              paddingLeft: 18,
              fontSize: 13.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            {check.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>What came back</h2>
        {check.result ? (
          <CallResult result={check.result} questions={stage.questions} />
        ) : (
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 620 }}>
            CALL-E returned no structured result. It declines to invent answers it cannot ground
            in the transcript; read the transcript below.
          </p>
        )}
      </Panel>

      {check.transcript.length > 0 && (
        <Panel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Transcript</h2>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>what was actually said</span>
          </div>
          <Transcript turns={check.transcript} candidateFirstName={stage.name.split(" ")[0]} />
        </Panel>
      )}
    </div>
  );
}
