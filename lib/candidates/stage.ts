/**
 * Where a candidate stands in one job's pipeline.
 *
 * This is the single source of truth for "is this person on the shortlist" —
 * there is no separate boolean to contradict it. Everything from Shortlisted
 * onwards is on the list; Applied is not, and the two exit stages are not,
 * which is what keeps a rejected candidate out of the calling queue without a
 * second flag anyone can forget to clear.
 *
 * OpenLine never writes `rejected` on its own. A call that goes badly routes to
 * a human; only a human moves anyone into an exit stage.
 */
export const STAGES = [
  "applied",
  "shortlisted",
  "screened",
  "interview_scheduled",
  "selected",
  "rejected",
  "withdrew",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  screened: "Screened",
  interview_scheduled: "Interview scheduled",
  selected: "Selected",
  rejected: "Rejected",
  withdrew: "Withdrew",
};

/** The stages a candidate passes through, in order. Exits are not on it. */
const PROGRESSION: Stage[] = [
  "applied",
  "shortlisted",
  "screened",
  "interview_scheduled",
  "selected",
];

/** Ended, one way or the other — no further movement, and no calls. */
export const EXIT_STAGES: Stage[] = ["rejected", "withdrew"];

export function isExit(stage: Stage): boolean {
  return EXIT_STAGES.includes(stage);
}

/**
 * On the shortlist, and therefore callable.
 *
 * Past Shortlisted still counts: someone already screened or scheduled has
 * plainly been shortlisted, and a second call to them is a legitimate thing to
 * want. An exit stage never counts, whatever they reached before it.
 */
export function isShortlisted(stage: Stage): boolean {
  if (isExit(stage)) return false;
  return PROGRESSION.indexOf(stage) >= PROGRESSION.indexOf("shortlisted");
}

/** Stages a recruiter can move someone to from here. */
export function nextStages(stage: Stage): Stage[] {
  if (isExit(stage)) return ["applied"];

  const i = PROGRESSION.indexOf(stage);
  const forward = i >= 0 && i < PROGRESSION.length - 1 ? [PROGRESSION[i + 1]] : [];
  const back = i > 0 ? [PROGRESSION[i - 1]] : [];
  return [...forward, ...back, ...EXIT_STAGES];
}

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}
