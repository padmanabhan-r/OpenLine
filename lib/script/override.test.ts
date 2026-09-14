import { describe, expect, it } from "vitest";
import { MAX_OVERRIDE_QUESTIONS, coerceOverride } from "./override";

describe("coerceOverride", () => {
  it("keeps a goal and the questions, trimmed to one line each", () => {
    expect(
      coerceOverride({
        goal: "  Find out whether they can relocate\nto Singapore. ",
        questions: ["  Could you relocate to Singapore within three months? ", ""],
      }),
    ).toEqual({
      goal: "Find out whether they can relocate to Singapore.",
      questions: ["Could you relocate to Singapore within three months?"],
    });
  });

  it("caps the number of questions a screen can carry", () => {
    const many = Array.from({ length: 10 }, (_, i) => `Question ${i + 1}?`);
    expect(coerceOverride({ goal: "g", questions: many })?.questions).toHaveLength(MAX_OVERRIDE_QUESTIONS);
  });

  it("refuses a draft with no usable questions", () => {
    expect(coerceOverride({ goal: "Find out things.", questions: [] })).toBeNull();
    expect(coerceOverride({ goal: "x", questions: [3, null] })).toBeNull();
    expect(coerceOverride("not an object")).toBeNull();
  });
});
