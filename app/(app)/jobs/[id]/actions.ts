"use server";

import { revalidatePath } from "next/cache";
import { previewJob } from "@/lib/screening/preview";

export async function generatePreviews(jobId: string) {
  const outcomes = await previewJob(jobId);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/calls");
  return outcomes;
}
