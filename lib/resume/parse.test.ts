import { describe, expect, it } from "vitest";
import {
  coerceParsedResume,
  shouldShortlist,
  toCandidateProfile,
} from "./parse";

const VALID = {
  name: "Asha Nair",
  phone: "+1 415 555 0142",
  email: "asha@example.com",
  headline: "ML Engineer",
  summary: "Six years of applied ML.",
  location: "Bangalore",
  yearsOfExperience: 6,
  careerHistory: [
    {
      company: "Acme",
      title: "ML Engineer",
      startDate: "2021-03-01",
      endDate: null,
      durationMonths: 40,
      isCurrent: true,
      industry: "SaaS",
      companySize: "201-500",
      description: "Built things.",
    },
  ],
  education: [],
  skills: [{ name: "Python", proficiency: "expert", endorsements: 5, durationMonths: 70 }],
  matchScore: 82,
  note: "Strong fit.",
};

describe("coerceParsedResume", () => {
  it("accepts a well-formed parse", () => {
    const parsed = coerceParsedResume(VALID);
    expect(parsed?.name).toBe("Asha Nair");
    expect(parsed?.matchScore).toBe(82);
    expect(parsed?.careerHistory[0].companySize).toBe("201-500");
  });

  it("rejects a parse with no name — that is not a resume", () => {
    expect(coerceParsedResume({ ...VALID, name: "" })).toBeNull();
    expect(coerceParsedResume(null)).toBeNull();
    expect(coerceParsedResume("text")).toBeNull();
  });

  it("clamps the score into 0-100 whatever the model claims", () => {
    expect(coerceParsedResume({ ...VALID, matchScore: 140 })?.matchScore).toBe(100);
    expect(coerceParsedResume({ ...VALID, matchScore: -3 })?.matchScore).toBe(0);
    expect(coerceParsedResume({ ...VALID, matchScore: "high" })?.matchScore).toBe(0);
  });

  it("repairs invalid enum values instead of failing the whole parse", () => {
    const parsed = coerceParsedResume({
      ...VALID,
      careerHistory: [{ ...VALID.careerHistory[0], companySize: "huge" }],
      skills: [{ name: "Python", proficiency: "wizard", endorsements: 0, durationMonths: 1 }],
    });
    expect(parsed?.careerHistory[0].companySize).toBe("51-200");
    expect(parsed?.skills[0].proficiency).toBe("intermediate");
  });

  it("resets endorsements to zero — a PDF has no endorsements", () => {
    expect(coerceParsedResume(VALID)?.skills[0].endorsements).toBe(0);
  });
});

describe("shouldShortlist", () => {
  it("shortlists at and above the threshold, not below", () => {
    expect(shouldShortlist(70)).toBe(true);
    expect(shouldShortlist(69)).toBe(false);
    expect(shouldShortlist(100)).toBe(true);
  });
});

describe("toCandidateProfile", () => {
  it("stores absence of signals as null, never fabricated", () => {
    const profile = toCandidateProfile(coerceParsedResume(VALID)!, "2026-08-11");
    expect(profile.signals).toBeNull();
    expect(profile.screening.shortlisted).toBe(true);
    expect(profile.profile.currentCompany).toBe("Acme");
  });
});
