import { describe, expect, it } from "vitest";
import { STAGES, isShortlisted } from "./stage";

describe("isShortlisted", () => {
  it("excludes applicants who were never shortlisted", () => {
    expect(isShortlisted("applied")).toBe(false);
  });

  it("includes everyone from shortlisted onwards", () => {
    expect(isShortlisted("shortlisted")).toBe(true);
    expect(isShortlisted("screened")).toBe(true);
    expect(isShortlisted("interview_scheduled")).toBe(true);
    expect(isShortlisted("selected")).toBe(true);
  });

  // The whole point of folding the boolean into the stage: an ended candidate
  // cannot be left on the calling queue by a flag nobody cleared.
  it("excludes both exit stages, however far they got", () => {
    expect(isShortlisted("rejected")).toBe(false);
    expect(isShortlisted("withdrew")).toBe(false);
  });

  it("classifies every stage", () => {
    for (const stage of STAGES) {
      expect(typeof isShortlisted(stage)).toBe("boolean");
    }
  });
});
