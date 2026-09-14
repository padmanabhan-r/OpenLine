import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { candidates, jobs, screeningCalls } from "@/lib/db/schema";
import { assembleTask, goalProblem, type ScriptInput, type ScriptQuestion } from "@/lib/script/build";
import { inspectScript, type GuardFinding } from "@/lib/script/guard";
import { spokenLanguage } from "@/lib/jobs/language";

/**
 * A human edits the questions; the machine reassembles the script.
 *
 * The recruiter never edits the task text itself. `assembleTask` is the pure
 * function that carries the AI disclosure, the consent gate, and the refusal
 * to improvise — letting a person free-edit the assembled string would let
 * them delete the consent gate, and no guard can reliably notice an absence.
 * Questions in, full script out: the safety frame survives by construction.
 */

export interface PreparedEdit {
  task: string;
  questions: ScriptQuestion[];
  findings: GuardFinding[];
}

/**
 * Pure: turn edited question texts into an assembled script plus its guard
 * verdict. Questions are re-numbered q1..qn so result labels stay aligned.
 */
export function prepareEditedScript(
  texts: string[],
  input: Omit<ScriptInput, "questions">,
): PreparedEdit {
  const questions = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `q${i + 1}`, text }));

  const task = assembleTask({ ...input, questions });

  // Per-question findings and whole-script findings are collected together.
  // A human wrote these words; they get the finding back rather than having
  // a question silently dropped the way generated ones are.
  const findings = [
    ...questions.flatMap((q) => inspectScript(q.text).findings),
    ...inspectScript(task).findings,
  ];

  // The same violation can be caught at both levels; report each span once.
  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const key = `${f.category}:${f.matched}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { task, questions, findings: deduped };
}

export type EditOutcome =
  | {
      ok: true;
      status: "previewed" | "refused";
      findings: GuardFinding[];
      version: number;
    }
  | { ok: false; reason: string };

/** Persist an edit, if the row is still editable. */
export async function applyScriptEdit(input: {
  screeningCallId: string;
  questionTexts: string[];
  /** The call's goal. Omitted keeps the row's goal; null clears it. */
  goal?: string | null;
}): Promise<EditOutcome> {
  const db = getDb();

  const [row] = await db
    .select({
      call: screeningCalls,
      candidateName: candidates.name,
      job: jobs,
    })
    .from(screeningCalls)
    .innerJoin(candidates, eq(screeningCalls.candidateId, candidates.id))
    .innerJoin(jobs, eq(screeningCalls.jobId, jobs.id))
    .where(eq(screeningCalls.id, input.screeningCallId))
    .limit(1);
  if (!row) return { ok: false, reason: "No such screening call." };

  if (input.questionTexts.every((t) => !t.trim())) {
    return { ok: false, reason: "A script needs at least one question." };
  }

  const goal = input.goal === undefined ? row.call.goal : input.goal?.trim() || null;
  const problem = goal ? goalProblem(goal) : null;
  if (problem) return { ok: false, reason: problem };

  const prepared = prepareEditedScript(input.questionTexts, {
    candidateName: row.candidateName,
    roleTitle: row.job.title,
    companyName: row.job.companyName,
    recruiterName: row.job.recruiterName,
    factSheet: row.job.factSheet,
    // Without this a human edit would silently drop the call language.
    speakLanguage: spokenLanguage(row.job.language),
    ...(goal ? { goal } : {}),
  });

  const status = prepared.findings.length > 0 ? "refused" : "previewed";
  const nextVersion = row.call.scriptVersion + 1;

  // The WHERE clause is the whole permission model: a row that has started
  // dialing, or that CALL-E already knows about, matches nothing and the edit
  // dies here regardless of what the UI allowed.
  const updated = await db
    .update(screeningCalls)
    .set({
      task: prepared.task,
      questions: prepared.questions,
      goal,
      guardFindings: prepared.findings,
      status,
      scriptVersion: nextVersion,
      // A new version gets a new key, so a retried dial can never be collapsed
      // by CALL-E onto a create that carried the pre-edit script.
      idempotencyKey: `${row.call.jobId}:${row.call.candidateId}:v${nextVersion}`,
      refusalReason: null,
      refusalDetail: null,
      needsHuman: status === "refused",
      needsHumanReasons:
        status === "refused"
          ? ["A human-edited question was flagged by the prohibited-topic check."]
          : [],
    })
    .where(
      and(
        eq(screeningCalls.id, row.call.id),
        inArray(screeningCalls.status, ["previewed", "refused"]),
        isNull(screeningCalls.calleCallId),
        // Guard against a concurrent edit racing this one.
        sql`${screeningCalls.scriptVersion} = ${row.call.scriptVersion}`,
      ),
    )
    .returning({ version: screeningCalls.scriptVersion });

  if (updated.length === 0) {
    return {
      ok: false,
      reason: "This script can no longer be edited — the call has started or another edit landed first.",
    };
  }

  return {
    ok: true,
    status,
    findings: prepared.findings,
    version: updated[0].version,
  };
}
