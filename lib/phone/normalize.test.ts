import { describe, expect, it } from "vitest";
import { normalizePhone, pickCallablePhone } from "./normalize";

describe("normalizePhone", () => {
  describe("Indian résumé formats (the common real-world case)", () => {
    it.each([
      ["+91 98765 43210", "+919876543210"],
      ["+919876543210", "+919876543210"],
      ["+91-9876543210", "+919876543210"],
      ["9876543210", "+919876543210"],
      ["+91 (98765) 43210", "+919876543210"],
      ["98765 43210", "+919876543210"],
      // Trunk prefix, as typed on most Indian résumés.
      ["09876543210", "+919876543210"],
      // IDD prefix instead of "+".
      ["0091 98765 43210", "+919876543210"],
    ])("normalizes %s to %s", (raw, expected) => {
      const result = normalizePhone(raw, "IN");
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
      ["+91 12345", "invalid"],
    ])("rejects %j", (raw) => {
      const result = normalizePhone(raw, "IN");
      expect(result.ok).toBe(false);
    });

    it("rejects a bare national number when no default region is known", () => {
      // Without a region, "9876543210" is ambiguous. Guessing here would dial a
      // stranger in another country, so we refuse.
      const result = normalizePhone("9876543210", undefined);
      expect(result).toEqual({ ok: false, reason: "no_region" });
    });

    it("reports why it refused, so the UI can explain it", () => {
      const result = normalizePhone("not a phone number", "IN");
      expect(result).toMatchObject({ ok: false, reason: "unparseable" });
    });
  });

  it("strips extensions rather than dialing them", () => {
    expect(normalizePhone("+91 98765 43210 ext. 22", "IN")).toEqual({
      ok: true,
      e164: "+919876543210",
    });
  });
});

describe("pickCallablePhone", () => {
  it("returns the first valid number from a résumé's phone array", () => {
    const result = pickCallablePhone(["not a phone", "9876543210"], "IN");
    expect(result).toEqual({ ok: true, e164: "+919876543210" });
  });

  it("refuses when no entry is callable, listing what it saw", () => {
    const result = pickCallablePhone(["12345", "nope"], "IN");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejected).toHaveLength(2);
    }
  });

  it("refuses an empty array", () => {
    expect(pickCallablePhone([], "IN").ok).toBe(false);
  });

  it("deduplicates numbers that normalize to the same E.164", () => {
    // A résumé listing the same number twice in different formats must not
    // produce two calls to the same person.
    const result = pickCallablePhone(["+91 98765 43210", "9876543210"], "IN");
    expect(result).toEqual({ ok: true, e164: "+919876543210" });
  });
});
