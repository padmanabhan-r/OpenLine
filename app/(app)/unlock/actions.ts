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

  if (!verdict.ok || !presented) {
    redirect("/unlock?wrong=1");
  }

  (await cookies()).set(OPERATOR_COOKIE, presented, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/jobs");
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
