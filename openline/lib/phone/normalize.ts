import { parsePhoneNumberWithError, type CountryCode } from "libphonenumber-js";

/**
 * Phone normalization for OpenLine.
 *
 * Résumé phone numbers arrive as free text — "+91 98765 43210", "9876543210",
 * "091-98765-43210". CALL-E requires strict E.164 (`^\+[1-9]\d{6,14}$`), so every
 * number is normalized before it can be dialed.
 *
 * The governing rule is: never guess. A number we cannot confidently resolve is
 * refused with a reason, because the failure mode of guessing is calling a
 * stranger who never applied for the job.
 */

export type RejectionReason =
  | "empty"
  | "unparseable"
  | "invalid"
  | "no_region";

export type NormalizedPhone =
  | { ok: true; e164: string }
  | { ok: false; reason: RejectionReason };

export type PickedPhone =
  | { ok: true; e164: string }
  | { ok: false; rejected: Array<{ raw: string; reason: RejectionReason }> };

/**
 * Normalize one free-text phone number to E.164.
 *
 * `defaultRegion` is only consulted for numbers written without a country code.
 * A number that already carries `+` is parsed internationally, so an American
 * number in an Indian candidate list still resolves correctly.
 */
export function normalizePhone(
  raw: string,
  defaultRegion?: CountryCode,
): NormalizedPhone {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") return { ok: false, reason: "empty" };

  const hasCountryCode = trimmed.startsWith("+");

  // A bare national number is meaningless without a region. Refusing here is
  // deliberate: the same ten digits are a valid subscriber in many countries.
  if (!hasCountryCode && !defaultRegion) {
    return { ok: false, reason: "no_region" };
  }

  try {
    const parsed = parsePhoneNumberWithError(
      trimmed,
      hasCountryCode ? undefined : defaultRegion,
    );

    // `isValid` checks the number against the country's numbering plan, unlike
    // `isPossible` which only checks length. Screening calls cost money and
    // reach real people, so we require the stricter check.
    if (!parsed.isValid()) return { ok: false, reason: "invalid" };

    // `.number` is the E.164 form and excludes any extension, which we cannot dial.
    return { ok: true, e164: parsed.number };
  } catch {
    return { ok: false, reason: "unparseable" };
  }
}

/**
 * Choose one callable number from a résumé's phone list.
 *
 * Returns the first entry that normalizes successfully. When nothing is callable
 * it reports every rejection so the UI can tell the recruiter what it saw rather
 * than silently dropping the candidate.
 */
export function pickCallablePhone(
  raws: string[],
  defaultRegion?: CountryCode,
): PickedPhone {
  const rejected: Array<{ raw: string; reason: RejectionReason }> = [];

  for (const raw of raws) {
    const result = normalizePhone(raw, defaultRegion);
    if (result.ok) return result;
    rejected.push({ raw, reason: result.reason });
  }

  return { ok: false, rejected };
}

/**
 * Normalize a list to the distinct set of callable numbers.
 *
 * Used when importing a candidate roster: two résumés carrying the same number
 * in different formats must not become two calls to the same person.
 */
export function distinctCallablePhones(
  raws: string[],
  defaultRegion?: CountryCode,
): string[] {
  const seen = new Set<string>();
  for (const raw of raws) {
    const result = normalizePhone(raw, defaultRegion);
    if (result.ok) seen.add(result.e164);
  }
  return [...seen];
}
