"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OPERATOR_COOKIE, operatorStatus } from "@/lib/operator";
import { operatorVerdict } from "@/lib/screening/gate";
import { resolveCalleMode } from "@/lib/calle/port";
import { seedDemo } from "@/lib/db/seed";

/**
 * Hand the console to whoever knows the operator token.
 *
 * The token is compared by the same pure verdict `startCall` uses, so there
 * is exactly one definition of "unlocked". The cookie is httpOnly: nothing
 * in the browser can read it back, and it never appears in a URL.
 */
export async function unlockConsole(formData: FormData) {
  const presented = String(formData.get("token") ?? "").trim();
  const verdict = operatorVerdict({
    configuredToken: process.env.OPENLINE_OPERATOR_TOKEN,
    presentedToken: presented,
    mode: resolveCalleMode(),
    production: process.env.NODE_ENV === "production",
  });

  // Back to wherever the console sent them, but only to a path on this site.
  const requested = String(formData.get("next") ?? "");
  // Parsed, not pattern-matched: a browser drops tabs and newlines and reads a
  // backslash as a slash, so "/\t/evil.com" is another origin. Only a path
  // that resolves to this origin comes back out.
  const next = (() => {
    if (!requested.startsWith("/")) return "/jobs";
    try {
      const url = new URL(requested, "http://openline.local");
      return url.origin === "http://openline.local" ? url.pathname + url.search : "/jobs";
    } catch {
      return "/jobs";
    }
  })();

  if (!verdict.ok || !presented) {
    redirect(`/unlock?wrong=1&next=${encodeURIComponent(next)}`);
  }

  (await cookies()).set(OPERATOR_COOKIE, presented, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next);
}

/**
 * Put the demo roster back the way it started.
 *
 * Only in fake mode, and only for whoever holds the console: a judge who
 * screened half the shortlist should be able to hand the next judge a clean
 * queue. On a live deployment this does nothing — the seeded roster there
 * carries a real number, and wiping call records is not a button.
 */
export async function resetDemoData() {
  if (resolveCalleMode() !== "fake") return;
  const operator = await operatorStatus();
  if (!operator.ok) return;

  await seedDemo();
  revalidatePath("/", "layout");
  redirect("/jobs");
}

export async function lockConsole() {
  (await cookies()).delete(OPERATOR_COOKIE);
  redirect("/unlock");
}
