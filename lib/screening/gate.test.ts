import { describe, expect, it } from "vitest";
import { checkDialIntent, operatorVerdict } from "./gate";

describe("checkDialIntent — the confirmation names a person and a version", () => {
  const row = { candidateId: "cand_1", scriptVersion: 2 };

  it("passes when the confirmed candidate and version match the row", () => {
    expect(checkDialIntent(row, { candidateId: "cand_1", scriptVersion: 2 })).toEqual({
      ok: true,
    });
  });

  it("refuses when the script was edited after the recruiter confirmed", () => {
    const verdict = checkDialIntent(row, { candidateId: "cand_1", scriptVersion: 1 });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/changed after you confirmed/);
  });

  it("refuses when the confirmation was for someone else", () => {
    const verdict = checkDialIntent(row, { candidateId: "cand_2", scriptVersion: 2 });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/different candidate/);
  });
});

describe("operatorVerdict — who may press the button", () => {
  it("is open locally when no token is configured", () => {
    expect(
      operatorVerdict({
        configuredToken: undefined,
        presentedToken: undefined,
        mode: "live",
        production: false,
      }),
    ).toEqual({ ok: true });
  });

  it("fails closed on a production deployment with a live key and no token", () => {
    const verdict = operatorVerdict({
      configuredToken: "",
      presentedToken: undefined,
      mode: "live",
      production: true,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/OPENLINE_OPERATOR_TOKEN/);
  });

  it("stays open in production when calls are faked or off", () => {
    for (const mode of ["fake", "off"] as const) {
      expect(
        operatorVerdict({
          configuredToken: undefined,
          presentedToken: undefined,
          mode,
          production: true,
        }),
      ).toEqual({ ok: true });
    }
  });

  it("accepts the configured token and nothing else", () => {
    const base = { configuredToken: "s3cret-token", mode: "live" as const, production: true };
    expect(operatorVerdict({ ...base, presentedToken: "s3cret-token" })).toEqual({ ok: true });
    expect(operatorVerdict({ ...base, presentedToken: "s3cret-tokeN" }).ok).toBe(false);
    expect(operatorVerdict({ ...base, presentedToken: "short" }).ok).toBe(false);
    expect(operatorVerdict({ ...base, presentedToken: undefined }).ok).toBe(false);
  });
});
