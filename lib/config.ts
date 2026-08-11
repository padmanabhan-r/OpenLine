/**
 * The one place deployment switches are interpreted.
 *
 * `OPENLINE_LIVE_CALLS` was being parsed in five files; five copies of
 * `=== "true"` is four opportunities for one of them to accept "TRUE" or "1"
 * and disagree with the rest about whether this process can spend money.
 */

/** Whether this deployment is permitted to place real phone calls. */
export function liveCallsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.OPENLINE_LIVE_CALLS === "true";
}

/** E.164 numbers this deployment may dial. Empty means nobody. */
export function callAllowlist(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.OPENLINE_CALL_ALLOWLIST ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}
