import { CalleClient, type Call, type JsonObject } from "@call-e/calle";
import { inspectScript, type GuardFinding } from "@/lib/script/guard";
import { callAllowlist, liveCallsEnabled } from "@/lib/config";

/**
 * The only way OpenLine places a phone call.
 *
 * Everything that could cause real-world harm is enforced here rather than at
 * the call sites, so there is no code path that dials without passing all of it:
 *
 *   - the prohibited-topic guard must pass
 *   - the number must be E.164 and on the allowlist
 *   - live mode must be explicitly enabled and hold an API key
 *
 * Dry run is the default. A publicly deployed demo therefore cannot spend money
 * or telephone a stranger, which is what makes the app safe to hand to judges.
 */

export type DialMode = "dry_run" | "live";

export interface CallePortConfig {
  mode: DialMode;
  apiKey: string;
  /** E.164 numbers this deployment is permitted to call. Empty means nobody. */
  allowlist: string[];
  /**
   * BCP 47 hint that decides how the agent sounds — `en-US` for an American
   * voice, `en-IN` for Indian English, and so on.
   *
   * It is the only voice control CALL-E's Calls API exposes: there is no voice
   * id, gender, or speed parameter. One value is used for every call, because
   * a screening line that changes accent between candidates is a strange thing
   * to ship.
   *
   * Note this is deliberately not `region`. That field is the recipient's own
   * country, used for routing and compliance, and it is already implied by the
   * E.164 number — sending `US` for an Indian mobile would be a lie told to the
   * part of the system that checks whether the call is permitted.
   */
  locale?: string;
  baseUrl?: string;
  fetch?: (input: Request) => Promise<Response>;
}

export interface DialRequest {
  task: string;
  /** E.164. Produced by lib/phone/normalize. */
  phone: string;
  resultSchema: JsonObject;
  metadata?: JsonObject;
  /** Business-stable, so a retried dispatch cannot double-dial. */
  idempotencyKey: string;
}

export type RefusalReason =
  | "guard_violation"
  | "not_allowlisted"
  | "invalid_phone"
  | "missing_api_key"
  | "api_error";

export interface DialPreview {
  task: string;
  phone: string;
  resultSchema: JsonObject;
  idempotencyKey: string;
}

export type DialOutcome =
  | { ok: true; mode: "dry_run"; preview: DialPreview }
  | { ok: true; mode: "live"; call: Call }
  | {
      ok: false;
      refusal: RefusalReason;
      detail: string;
      findings?: GuardFinding[];
    };

const E164 = /^\+[1-9]\d{6,14}$/;

export interface CallePort {
  dial(request: DialRequest): Promise<DialOutcome>;
  /**
   * Read a call back by id — how the reconciler rescues a row whose
   * detached waiter died with the process.
   */
  fetchCall(callId: string): Promise<Call>;
  /** Poll until the call reaches a terminal state. */
  waitForCall(
    callId: string,
    options?: { timeoutMs?: number; intervalMs?: number },
  ): Promise<Call>;
  readonly mode: DialMode;
}

export function createCallePort(config: CallePortConfig): CallePort {
  const { mode, apiKey, allowlist, baseUrl, fetch } = config;

  const client = () =>
    new CalleClient({
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
      ...(fetch ? { fetch } : {}),
    });

  return {
    mode,

    async dial(request: DialRequest): Promise<DialOutcome> {
      // 1. The script must be lawful. Checked in every mode so the dry-run
      //    preview surfaces violations before anyone tries to go live.
      const guard = inspectScript(request.task);
      if (!guard.ok) {
        return {
          ok: false,
          refusal: "guard_violation",
          detail: `Script contains ${guard.findings.length} prohibited question(s): ${guard.findings
            .map((f) => f.category)
            .join(", ")}`,
          findings: guard.findings,
        };
      }

      // 2. The number must be dialable. CALL-E enforces E.164 too, but failing
      //    here keeps the reason legible instead of surfacing a 422.
      if (!E164.test(request.phone)) {
        return {
          ok: false,
          refusal: "invalid_phone",
          detail: `"${request.phone}" is not an E.164 number.`,
        };
      }

      if (mode === "dry_run") {
        return {
          ok: true,
          mode: "dry_run",
          preview: {
            task: request.task,
            phone: request.phone,
            resultSchema: request.resultSchema,
            idempotencyKey: request.idempotencyKey,
          },
        };
      }

      // 3. Live dialing needs explicit permission for this specific number.
      if (!allowlist.includes(request.phone)) {
        return {
          ok: false,
          refusal: "not_allowlisted",
          detail: `${request.phone} is not on this deployment's call allowlist.`,
        };
      }

      if (!apiKey) {
        return {
          ok: false,
          refusal: "missing_api_key",
          detail: "CALLE_API_KEY is not set, so live dialing is unavailable.",
        };
      }

      try {
        const call = await client().calls.create(
          {
            task: request.task,
            recipients: [
              {
                phones: [request.phone],
                ...(config.locale ? { locale: config.locale } : {}),
              },
            ],
            resultSchema: request.resultSchema,
            ...(request.metadata ? { metadata: request.metadata } : {}),
          },
          { idempotencyKey: request.idempotencyKey },
        );

        return { ok: true, mode: "live", call };
      } catch (error) {
        // A failed create is a refusal, not a crash — the dispatcher continues
        // with the rest of the queue.
        const detail =
          error instanceof Error
            ? `${(error as { code?: string }).code ?? "error"}: ${error.message}`
            : String(error);
        return { ok: false, refusal: "api_error", detail };
      }
    },

    async fetchCall(callId: string): Promise<Call> {
      return client().calls.get(callId);
    },

    async waitForCall(
      callId: string,
      options: { timeoutMs?: number; intervalMs?: number } = {},
    ): Promise<Call> {
      // A screening call runs a few minutes; the SDK's default timeout is
      // shorter than that, so it is raised deliberately here.
      return client().calls.waitForResult(callId, {
        timeoutMs: options.timeoutMs ?? 10 * 60_000,
        intervalMs: options.intervalMs ?? 4_000,
      });
    },
  };
}

/** Build a port from environment configuration. Dry run unless explicitly enabled. */
export function callePortFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CallePort {
  return createCallePort({
    mode: liveCallsEnabled(env) ? "live" : "dry_run",
    apiKey: env.CALLE_API_KEY ?? "",
    allowlist: callAllowlist(env),
    // American English unless told otherwise. Configurable without a code
    // change, since which voice sounds right is a judgement, not a constant.
    locale: env.OPENLINE_CALL_LOCALE?.trim() || "en-US",
    ...(env.CALLE_BASE_URL ? { baseUrl: env.CALLE_BASE_URL } : {}),
  });
}
