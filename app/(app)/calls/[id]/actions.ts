"use server";

import { revalidatePath } from "next/cache";
import { placeCall } from "@/lib/screening/dispatch";

export async function callCandidate(screeningCallId: string) {
  const outcome = await placeCall(screeningCallId);
  revalidatePath(`/calls/${screeningCallId}`);
  revalidatePath("/calls");
  return outcome;
}
