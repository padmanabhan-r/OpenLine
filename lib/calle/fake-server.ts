/**
 * An in-process fake of the CALL-E Developer API.
 *
 * `CalleClient` accepts a `fetch` implementation, so the whole SDK can be
 * exercised without a network, an API key, or a real phone call. This is what
 * makes OpenLine's test suite runnable by anyone who clones the repo — and it is
 * the "no-call path" the awesome-phone-call-agents contribution guide requires.
 *
 * Responses use the wire format (snake_case), not the SDK's camelCase view, so
 * the SDK's own mapping layer is under test rather than bypassed.
 */

export interface FakeCalleOptions {
  /** Structured result returned on the terminal call. */
  structuredResult?: Record<string, unknown> | null;
  /** Transcript turns to return on the recipient's attempt. */
  transcriptTurns?: FakeTurn[];
  /**
   * Derive the transcript from the task text instead — how the app's fake
   * mode greets the candidate by the name the script actually used.
   */
  transcriptFor?: (task: string) => FakeTurn[];
  /** Terminal status. Defaults to `completed`. */
  status?: "completed" | "failed";
  /** Make the API reject the create request. */
  failWith?: { status: number; code: string; message?: string };
  /** Post-summary confidence. */
  confidence?: { score: number; label: "low" | "medium" | "high" };
}

export interface FakeTurn {
  offset_seconds: number;
  speaker: "bot" | "user" | "unknown";
  text: string;
}

export interface FakeCalleFetch {
  (input: Request): Promise<Response>;
  /** Idempotency key seen on the most recent create request. */
  lastIdempotencyKey(): string | null;
  /** Bodies of every create request received. */
  createdCalls(): Array<Record<string, unknown>>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export function createFakeCalleFetch(
  options: FakeCalleOptions = {},
): FakeCalleFetch {
  const {
    structuredResult = { reached_candidate: "yes" },
    transcriptTurns = [
      { offset_seconds: 0, speaker: "bot" as const, text: "Hello, is this Priya?" },
      { offset_seconds: 3, speaker: "user" as const, text: "Yes, speaking." },
    ],
    transcriptFor,
    status = "completed",
    failWith,
    confidence = { score: 0.92, label: "high" as const },
  } = options;

  let lastIdempotencyKey: string | null = null;
  const createdCalls: Array<Record<string, unknown>> = [];
  // Remembered so a later GET (the waiter, the reconciler) reads back the
  // same task the create request carried, as the real API would.
  const tasks = new Map<string, { task: string; phone: string }>();
  // Real CALL-E gives every call its own id and collapses a repeated create
  // with the same idempotency key onto the call it already made. The fake
  // does both: a single fixed id collided with the unique index on stored
  // call ids the second time a fake call was recorded.
  const idsByKey = new Map<string, string>();

  const buildCallTask = (id: string, task: string, phone: string) => ({
    id,
    object: "call_task",
    status,
    task,
    recipients: [
      {
        id: "rcp_fake_1",
        phones: [phone],
        locale: null,
        region: null,
        status: status === "completed" ? "completed" : "failed",
        structured_result: structuredResult,
        summary: "Fake recipient summary.",
        attempts: [
          {
            id: "att_fake_1",
            phone,
            status: status === "completed" ? "completed" : "failed",
            started_at: "2026-08-09T10:00:00Z",
            completed_at: "2026-08-09T10:02:00Z",
            summary: "Fake attempt summary.",
            transcript_turns: transcriptFor ? transcriptFor(task) : transcriptTurns,
            provider_call_id: "provider_fake_1",
            failure_code: null,
            failure_message: null,
          },
        ],
      },
    ],
    structured_result: structuredResult,
    summary: "Fake call summary.",
    task_completed: status === "completed",
    completion_confidence: confidence,
    evidence: ["The candidate confirmed their notice period."],
    metadata: {},
    failure_code: null,
    failure_message: null,
    created_at: "2026-08-09T10:00:00Z",
    completed_at: "2026-08-09T10:02:00Z",
  });

  const fake = (async (input: Request): Promise<Response> => {
    const url = new URL(input.url);
    const { pathname } = url;

    if (input.method === "POST" && pathname === "/v1/calls") {
      if (failWith) {
        return json(
          {
            error: {
              code: failWith.code,
              message: failWith.message ?? `Fake failure: ${failWith.code}`,
              details: {},
            },
          },
          failWith.status,
        );
      }

      lastIdempotencyKey = input.headers.get("Idempotency-Key");
      const body = (await input.json()) as Record<string, unknown>;
      createdCalls.push(body);

      const phone =
        (body.recipients as Array<{ phones?: string[] }> | undefined)?.[0]
          ?.phones?.[0] ??
        (body.recipient as { phones?: string[] } | undefined)?.phones?.[0] ??
        "+10000000000";

      const task = String(body.task ?? "");
      const key = lastIdempotencyKey;
      const id = (key && idsByKey.get(key)) || `call_fake_${crypto.randomUUID()}`;
      if (key) idsByKey.set(key, id);
      tasks.set(id, { task, phone });
      return json(buildCallTask(id, task, phone), 201);
    }

    const getCall = pathname.match(/^\/v1\/calls\/([^/]+)$/);
    if (input.method === "GET" && getCall) {
      const known = tasks.get(getCall[1]);
      return json(
        buildCallTask(getCall[1], known?.task ?? "Fake task", known?.phone ?? "+14155550114"),
      );
    }

    const listEvents = pathname.match(/^\/v1\/calls\/([^/]+)\/events$/);
    if (input.method === "GET" && listEvents) {
      return json({ object: "list", data: [], next_cursor: null });
    }

    return json(
      { error: { code: "not_found", message: `No fake route for ${pathname}`, details: {} } },
      404,
    );
  }) as FakeCalleFetch;

  fake.lastIdempotencyKey = () => lastIdempotencyKey;
  fake.createdCalls = () => createdCalls;

  return fake;
}
