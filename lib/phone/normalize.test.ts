import { describe, expect, it } from "vitest";
import { normalizePhone } from "./normalize";

describe("normalizePhone", () => {
  // The fixtures are from the ACMA range Australia reserves for fiction
  // (0491 570 006 and friends), which can never connect. The seeded roster
  // is Indian, but India publishes no reserved range, so a plausible +91
  // number in a public repository is probably somebody's phone. Australian
  // numbers exercise the same résumé habits — a trunk "0", an IDD prefix
  // instead of "+", brackets, spaces — against a real numbering plan.
  describe("résumé formats: trunk prefix, IDD prefix, brackets, spaces", () => {
    it.each([
      ["+61 491 570 006", "+61491570006"],
      ["+61491570006", "+61491570006"],
      ["+61-491-570-006", "+61491570006"],
      ["491 570 006", "+61491570006"],
      ["+61 (491) 570 006", "+61491570006"],
      // Trunk prefix, as typed on most résumés.
      ["0491 570 006", "+61491570006"],
      // IDD prefix instead of "+".
      ["0011 61 491 570 006", "+61491570006"],
    ])("normalizes %s to %s", (raw, expected) => {
      const result = normalizePhone(raw, "AU");
      expect(result).toEqual({ ok: true, e164: expected });
    });
  });

  it("normalizes an international number regardless of default region", () => {
    // A +1 number must not be mangled by an IN default.
    expect(normalizePhone("+1 415 555 0132", "IN")).toEqual({
      ok: true,
      e164: "+14155550132",
    });
  });

  describe("rejects rather than guessing", () => {
    it.each([
      ["", "empty"],
      ["   ", "empty"],
      ["not a phone number", "unparseable"],
      ["12345", "invalid"],
      ["+61 12345", "invalid"],
    ])("rejects %j", (raw) => {
      const result = normalizePhone(raw, "IN");
      expect(result.ok).toBe(false);
    });

    it("rejects a bare national number when no default region is known", () => {
      // Without a region, a national number is ambiguous. Guessing here would
      // dial a stranger in another country, so we refuse.
      const result = normalizePhone("0491 570 006", undefined);
      expect(result).toEqual({ ok: false, reason: "no_region" });
    });

    it("reports why it refused, so the UI can explain it", () => {
      const result = normalizePhone("not a phone number", "IN");
      expect(result).toMatchObject({ ok: false, reason: "unparseable" });
    });
  });

  it("strips extensions rather than dialing them", () => {
    expect(normalizePhone("+61 491 570 006 ext. 22", "AU")).toEqual({
      ok: true,
      e164: "+61491570006",
    });
  });
});
