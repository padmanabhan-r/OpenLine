/**
 * Prohibited-topic guard.
 *
 * OpenLine calls every applicant in a queue, which means a single bad generated
 * question is asked hundreds of times instead of once. The guard runs twice:
 *
 *   1. Pre-dial, over the generated script. A failing script never dials.
 *   2. Post-call, over the agent's transcript turns, to catch anything the model
 *      improvised on the line.
 *
 * It is deliberately not a keyword ban. "Are you authorised to work in India?"
 * is lawful and useful; "What is your nationality?" is neither — and both
 * contain nationality vocabulary. Exemptions are therefore matched *before*
 * prohibitions, and a prohibited pattern only fires on text no exemption claimed.
 *
 * LIMITATIONS — read before trusting this.
 *
 * This is a deterministic pattern layer. It is fast, free, fully testable, and
 * runs on every script and every transcript. It is *not* a complete safety
 * proof, and it is not legal advice:
 *
 *   - It covers English only.
 *   - Novel paraphrases will evade it. "Do you plan to be in Bangalore long
 *     term?" can be a proxy for immigration status and is not caught.
 *   - It matches phrasing, not intent, so it cannot judge context.
 *   - The prohibited categories are drawn from common EEOC (US) and Indian
 *     equal-opportunity practice. They are not jurisdiction-complete; salary
 *     history, for instance, is lawful in some jurisdictions and banned in others.
 *
 * It is therefore a floor, not a ceiling: it catches the obvious and the
 * accidental, which is what an automated script generator actually produces.
 * A human still reviews the script in the dry-run preview before any dial.
 */

export type GuardCategory =
  | "age"
  | "marital_family"
  | "pregnancy"
  | "religion_caste"
  | "national_origin"
  | "disability_health"
  | "gender_orientation"
  | "political"
  | "salary_history";

export interface GuardFinding {
  category: GuardCategory;
  /** The matched text, for display in the UI. */
  matched: string;
  /** Character offsets into the inspected string. */
  start: number;
  end: number;
  /** Index of the transcript turn, when inspecting a transcript. */
  turnIndex?: number;
  /** Why this is prohibited — shown to the recruiter. */
  explanation: string;
}

export interface GuardResult {
  ok: boolean;
  findings: GuardFinding[];
}

/**
 * Phrasings that are lawful even though they overlap prohibited vocabulary.
 * Matched regions are removed from consideration before prohibitions run.
 */
const EXEMPTIONS: RegExp[] = [
  // Right-to-work is a lawful question in every jurisdiction we target;
  // national origin is not.
  /\b(?:are|were)\s+you\s+(?:legally\s+)?(?:authoris|authoriz)ed\s+to\s+work\b[^?.]*/gi,
  /\bdo\s+you\s+have\s+(?:the\s+)?(?:legal\s+)?right\s+to\s+work\b[^?.]*/gi,
  /\b(?:are|will)\s+you\s+(?:be\s+)?(?:legally\s+)?(?:eligible|able)\s+to\s+work\b[^?.]*/gi,
  /\b(?:require|need|needs)\s+(?:visa\s+)?sponsorship\b[^?.]*/gi,
  /\bvisa\s+sponsorship\b/gi,
  // Compensation expectations are forward-looking and lawful. Compensation
  // history is banned in many jurisdictions and is caught below.
  /\bsalary\s+expectations?\b/gi,
  /\bexpected\s+(?:ctc|salary|compensation|package)\b/gi,
  /\bcompensation\s+expectations?\b/gi,
  /\bwhat\s+are\s+you\s+looking\s+for\s+(?:in\s+terms\s+of\s+)?(?:salary|compensation)\b/gi,
];

interface Prohibition {
  category: GuardCategory;
  explanation: string;
  patterns: RegExp[];
}

/**
 * Scripts are instructions *to* an agent, so prohibited questions appear in
 * reported speech as often as direct speech: "Ask how old they are" carries the
 * same violation as "How old are you?". These fragments let each prohibition
 * match both voices without writing every pattern twice.
 */
const SUBJECT = "(?:you|they|he|she|the candidate|the applicant)";
const POSSESSIVE = "(?:your|their|his|her|the candidate's|the applicant's)";
/** "are you" / "you are" / "is the candidate" / "the candidate is" */
const BE = `(?:(?:are|is)\\s+${SUBJECT}|${SUBJECT}\\s+(?:are|is))`;
/** "do you have" / "they have" / "does she have" */
const HAVE = `(?:do(?:es)?\\s+${SUBJECT}\\s+have|${SUBJECT}\\s+ha(?:ve|s))`;

const rx = (source: string) => new RegExp(source, "gi");

const PROHIBITIONS: Prohibition[] = [
  {
    category: "age",
    explanation:
      "Age and its proxies (date of birth, graduation year) cannot be used in hiring decisions.",
    patterns: [
      rx(`\\bhow\\s+old\\s+${BE}\\b`),
      rx(`\\b${POSSESSIVE}\\s+age\\b`),
      /\bdate\s+of\s+birth\b/gi,
      rx(`\\bwhen\\s+(?:were|was)\\s+${SUBJECT}\\s+born\\b`),
      rx(`\\bwhat\\s+year\\s+(?:were|was)\\s+${SUBJECT}\\s+born\\b`),
      // Graduation year is a widely recognised age proxy.
      rx(`\\bwhat\\s+year\\s+did\\s+${SUBJECT}\\s+graduate\\b`),
      /\byear\s+of\s+graduation\b/gi,
      rx(`\\bwhen\\s+did\\s+${SUBJECT}\\s+graduate\\b`),
      // Past tense without an auxiliary: "when they graduated".
      rx(`\\bwhen\\s+${SUBJECT}\\s+graduated\\b`),
      rx(`\\bwhat\\s+year\\s+${SUBJECT}\\s+graduated\\b`),
    ],
  },
  {
    category: "marital_family",
    explanation:
      "Marital and family status are protected characteristics and are irrelevant to job performance.",
    patterns: [
      rx(`\\b${BE}\\s+married\\b`),
      rx(`\\bwhether\\s+${SUBJECT}\\s+(?:are|is)\\s+married\\b`),
      /\bmarital\s+status\b/gi,
      rx(`\\b${HAVE}\\s+(?:any\\s+)?(?:children|kids)\\b`),
      /\bchildcare\s+arrangements?\b/gi,
      rx(`\\b${BE}\\s+single\\b`),
      rx(`\\b${POSSESSIVE}\\s+(?:husband|wife|spouse)\\b`),
    ],
  },
  {
    category: "pregnancy",
    explanation:
      "Pregnancy and family planning cannot be asked about or considered in hiring.",
    patterns: [
      rx(`\\b${BE}\\s+(?:currently\\s+)?pregnant\\b`),
      /\bplanning\s+(?:to\s+start\s+)?a\s+family\b/gi,
      /\bplanning\s+(?:on\s+)?(?:to\s+have\s+)?(?:children|kids)\b/gi,
      /\bmaternity\s+(?:leave\s+)?plans?\b/gi,
      /\bfamily\s+planning\b/gi,
    ],
  },
  {
    category: "religion_caste",
    explanation:
      "Religion and caste are protected characteristics. In India, caste discrimination is additionally unlawful.",
    patterns: [
      /\bwhat\s+religion\b/gi,
      /\byour\s+religion\b/gi,
      /\breligious\s+beliefs?\b/gi,
      /\bwhich\s+(?:church|temple|mosque)\b/gi,
      /\bwhat\s+caste\b/gi,
      /\bwhich\s+caste\b/gi,
      /\byour\s+caste\b/gi,
      // "Community" is a common euphemism for caste in Indian recruiting.
      /\bwhat\s+community\s+are\s+you\s+from\b/gi,
      /\bwhich\s+community\s+(?:are\s+you|do\s+you\s+belong)\b/gi,
    ],
  },
  {
    category: "national_origin",
    explanation:
      "National origin is protected. Ask about authorisation to work instead.",
    patterns: [
      rx(`\\b${POSSESSIVE}\\s+nationality\\b`),
      rx(
        `\\bwhere\\s+(?:are\\s+${SUBJECT}|${SUBJECT}\\s+(?:are|is))\\s+(?:originally\\s+from|from\\s+originally)\\b`,
      ),
      rx(`\\b${BE}\\s+an?\\s+citizen\\s+of\\b`),
      rx(`\\b${BE}\\s+a\\s+citizen\\s+of\\b`),
      rx(`\\b${POSSESSIVE}\\s+citizenship\\b`),
      // Mother tongue / native language are national-origin proxies.
      /\bmother\s+tongue\b/gi,
      /\bnative\s+language\b/gi,
      rx(`\\b${POSSESSIVE}\\s+ethnicity\\b`),
      rx(`\\b${POSSESSIVE}\\s+race\\b`),
      rx(`\\bwhat\\s+country\\s+(?:are\\s+${SUBJECT}|${SUBJECT}\\s+(?:are|is))\\s+from\\b`),
    ],
  },
  {
    category: "disability_health",
    explanation:
      "Disability and health questions are unlawful before an offer. Ask about ability to perform specific job duties instead.",
    patterns: [
      rx(`\\b${HAVE}\\s+(?:any\\s+)?disabilit(?:y|ies)\\b`),
      /\bany\s+medical\s+conditions?\b/gi,
      /\bhealth\s+(?:problems|issues|conditions)\b/gi,
      /\bhow\s+many\s+sick\s+days\b/gi,
      rx(`\\b${BE}\\s+healthy\\b`),
      /\bmental\s+health\s+(?:history|conditions?)\b/gi,
    ],
  },
  {
    category: "gender_orientation",
    explanation:
      "Gender and sexual orientation are protected characteristics.",
    patterns: [
      rx(`\\b${BE}\\s+male\\s+or\\s+female\\b`),
      rx(`\\b${POSSESSIVE}\\s+gender\\b`),
      /\bsexual\s+orientation\b/gi,
    ],
  },
  {
    category: "political",
    explanation: "Political affiliation is protected in many jurisdictions.",
    patterns: [
      rx(`\\bwho\\s+did\\s+${SUBJECT}\\s+vote\\s+for\\b`),
      rx(`\\bwhich\\s+party\\s+did\\s+${SUBJECT}\\s+vote\\b`),
      // Past tense without an auxiliary: "who they voted for".
      rx(`\\bwho\\s+${SUBJECT}\\s+voted\\s+for\\b`),
      rx(`\\bwhich\\s+party\\s+${SUBJECT}\\s+voted\\s+for\\b`),
      /\bpolitical\s+(?:affiliation|views|party)\b/gi,
    ],
  },
  {
    category: "salary_history",
    explanation:
      "Salary history is banned in many jurisdictions because it perpetuates pay gaps. Ask about expectations instead.",
    patterns: [
      /\bcurrent\s+(?:salary|ctc|compensation|package|pay)\b/gi,
      /\bsalary\s+history\b/gi,
      rx(
        `\\bhow\\s+much\\s+(?:do(?:es)?\\s+${SUBJECT}\\s+(?:currently\\s+)?(?:earn|make)|(?:are|is)\\s+${SUBJECT}\\s+(?:currently\\s+)?(?:earning|making|paid))\\b`,
      ),
      // No auxiliary: "how much they currently earn".
      rx(
        `\\bhow\\s+much\\s+${SUBJECT}\\s+(?:currently\\s+)?(?:earn|earns|make|makes)\\b`,
      ),
      rx(`\\bwhat\\s+do(?:es)?\\s+${SUBJECT}\\s+(?:currently\\s+)?earn\\b`),
      rx(`\\bwhat\\s+(?:are|is)\\s+${SUBJECT}\\s+(?:currently\\s+)?(?:earning|paid)\\b`),
      /\bpresent\s+ctc\b/gi,
      /\bexisting\s+(?:salary|ctc|package)\b/gi,
    ],
  },
];

/**
 * Replace exempt regions with spaces, preserving offsets so findings still point
 * at the right characters in the original text.
 */
function maskExemptions(text: string): string {
  let masked = text;
  for (const pattern of EXEMPTIONS) {
    masked = masked.replace(new RegExp(pattern.source, pattern.flags), (m) =>
      " ".repeat(m.length),
    );
  }
  return masked;
}

/** Inspect a block of text — a generated script, or one transcript turn. */
function inspect(text: string, turnIndex?: number): GuardFinding[] {
  const masked = maskExemptions(text);
  const findings: GuardFinding[] = [];

  for (const { category, explanation, patterns } of PROHIBITIONS) {
    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(masked)) !== null) {
        // Offsets are valid against the original text because masking preserves length.
        findings.push({
          category,
          matched: text.slice(match.index, match.index + match[0].length),
          start: match.index,
          end: match.index + match[0].length,
          explanation,
          ...(turnIndex === undefined ? {} : { turnIndex }),
        });
        if (match[0].length === 0) re.lastIndex += 1;
      }
    }
  }

  return dedupeOverlapping(findings);
}

/**
 * Several patterns in a category can match the same phrase ("your age" inside
 * "what is your age"). Keep the longest match per category per region so the UI
 * shows one highlight rather than nested duplicates.
 */
function dedupeOverlapping(findings: GuardFinding[]): GuardFinding[] {
  const sorted = [...findings].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const kept: GuardFinding[] = [];

  for (const finding of sorted) {
    const covered = kept.some(
      (k) =>
        k.category === finding.category &&
        finding.start >= k.start &&
        finding.end <= k.end,
    );
    if (!covered) kept.push(finding);
  }

  return kept;
}

/** Inspect a generated call script before it is allowed to dial. */
export function inspectScript(script: string): GuardResult {
  const findings = inspect(script);
  return { ok: findings.length === 0, findings };
}

export interface InspectableTurn {
  speaker: "bot" | "user" | "unknown";
  text: string;
  offsetSeconds?: number | null;
}

/**
 * Inspect a completed call's transcript.
 *
 * Only the agent's own turns are in scope. A candidate volunteering "I'm 34 and
 * married" is not a violation — the agent did not ask, and penalising the call
 * for what the candidate chose to share would be the wrong incentive.
 */
export function inspectTranscript(turns: InspectableTurn[]): GuardResult {
  const findings = turns.flatMap((turn, index) =>
    turn.speaker === "bot" ? inspect(turn.text, index) : [],
  );
  return { ok: findings.length === 0, findings };
}
