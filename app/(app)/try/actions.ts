"use server";

import type { Call } from "@call-e/calle";
import { callePortFromEnv } from "@/lib/calle/port";
import { getJob } from "@/lib/db/queries";
import { acceptsCalls, closedReason } from "@/lib/jobs/status";
import { isCallLanguage, unreadLanguageReason } from "@/lib/jobs/language";
import { maskPhone, normalizePhone } from "@/lib/phone/normalize";
import { operatorStatus } from "@/lib/operator";
import { inspectTranscript, type InspectableTurn } from "@/lib/script/guard";
import { needsHuman, SCREENING_RESULT_SCHEMA, type ScreeningResult } from "@/lib/script/schema";
import type { ScriptQuestion } from "@/lib/script/build";
import { flattenTranscript, readResult } from "@/lib/screening/dispatch";
import { composeScript } from "@/lib/screening/preview";
import {
  PHONE_REFUSAL_COPY,
  cleanFirstName,
  isCallId,
  isRequestId,
  isUuid,
} from "@/lib/screening/try";

/**
 * Try a call: ring one number with the real screening script, and keep nothing.
 *
 * This is the one dial in OpenLine that writes no row before it dials, and
 * that is the point of it. A judge types a name and their own number, hears
 * the call, reads the result, and leaves nothing of themselves in the
 * database. The price is the one CLAUDE.md warns about: CALL-E cannot list
 * calls, so if the page closes mid-call, its result is not readable here
 * again. Every other safety step matches a queued call: the operator token, an
 * open job, a number normalized to E.164 or refused, the guard over the
 * assembled script and again inside the port, the AI disclosure and consent
 * line, and a one-time idempotency key so a double click is one call.
 */

export type TryStart =
  | { ok: true; callId: string; masked: string; questions: ScriptQuestion[]; locale: string }
  | { ok: false; reason: string };

export async function startTryCall(input: {
  jobId: string;
  name: string;
  phone: string;
  language: string;
  attested: boolean;
  requestId: string;
}): Promise<TryStart> {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false, reason: operator.reason };

  if (!input.attested) {
    return { ok: false, reason: "Confirm the number is yours, or that its owner agreed to the call." };
  }
  if (!isRequestId(input.requestId)) {
    return { ok: false, reason: "Reload the page and try again." };
  }

  const name = cleanFirstName(input.name);
  if (!name.ok) return { ok: false, reason: name.reason };

  // No default region: a number without its country code is refused, never
  // guessed, because the same digits are a real line in several countries.
  const phone = normalizePhone(input.phone);
  if (!phone.ok) {
    return { ok: false, reason: PHONE_REFUSAL_COPY[phone.reason] ?? "That number cannot be dialed." };
  }

  if (!isUuid(input.jobId)) return { ok: false, reason: "Pick a job." };
  const job = await getJob(input.jobId);
  if (!job) return { ok: false, reason: "That job no longer exists." };
  if (!acceptsCalls(job.status)) {
    return { ok: false, reason: closedReason(job.status, job.statusReason) };
  }

  // Only a tag from the curated list reaches the API.
  const locale = isCallLanguage(input.language) ? input.language : job.language;
  const { questions, task, guard } = composeScript(job, { name: name.name }, locale);
  if (!guard.ok) {
    return { ok: false, reason: "The script failed the prohibited-topic check, so nothing was dialed." };
  }

  const dial = await callePortFromEnv().dial({
    task,
    phone: phone.e164,
    resultSchema: SCREENING_RESULT_SCHEMA as unknown as Record<string, unknown>,
    idempotencyKey: `try:${input.requestId}`,
    // Nothing that identifies the person; CALL-E already holds the number.
    metadata: { kind: "try-a-call", jobId: job.id },
    ...(isCallLanguage(locale) ? { locale } : {}),
  });
  if (!dial.ok) return { ok: false, reason: dial.detail };

  return { ok: true, callId: dial.call.id, masked: maskPhone(phone.e164), questions, locale };
}

export type TryCheck =
  | { ok: false; reason: string }
  | { ok: true; done: false; status: string }
  | {
      ok: true;
      done: true;
      status: string;
      transcript: InspectableTurn[];
      result: ScreeningResult | null;
      confidence: { score: number; label: string } | null;
      reasons: string[];
    };

export async function checkTryCall(callId: string, locale: string): Promise<TryCheck> {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false, reason: operator.reason };
  if (!isCallId(callId)) return { ok: false, reason: "That is not a call id." };

  let call: Call;
  try {
    // Re-fetched through the authenticated API every time; nothing the page
    // sends back about the call is trusted.
    call = await callePortFromEnv().fetchCall(callId);
  } catch {
    return { ok: false, reason: "CALL-E did not answer just now." };
  }

  if (call.status !== "completed" && call.status !== "failed") {
    return { ok: true, done: false, status: call.status };
  }

  // The same post-call reading a queued call gets: the guard over what the
  // agent actually said, and the same needs-a-person routing.
  const transcript = flattenTranscript(call);
  const result = readResult(call);
  const guard = inspectTranscript(transcript);
  const confidence = call.completionConfidence ?? null;
  const routing = needsHuman({ structuredResult: result, completionConfidence: confidence, guardClean: guard.ok });
  // The language CALL-E says it used wins over what the page sent back.
  const calledIn = call.recipients[0]?.locale ?? locale;
  const languageReason = isCallLanguage(calledIn) ? unreadLanguageReason(calledIn) : null;
  if (languageReason) routing.reasons.push(languageReason);

  return {
    ok: true,
    done: true,
    status: call.status,
    transcript,
    result,
    confidence,
    reasons: routing.reasons,
  };
}
