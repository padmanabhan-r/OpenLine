import { timingSafeEqual } from "node:crypto";
import type { CalleMode } from "@/lib/calle/port";

/**
 * The two checks that stand between a click and `startCall`.
 *
 * Both are pure so they can be tested without a request or a database, and
 * both live here rather than in the UI: a button is a convenience, not a gate.
 *
 *   - `checkDialIntent` — the recruiter confirmed a specific script version for
 *     a specific person. If the row moved underneath them (an edit bumped the
 *     version, a stale tab named someone else), the dial is refused and they
 *     read the new words before confirming again.
 *   - `operatorVerdict` — anyone who can reach the console can press the
 *     button, so a deployment that can ring real phones must be unlocked with
 *     an operator token first. Locally, with no token configured, the console
 *     is open; in production with a live key, no token means no calls.
 */

export interface DialIntent {
  candidateId: string;
  scriptVersion: number;
}

export type GateVerdict = { ok: true } | { ok: false; reason: string };

export function checkDialIntent(
  row: { candidateId: string; scriptVersion: number },
  intent: DialIntent,
): GateVerdict {
  if (row.candidateId !== intent.candidateId) {
    return {
      ok: false,
      reason: "This confirmation was for a different candidate. Reload and confirm again.",
    };
  }
  if (row.scriptVersion !== intent.scriptVersion) {
    return {
      ok: false,
      reason:
        "The script changed after you confirmed it. Read the new version, then confirm again.",
    };
  }
  return { ok: true };
}

export const OPERATOR_LOCKED_REASON =
  "The console is locked. Enter the operator token under Unlock to place calls or upload resumes.";

export function operatorVerdict(input: {
  configuredToken: string | undefined;
  presentedToken: string | undefined;
  mode: CalleMode;
  production: boolean;
}): GateVerdict {
  const configured = input.configuredToken?.trim() ?? "";

  if (!configured) {
    // No token at all. Fine on a laptop; not fine on a public URL that can
    // ring a real phone. Fail closed rather than trust that nobody finds it.
    if (input.production && input.mode === "live") {
      return {
        ok: false,
        reason:
          "OPENLINE_OPERATOR_TOKEN is not set, so this deployment cannot place live calls.",
      };
    }
    return { ok: true };
  }

  const presented = input.presentedToken ?? "";
  if (presented.length !== configured.length) {
    return { ok: false, reason: OPERATOR_LOCKED_REASON };
  }
  const same = timingSafeEqual(Buffer.from(presented), Buffer.from(configured));
  return same ? { ok: true } : { ok: false, reason: OPERATOR_LOCKED_REASON };
}
