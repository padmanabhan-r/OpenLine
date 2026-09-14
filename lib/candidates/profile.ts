/**
 * The candidate record OpenLine receives from an applicant-tracking system.
 *
 * The shape mirrors the Redrob candidate schema: a static profile (who they
 * are, where they've worked, what they claim to know) plus 23 behavioural
 * signals describing how they actually behave on a hiring platform. The
 * signals matter more than they look. A perfect-on-paper candidate who last
 * logged in seven months ago and answers one recruiter message in twenty is,
 * for the purposes of a phone screen, not reachable — and OpenLine's whole job
 * is reaching people.
 *
 * Nothing in here is used to reject anyone. The shortlist arrives already made,
 * from the recruiter's ATS; these fields exist so a human can see *why* a name
 * is on the list, and so the call script can be grounded in the candidate's
 * real background rather than a one-line summary.
 */

export type CompanySize =
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1001-5000"
  | "5001-10000"
  | "10001+";

export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";

export type InstitutionTier =
  | "tier_1"
  | "tier_2"
  | "tier_3"
  | "tier_4"
  | "unknown";

export type WorkMode = "remote" | "hybrid" | "onsite" | "flexible";

export interface ProfileHeader {
  anonymizedName: string;
  headline: string;
  summary: string;
  location: string;
  country: string;
  yearsOfExperience: number;
  currentTitle: string;
  currentCompany: string;
  currentCompanySize: CompanySize;
  currentIndustry: string;
}

export interface CareerEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  durationMonths: number;
  isCurrent: boolean;
  industry: string;
  companySize: CompanySize;
  description: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number;
  grade: string | null;
  tier: InstitutionTier;
}

export interface SkillEntry {
  name: string;
  proficiency: Proficiency;
  endorsements: number;
  durationMonths: number;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: number;
}

export interface LanguageEntry {
  language: string;
  proficiency: "basic" | "conversational" | "professional" | "native";
}

/**
 * The 23 platform signals, all of them, always present.
 *
 * Two use -1 rather than null as their "no data" value, matching the source
 * schema: `githubActivityScore` when no GitHub account is linked, and
 * `offerAcceptanceRate` when the candidate has never had an offer. A zero in
 * either field means something entirely different from an absence, so the
 * distinction is worth the awkwardness.
 */
export interface PlatformSignals {
  profileCompletenessScore: number;
  signupDate: string;
  lastActiveDate: string;
  openToWorkFlag: boolean;
  profileViewsReceived30d: number;
  applicationsSubmitted30d: number;
  recruiterResponseRate: number;
  avgResponseTimeHours: number;
  skillAssessmentScores: Record<string, number>;
  connectionCount: number;
  endorsementsReceived: number;
  noticePeriodDays: number;
  /** US dollars a year, in thousands: { min: 66, max: 90 } is $66k–$90k. */
  expectedSalaryRangeUsdK: { min: number; max: number };
  preferredWorkMode: WorkMode;
  willingToRelocate: boolean;
  githubActivityScore: number;
  searchAppearance30d: number;
  savedByRecruiters30d: number;
  interviewCompletionRate: number;
  offerAcceptanceRate: number;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  linkedinConnected: boolean;
}

/**
 * The recruiter's own decision, imported alongside the profile.
 *
 * `matchScore` is the ATS's ranking, not ours — OpenLine does not score people.
 * `note` explains the decision in the recruiter's words, and is shown next to
 * the candidate so the shortlist can be argued with rather than just obeyed.
 */
export interface ScreeningDecision {
  appliedDate: string;
  shortlisted: boolean;
  matchScore: number;
  note: string;
}

export interface CandidateProfile {
  candidateId: string;
  profile: ProfileHeader;
  careerHistory: CareerEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  /**
   * Null for candidates who arrived as an uploaded resume: a PDF carries no
   * platform behaviour, and synthesizing plausible values here would make
   * `reachabilityWarnings` lie to a recruiter about a person's availability.
   * Absence is information; fabrication is not.
   */
  signals: PlatformSignals | null;
  screening: ScreeningDecision;
}

/** Days since the candidate last opened the platform. */
export function daysSinceActive(
  signals: PlatformSignals,
  today = new Date(),
): number {
  const last = new Date(`${signals.lastActiveDate}T00:00:00Z`).getTime();
  const now = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.max(0, Math.round((now - last) / 86_400_000));
}

/**
 * Signals that bear on whether this person can actually be reached by phone.
 *
 * Used only to warn a recruiter before a call is queued — a stale, silent
 * profile predicts an unanswered phone. It never removes anyone from the queue.
 */
export function reachabilityWarnings(
  signals: PlatformSignals,
  today = new Date(),
): string[] {
  const warnings: string[] = [];
  const idle = daysSinceActive(signals, today);

  if (idle > 90) warnings.push(`Last active ${idle} days ago`);
  if (signals.recruiterResponseRate < 0.25) {
    warnings.push(
      `Replies to ${Math.round(signals.recruiterResponseRate * 100)}% of recruiter messages`,
    );
  }
  if (!signals.openToWorkFlag) warnings.push("Not marked open to work");
  if (!signals.verifiedPhone) warnings.push("Phone number unverified");
  if (signals.interviewCompletionRate < 0.6) {
    warnings.push(
      `Attends ${Math.round(signals.interviewCompletionRate * 100)}% of scheduled interviews`,
    );
  }

  return warnings;
}

/**
 * The grounding text handed to question generation.
 *
 * Built from the structured record rather than stored prose, so a question can
 * cite what someone actually built rather than an adjective about them.
 */
export function summarizeForScript(candidate: CandidateProfile): string {
  const { profile, careerHistory, skills, signals } = candidate;

  const roles = careerHistory
    .slice(0, 3)
    .map(
      (role) =>
        `${role.title} at ${role.company} (${Math.round(role.durationMonths / 12 * 10) / 10} yrs): ${role.description}`,
    )
    .join("\n");

  const topSkills = skills
    .filter((s) => s.proficiency === "expert" || s.proficiency === "advanced")
    .slice(0, 10)
    .map((s) => `${s.name} (${s.proficiency})`)
    .join(", ");

  return [
    `${profile.currentTitle} at ${profile.currentCompany}, ${profile.yearsOfExperience} years of experience, based in ${profile.location}.`,
    profile.summary,
    "",
    "Recent roles:",
    roles,
    "",
    `Strongest skills: ${topSkills || "none listed above intermediate"}.`,
    // Resume-sourced candidates have no stated preferences — say nothing
    // rather than feed the question generator an invented notice period.
    ...(signals
      ? [
          `Stated notice period: ${signals.noticePeriodDays} days. Preferred work mode: ${signals.preferredWorkMode}.`,
        ]
      : []),
  ].join("\n");
}
