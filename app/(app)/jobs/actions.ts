"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { FactSheetEntry } from "@/lib/script/build";

/**
 * Parse "Label: Value" lines into fact sheet entries, leniently.
 *
 * A line without a colon becomes a fact with an empty-ish label rather than an
 * error — a recruiter typing notes should never be blocked by format.
 */
function parseFactSheet(text: string): FactSheetEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return { label: "Note", value: line };
      return {
        label: line.slice(0, colon).trim() || "Note",
        value: line.slice(colon + 1).trim(),
      };
    })
    .filter((f) => f.value);
}

export async function createJob(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const recruiterName = String(formData.get("recruiterName") ?? "").trim();
  const defaultRegion = String(formData.get("defaultRegion") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const factSheetText = String(formData.get("factSheet") ?? "");

  if (!title || !companyName || !recruiterName || !description) {
    throw new Error("Title, company, recruiter and description are required.");
  }

  const db = getDb();
  const [job] = await db
    .insert(jobs)
    .values({
      title,
      companyName,
      recruiterName,
      defaultRegion,
      description,
      factSheet: parseFactSheet(factSheetText),
    })
    .returning({ id: jobs.id });

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}
