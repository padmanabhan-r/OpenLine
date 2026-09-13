import { describe, expect, it, vi } from "vitest";
import { callePortFromEnv, createCallePort, resolveCalleMode } from "./port";
import { createFakeCalleFetch } from "./fake-server";

/**
 * US fiction-reserved (555-01xx), so this number can never connect.
 * India publishes no reserved range, so a plausible +91 number in a public
 * repository is very likely someone's real phone. The port only cares that a
 * number is E.164 and on the allowlist, so the country is irrelevant here.
 */
const TEST_PHONE = "+14155550114";

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reached_candidate"],
  properties: {
    reached_candidate: { type: "string", enum: ["yes", "no", "unknown"] },
  },
} as const;

const dialRequest = (overrides: Partial<Parameters<
  ReturnType<typeof createCallePort>["dial"]
>[0]> = {}) => ({
  task: "Call Priya about the Senior Backend Engineer role. Ask her notice period.",
  phone: TEST_PHONE,
  resultSchema: RESULT_SCHEMA as unknown as Record<string, unknown>,
  idempotencyKey: "job1:cand1:v1",
  ...overrides,
});

describe("createCallePort — refuses rather than dialing", () => {
  const livePort = (overrides = {}) =>
    createCallePort({
      apiKey: "test",
      fetch: createFakeCalleFetch(),
      ...overrides,
    });

  it("refuses a script that fails the prohibited-topic guard", async () => {
    const fetch = vi.fn();
    const outcome = await livePort({ fetch }).dial(
      dialRequest({ task: "Call Priya and ask how old she is." }),
    );

    expect(outcome).toMatchObject({ ok: false, refusal: "guard_violation" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a phone number that is not E.164, without echoing it", async () => {
    const outcome = await livePort().dial(dialRequest({ phone: "415-555-0114" }));
    expect(outcome).toMatchObject({ ok: false, refusal: "invalid_phone" });
    // The refusal is stored on the row and shown to the recruiter, so it
    // must not carry the number it refused.
    if (!outcome.ok) {
      expect(outcome.detail).not.toContain("415-555-0114");
      expect(outcome.detail).toContain("0114");
    }
  });

  it("refuses with no API key", async () => {
    const outcome = await livePort({ apiKey: "" }).dial(dialRequest());
    expect(outcome).toMatchObject({ ok: false, refusal: "missing_api_key" });
  });
});

describe("createCallePort — dialing through the fake CALL-E server", () => {
  it("creates a call and returns the terminal result", async () => {
    const port = createCallePort({
      apiKey: "test",
      fetch: createFakeCalleFetch({
        structuredResult: { reached_candidate: "yes" },
      }),
    });

    const outcome = await port.dial(dialRequest());

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.call.id).toMatch(/^call_/);
      expect(outcome.call.structuredResult).toEqual({
        reached_candidate: "yes",
      });
    }
  });

  it("passes the idempotency key so a retried dispatch does not double-dial", async () => {
    const fake = createFakeCalleFetch();
    const port = createCallePort({
      apiKey: "test",
      fetch: fake,
    });

    await port.dial(dialRequest({ idempotencyKey: "stable-key" }));
    expect(fake.lastIdempotencyKey()).toBe("stable-key");
  });

  it("sends the configured locale, which is the only control over how the agent sounds", async () => {
    const fake = createFakeCalleFetch();
    const port = createCallePort({
      apiKey: "test",
      locale: "en-US",
      fetch: fake,
    });

    await port.dial(dialRequest());

    const [body] = fake.createdCalls();
    const recipients = body.recipients as Array<{
      phones: string[];
      locale?: string;
    }>;
    expect(recipients[0].locale).toBe("en-US");
    // The recipient's own country is not ours to assert — it is implied by the
    // E.164 number and used for compliance, so the port must not invent one.
    expect(recipients[0]).not.toHaveProperty("region");
  });

  it("lets a call carry its own locale — the job's language — over the configured one", async () => {
    const fake = createFakeCalleFetch();
    const port = createCallePort({ apiKey: "test", locale: "en-US", fetch: fake });

    await port.dial(dialRequest({ locale: "ta-IN" }));

    const [body] = fake.createdCalls();
    const recipients = body.recipients as Array<{ locale?: string }>;
    expect(recipients[0].locale).toBe("ta-IN");
    expect(recipients[0]).not.toHaveProperty("region");
  });

  it("omits locale entirely when none is configured", async () => {
    const fake = createFakeCalleFetch();
    const port = createCallePort({
      apiKey: "test",
      fetch: fake,
    });

    await port.dial(dialRequest());

    const [body] = fake.createdCalls();
    const recipients = body.recipients as Array<Record<string, unknown>>;
    expect(recipients[0]).not.toHaveProperty("locale");
  });

  it("only ever sends the key to the official CALL-E origin", async () => {
    // There is no baseUrl option on purpose. A key that can be redirected by
    // an environment variable is a key that can be exfiltrated by one.
    const seen: string[] = [];
    const fake = createFakeCalleFetch();
    const port = createCallePort({
      apiKey: "test",
      fetch: (input) => {
        seen.push(new URL(input.url).origin);
        return fake(input);
      },
    });

    await port.dial(dialRequest());
    expect(seen).toEqual(["https://api.heycall-e.com"]);
  });

  it("surfaces a CALL-E API error as a refusal rather than throwing", async () => {
    const port = createCallePort({
      apiKey: "test",
      fetch: createFakeCalleFetch({
        failWith: { status: 402, code: "insufficient_balance" },
      }),
    });

    const outcome = await port.dial(dialRequest());
    expect(outcome).toMatchObject({ ok: false, refusal: "api_error" });
    if (!outcome.ok) expect(outcome.detail).toContain("insufficient_balance");
  });
});

describe("fetchCall — re-fetch used by the reconciler", () => {
  it("reads a call back by id", async () => {
    const port = createCallePort({
      apiKey: "test",
      fetch: createFakeCalleFetch({
        structuredResult: { reached_candidate: "no" },
      }),
    });

    const call = await port.fetchCall("call_abc123");
    expect(call.id).toBe("call_abc123");
    expect(call.structuredResult).toEqual({ reached_candidate: "no" });
  });
});

describe("resolveCalleMode — what this process may do", () => {
  it("is off with no key, live with one, and fake when asked", () => {
    expect(resolveCalleMode({})).toBe("off");
    expect(resolveCalleMode({ CALLE_API_KEY: "k" })).toBe("live");
    expect(resolveCalleMode({ CALLE_API_KEY: "k", OPENLINE_FAKE_CALLE: "1" })).toBe("fake");
    expect(resolveCalleMode({ OPENLINE_FAKE_CALLE: "true" })).toBe("fake");
    expect(resolveCalleMode({ OPENLINE_FAKE_CALLE: "0", CALLE_API_KEY: "k" })).toBe("live");
  });
});

describe("callePortFromEnv — fake mode", () => {
  it("completes a screening call in-process, greeting the candidate by name", async () => {
    const port = callePortFromEnv({ OPENLINE_FAKE_CALLE: "1", CALLE_API_KEY: "must-not-be-used" });

    const outcome = await port.dial(
      dialRequest({
        task: "You are calling Asha Menon about their application for the Senior AI Engineer role at Northwind Payments.\n\nAsk in order: - [q1] Are you still interested?",
      }),
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // A second port, as finishCall builds one — it must remember the task.
    const later = callePortFromEnv({ OPENLINE_FAKE_CALLE: "1" });
    const call = await later.waitForCall(outcome.call.id);
    expect(call.status).toBe("completed");
    expect(call.recipients[0].attempts[0].transcriptTurns[0].text).toMatch(/^Hi, is this Asha Menon\?/);
    expect(call.structuredResult).toMatchObject({ consent_given: "yes", reached_candidate: "yes" });
  });

  it("still refuses a script the guard rejects, even when nothing would ring", async () => {
    const port = callePortFromEnv({ OPENLINE_FAKE_CALLE: "1" });
    const outcome = await port.dial(dialRequest({ task: "Call Priya and ask how old she is." }));
    expect(outcome).toMatchObject({ ok: false, refusal: "guard_violation" });
  });
});
