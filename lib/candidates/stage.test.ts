import { describe, expect, it } from "vitest";
import { STAGES, isExit, isShortlisted, nextStages } from "./stage";

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

describe("nextStages", () => {
  it("offers the step forward, the step back, and both exits", () => {
    expect(nextStages("shortlisted")).toEqual([
      "screened",
      "applied",
      "rejected",
      "withdrew",
    ]);
  });

  it("offers no step forward past the end of the progression", () => {
    expect(nextStages("selected")).toEqual([
      "interview_scheduled",
      "rejected",
      "withdrew",
    ]);
  });

  it("lets an exit be undone, back to the start", () => {
    expect(nextStages("rejected")).toEqual(["applied"]);
    expect(isExit("rejected")).toBe(true);
  });
});
