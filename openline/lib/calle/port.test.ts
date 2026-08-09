import { describe, expect, it, vi } from "vitest";
import { createCallePort } from "./port";
import { createFakeCalleFetch } from "./fake-server";

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
  phone: "+919876543210",
  resultSchema: RESULT_SCHEMA as unknown as Record<string, unknown>,
  idempotencyKey: "job1:cand1:v1",
  ...overrides,
});

describe("createCallePort — dry run is the default", () => {
  it("does not dial when mode is dry_run", async () => {
    const fetch = vi.fn();
    const port = createCallePort({
      mode: "dry_run",
      apiKey: "test",
      allowlist: ["+919876543210"],
      fetch,
    });

    const outcome = await port.dial(dialRequest());

    expect(fetch).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.mode).toBe("dry_run");
  });

  it("returns the exact task text that would be spoken", async () => {
    const port = createCallePort({
      mode: "dry_run",
      apiKey: "test",
      allowlist: [],
      fetch: vi.fn(),
    });

    const outcome = await port.dial(dialRequest({ task: "Hello there." }));

    expect(outcome.ok).toBe(true);
    if (outcome.ok && outcome.mode === "dry_run") {
      expect(outcome.preview.task).toBe("Hello there.");
      expect(outcome.preview.phone).toBe("+919876543210");
    }
  });
});

describe("createCallePort — refuses rather than dialing", () => {
  const livePort = (overrides = {}) =>
    createCallePort({
      mode: "live",
      apiKey: "test",
      allowlist: ["+919876543210"],
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

  it("refuses a number that is not on the allowlist", async () => {
    const fetch = vi.fn();
    const outcome = await livePort({ fetch }).dial(
      dialRequest({ phone: "+14155550132" }),
    );

    expect(outcome).toMatchObject({ ok: false, refusal: "not_allowlisted" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a phone number that is not E.164", async () => {
    const outcome = await livePort().dial(dialRequest({ phone: "9876543210" }));
    expect(outcome).toMatchObject({ ok: false, refusal: "invalid_phone" });
  });

  it("refuses live mode with no API key", async () => {
    const outcome = await livePort({ apiKey: "" }).dial(dialRequest());
    expect(outcome).toMatchObject({ ok: false, refusal: "missing_api_key" });
  });

  it("refuses when the allowlist is empty, even in live mode", async () => {
    // An empty allowlist must mean "nobody", never "everybody".
    const outcome = await livePort({ allowlist: [] }).dial(dialRequest());
    expect(outcome).toMatchObject({ ok: false, refusal: "not_allowlisted" });
  });
});

describe("createCallePort — live dialing through the fake CALL-E server", () => {
  it("creates a call and returns the terminal result", async () => {
    const port = createCallePort({
      mode: "live",
      apiKey: "test",
      allowlist: ["+919876543210"],
      fetch: createFakeCalleFetch({
        structuredResult: { reached_candidate: "yes" },
      }),
    });

    const outcome = await port.dial(dialRequest());

    expect(outcome.ok).toBe(true);
    if (outcome.ok && outcome.mode === "live") {
      expect(outcome.call.id).toMatch(/^call_/);
      expect(outcome.call.structuredResult).toEqual({
        reached_candidate: "yes",
      });
    }
  });

  it("passes the idempotency key so a retried dispatch does not double-dial", async () => {
    const fake = createFakeCalleFetch();
    const port = createCallePort({
      mode: "live",
      apiKey: "test",
      allowlist: ["+919876543210"],
      fetch: fake,
    });

    await port.dial(dialRequest({ idempotencyKey: "stable-key" }));
    expect(fake.lastIdempotencyKey()).toBe("stable-key");
  });

  it("surfaces a CALL-E API error as a refusal rather than throwing", async () => {
    const port = createCallePort({
      mode: "live",
      apiKey: "test",
      allowlist: ["+919876543210"],
      fetch: createFakeCalleFetch({
        failWith: { status: 402, code: "insufficient_balance" },
      }),
    });

    const outcome = await port.dial(dialRequest());
    expect(outcome).toMatchObject({ ok: false, refusal: "api_error" });
    if (!outcome.ok) expect(outcome.detail).toContain("insufficient_balance");
  });
});

describe("fetchCall — re-fetch used by the webhook receiver", () => {
  it("reads a call back by id", async () => {
    const port = createCallePort({
      mode: "live",
      apiKey: "test",
      allowlist: [],
      fetch: createFakeCalleFetch({
        structuredResult: { reached_candidate: "no" },
      }),
    });

    const call = await port.fetchCall("call_abc123");
    expect(call.id).toBe("call_abc123");
    expect(call.structuredResult).toEqual({ reached_candidate: "no" });
  });
});
