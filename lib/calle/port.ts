import { CalleClient, type Call, type JsonObject } from "@call-e/calle";
import { inspectScript, type GuardFinding } from "@/lib/script/guard";
import { maskPhone } from "@/lib/phone/normalize";
import { createFakeCalleFetch } from "./fake-server";
import { FAKE_SCREENING } from "./fake-demo";

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
  /**
   * Transport override. Only the fake server uses this; there is deliberately
   * no `baseUrl` — the SDK's default is the official origin, and a key that
   * can be pointed at any host is a key that can be stolen by an env var.
   */
  fetch?: (input: Request) => Promise<Response>;
}

/**
 * How this process may talk to CALL-E.
 *
 *   live — a key is set; a candidate with a number on file really gets dialed
 *   fake — OPENLINE_FAKE_CALLE is set; the SDK runs against an in-process fake
 *          and no key ever leaves the machine, even if one is configured
 *   off  — neither; scripts can be built and read, and every dial is refused
 */
export type CalleMode = "live" | "fake" | "off";

/** The subset of the environment the port reads. */
export type CalleEnv = Record<string, string | undefined>;

export function resolveCalleMode(env: CalleEnv = process.env): CalleMode {
  const fake = env.OPENLINE_FAKE_CALLE?.trim().toLowerCase();
  if (fake && fake !== "0" && fake !== "false") return "fake";
  return env.CALLE_API_KEY?.trim() ? "live" : "off";
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
  const { apiKey, fetch } = config;

  const client = () =>
    new CalleClient({
      apiKey,
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
          detail: `The number on file (${maskPhone(request.phone)}) is not E.164, so it was not dialed.`,
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
export function callePortFromEnv(env: CalleEnv = process.env): CallePort {
  // American English unless told otherwise. Configurable without a code
  // change, since which voice sounds right is a judgement, not a constant.
  const locale = env.OPENLINE_CALL_LOCALE?.trim() || "en-US";

  if (resolveCalleMode(env) === "fake") {
    // The real key, if any, is not passed: a fake transport must never be
    // one env var away from receiving production credentials.
    return createCallePort({
      apiKey: "fake",
      locale,
      fetch: createFakeCalleFetch(FAKE_SCREENING),
    });
  }

  return createCallePort({ apiKey: env.CALLE_API_KEY ?? "", locale });
}
