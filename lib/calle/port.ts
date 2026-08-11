import { CalleClient, type Call, type JsonObject } from "@call-e/calle";
import { inspectScript, type GuardFinding } from "@/lib/script/guard";

/**
 * The only way OpenLine places a phone call.
 *
 * Two checks stand between a script and a dial tone, enforced here rather
 * than at the call sites so no code path can skip them:
 *
 *   - the prohibited-topic guard must pass — the model that wrote the
 *     questions is never trusted to have obeyed its instructions
 *   - the number must be real E.164 — a malformed number is refused with a
 *     reason, never "fixed" by guessing
 *
 * If both hold and a key is configured, the call is placed. A number on
 * file is a number that gets called — that is the product.
 */

export interface CallePortConfig {
  apiKey: string;
  /**
   * BCP 47 hint that decides how the agent sounds — `en-US` for an American
   * voice, `en-IN` for Indian English, and so on. The only voice control
   * CALL-E's Calls API exposes; one value for every call.
   *
   * Deliberately not `region`: that field is the recipient's own country,
   * used for routing and compliance, and already implied by the E.164 number.
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
  | "invalid_phone"
  | "missing_api_key"
  | "api_error";

export type DialOutcome =
  | { ok: true; call: Call }
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
}

export function createCallePort(config: CallePortConfig): CallePort {
  const { apiKey, baseUrl, fetch } = config;

  const client = () =>
    new CalleClient({
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
      ...(fetch ? { fetch } : {}),
    });

  return {
    async dial(request: DialRequest): Promise<DialOutcome> {
      // 1. The script must be lawful. The guard already ran on generation and
      //    on every edit; running it again here means no future code path can
      //    dial an unchecked script by accident.
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

      if (!apiKey) {
        return {
          ok: false,
          refusal: "missing_api_key",
          detail: "CALLE_API_KEY is not set, so calls cannot be placed.",
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

        return { ok: true, call };
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

/** Build a port from environment configuration. */
export function callePortFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CallePort {
  return createCallePort({
    apiKey: env.CALLE_API_KEY ?? "",
    // American English unless told otherwise. Configurable without a code
    // change, since which voice sounds right is a judgement, not a constant.
    locale: env.OPENLINE_CALL_LOCALE?.trim() || "en-US",
    ...(env.CALLE_BASE_URL ? { baseUrl: env.CALLE_BASE_URL } : {}),
  });
}
