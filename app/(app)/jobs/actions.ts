"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { FactSheetEntry } from "@/lib/script/build";
import { createJobDrafter } from "@/lib/jobs/draft";
import { DEFAULT_CALL_LANGUAGE, isCallLanguage } from "@/lib/jobs/language";
import { operatorStatus } from "@/lib/operator";

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
  // Only a tag from the curated list reaches the API — a free string here
  // would be spoken to a real phone.
  const requestedLanguage = String(formData.get("language") ?? "").trim();
  const language = isCallLanguage(requestedLanguage) ? requestedLanguage : DEFAULT_CALL_LANGUAGE;
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
      language,
      description,
      factSheet: parseFactSheet(factSheetText),
    })
    .returning({ id: jobs.id });

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

/**
 * Draft the description and fact sheet from a brief. Nothing is saved: the
 * result fills the form for the recruiter to read and edit first. Behind the
 * operator token like uploads, since it spends model calls.
 */
export async function draftJob(input: {
  title: string;
  companyName: string;
  brief: string;
}): Promise<
  { ok: true; description: string; factSheet: string } | { ok: false; reason: string }
> {
  const operator = await operatorStatus();
  if (!operator.ok) return { ok: false, reason: operator.reason };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "OPENAI_API_KEY is not set, so there is no model to draft with." };
  }

  const title = input.title.trim();
  const companyName = input.companyName.trim();
  const brief = input.brief.trim().slice(0, 4000);
  if (!title || !companyName || !brief) {
    return { ok: false, reason: "A title, a company, and a brief are needed to draft." };
  }

  const draft = await createJobDrafter(new OpenAI({ apiKey })).draft({ title, companyName, brief });
  if (!draft) return { ok: false, reason: "The model did not return a usable draft. Try a fuller brief." };

  return {
    ok: true,
    description: draft.description,
    // The same "Label: Value" lines a recruiter would type, so createJob
    // parses the draft exactly as it parses hand-written facts.
    factSheet: draft.factSheet.map((f) => `${f.label}: ${f.value}`).join("\n"),
  };
}
