import { describe, expect, it, vi } from "vitest";
import { createCallePort } from "./port";
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

  it("refuses a phone number that is not E.164", async () => {
    const outcome = await livePort().dial(dialRequest({ phone: "9876543210" }));
    expect(outcome).toMatchObject({ ok: false, refusal: "invalid_phone" });
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
