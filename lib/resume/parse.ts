import OpenAI from "openai";
import type {
  CandidateProfile,
  CareerEntry,
  EducationEntry,
  SkillEntry,
} from "@/lib/candidates/profile";

/**
 * Resume text → structured profile + fit score, in one model call.
 *
 * One call, not two: the job description has to be in context to score fit
 * anyway, and each extra call is another thing that can fail during a live
 * demo. The output is coerced defensively — the model proposes, `coerce*`
 * disposes, and nothing reaches the database that didn't survive the clamp.
 */

export interface ParsedResume {
  name: string;
  phone: string | null;
  email: string | null;
  headline: string;
  summary: string;
  location: string;
  yearsOfExperience: number;
  careerHistory: CareerEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  /** 0–100 fit against the job description. */
  matchScore: number;
  /** One or two sentences in a recruiter's voice: why this score. */
  note: string;
}

const PARSE_SYSTEM_PROMPT = `You read one resume and one job description, and return a single JSON object.

Extract from the resume, faithfully — never embellish, never fill gaps with plausible values:
- name (string, required)
- phone (string or null — exactly as written, do not reformat)
- email (string or null)
- headline (string — their title/specialty in one line; compose from the resume if not stated)
- summary (string — 2-4 sentences describing their background, drawn from the resume)
- location (string — city/region if stated, else "")
- yearsOfExperience (number — best estimate from the work history)
- careerHistory (array, most recent first: { company, title, startDate "YYYY-MM-01", endDate "YYYY-MM-01" or null if current, durationMonths, isCurrent, industry, companySize one of "1-10","11-50","51-200","201-500","501-1000","1001-5000","5001-10000","10001+" — best guess, description })
- education (array: { institution, degree, fieldOfStudy, startYear, endYear, grade or null, tier: "unknown" })
- skills (array: { name, proficiency one of "beginner","intermediate","advanced","expert" — judge from context, endorsements: 0, durationMonths — best estimate })

Then score fit against the job description:
- matchScore (0-100): how well THIS candidate's actual history fits THIS role. Keyword overlap is not fit — a marketing manager whose resume is dense in AI keywords is not an AI engineer. Weigh what they have shipped and owned.
- note (string): one or two sentences in a recruiter's voice explaining the score — specific to this person, mentioning the strongest evidence and the biggest gap.

Return only the JSON object. No commentary.`;

export interface ResumeParser {
  parse(input: {
    /** The PDF itself. The model reads every page as text and as an image. */
    pdf: Uint8Array;
    filename: string;
    jobTitle: string;
    jobDescription: string;
  }): Promise<ParsedResume | null>;
}

export function createResumeParser(
  client: OpenAI,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
): ResumeParser {
  return {
    async parse(input): Promise<ParsedResume | null> {
      // The PDF goes in whole, as a file input, so a scanned or image-only
      // resume is read as pages rather than coming back as empty text. A file
      // that is not a resume yields no name, which the coercion turns into
      // null — the "could not produce a usable profile" outcome.
      const response = await client.responses.create({
        model,
        temperature: 0.2,
        instructions: PARSE_SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                // JSON mode insists the word appears in the input, not only
                // in the instructions.
                text: `Job: ${input.jobTitle}

Job description:
${input.jobDescription}

Read the attached resume and return the JSON object described in the instructions.`,
              },
              {
                type: "input_file",
                filename: input.filename,
                file_data: `data:application/pdf;base64,${Buffer.from(input.pdf).toString("base64")}`,
              },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      });

      try {
        return coerceParsedResume(JSON.parse(response.output_text));
      } catch {
        return null;
      }
    },
  };
}

const COMPANY_SIZES = new Set([
  "1-10", "11-50", "51-200", "201-500", "501-1000",
  "1001-5000", "5001-10000", "10001+",
]);
const PROFICIENCIES = new Set(["beginner", "intermediate", "advanced", "expert"]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Clamp whatever the model returned into a ParsedResume, or reject it. */
export function coerceParsedResume(raw: unknown): ParsedResume | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const name = str(r.name);
  if (!name) return null;

  const careerHistory: CareerEntry[] = (Array.isArray(r.careerHistory) ? r.careerHistory : [])
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .slice(0, 10)
    .map((e) => ({
      company: str(e.company, "Unknown"),
      title: str(e.title, "Unknown"),
      startDate: str(e.startDate, "2020-01-01"),
      endDate: e.endDate === null ? null : str(e.endDate) || null,
      durationMonths: Math.max(0, Math.round(num(e.durationMonths))),
      isCurrent: Boolean(e.isCurrent),
      industry: str(e.industry, "Unknown"),
      companySize: COMPANY_SIZES.has(str(e.companySize))
        ? (str(e.companySize) as CareerEntry["companySize"])
        : "51-200",
      description: str(e.description),
    }));

  const education: EducationEntry[] = (Array.isArray(r.education) ? r.education : [])
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .slice(0, 5)
    .map((e) => ({
      institution: str(e.institution, "Unknown"),
      degree: str(e.degree, ""),
      fieldOfStudy: str(e.fieldOfStudy, ""),
      startYear: Math.round(num(e.startYear, 0)),
      endYear: Math.round(num(e.endYear, 0)),
      grade: str(e.grade) || null,
      tier: "unknown",
    }));

  const skills: SkillEntry[] = (Array.isArray(r.skills) ? r.skills : [])
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .slice(0, 30)
    .map((e) => ({
      name: str(e.name, "Unknown"),
      proficiency: PROFICIENCIES.has(str(e.proficiency))
        ? (str(e.proficiency) as SkillEntry["proficiency"])
        : "intermediate",
      endorsements: 0,
      durationMonths: Math.max(0, Math.round(num(e.durationMonths))),
    }));

  return {
    name,
    phone: str(r.phone) || null,
    email: str(r.email) || null,
    headline: str(r.headline, name),
    summary: str(r.summary),
    location: str(r.location),
    yearsOfExperience: Math.max(0, Math.min(50, num(r.yearsOfExperience))),
    careerHistory,
    education,
    skills,
    matchScore: Math.max(0, Math.min(100, Math.round(num(r.matchScore)))),
    note: str(r.note, "No scoring note was produced."),
  };
}

/** Auto-shortlist line. One constant, visible, arguable. */
export const SHORTLIST_THRESHOLD = 70;

export function shouldShortlist(
  matchScore: number,
  threshold = SHORTLIST_THRESHOLD,
): boolean {
  return matchScore >= threshold;
}

/** Shape the parsed resume into the stored CandidateProfile. */
export function toCandidateProfile(
  parsed: ParsedResume,
  appliedDate: string,
): CandidateProfile {
  const current = parsed.careerHistory[0];
  return {
    candidateId: `UPLOAD_${crypto.randomUUID().slice(0, 8)}`,
    profile: {
      anonymizedName: parsed.name,
      headline: parsed.headline,
      summary: parsed.summary,
      location: parsed.location,
      country: "",
      yearsOfExperience: parsed.yearsOfExperience,
      currentTitle: current?.title ?? parsed.headline,
      currentCompany: current?.company ?? "",
      currentCompanySize: current?.companySize ?? "51-200",
      currentIndustry: current?.industry ?? "",
    },
    careerHistory: parsed.careerHistory,
    education: parsed.education,
    skills: parsed.skills,
    certifications: [],
    languages: [],
    // A PDF carries no platform behaviour. Absence is stored as absence.
    signals: null,
    screening: {
      appliedDate,
      shortlisted: shouldShortlist(parsed.matchScore),
      matchScore: parsed.matchScore,
      note: parsed.note,
    },
  };
}
