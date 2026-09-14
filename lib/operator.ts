import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveCalleMode } from "@/lib/calle/port";
import { operatorVerdict, type GateVerdict } from "@/lib/screening/gate";

/**
 * Who is holding the console.
 *
 * The operator token is a single shared secret, set as OPENLINE_OPERATOR_TOKEN
 * on any deployment that can reach a real phone. It arrives either as the
 * httpOnly cookie the Unlock page sets, or — for the scriptable routes — as an
 * `x-openline-operator` header. The verdict itself is pure and tested in
 * lib/screening/gate.ts; this file only knows where to look.
 */

export const OPERATOR_COOKIE = "openline_operator";

async function presentedToken(): Promise<string | undefined> {
  const fromHeader = (await headers()).get("x-openline-operator")?.trim();
  if (fromHeader) return fromHeader;
  return (await cookies()).get(OPERATOR_COOKIE)?.value;
}

/** May the current request place calls or upload resumes? */
export async function operatorStatus(): Promise<GateVerdict> {
  return operatorVerdict({
    configuredToken: process.env.OPENLINE_OPERATOR_TOKEN,
    presentedToken: await presentedToken(),
    mode: resolveCalleMode(),
    production: process.env.NODE_ENV === "production",
  });
}

/** Is a token configured at all? Decides what the Unlock page says. */
export function operatorTokenConfigured(): boolean {
  return Boolean(process.env.OPENLINE_OPERATOR_TOKEN?.trim());
}

/**
 * Gate a console page on the operator token.
 *
 * The console holds applicants' names, resumes, and call transcripts. Once
 * anyone can put a real resume or number into it, reading it is as private as
 * dialing from it, so every page asks for the token and sends the visitor back
 * to where they were going once they have it.
 */
export async function requireOperator(path: string): Promise<void> {
  if ((await operatorStatus()).ok) return;
  redirect(`/unlock?next=${encodeURIComponent(path)}`);
}
