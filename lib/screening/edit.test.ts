import { describe, expect, it } from "vitest";
import { prepareEditedScript } from "./edit";

const SCRIPT_INPUT = {
  candidateName: "Priya Sharma",
  roleTitle: "Senior AI Engineer",
  companyName: "Northwind Payments",
  recruiterName: "Sam Oyelaran",
  factSheet: [{ label: "Salary band", value: "₹55–75 lakh" }],
};

describe("prepareEditedScript", () => {
  it("reassembles the full script frame around the edited questions", () => {
    const { task } = prepareEditedScript(
      ["What is your notice period?"],
      SCRIPT_INPUT,
    );
    // The consent gate and disclosure survive any edit, because the human
    // never touches the assembled text — only the questions.
    expect(task).toContain("AI assistant");
    expect(task.toLowerCase()).toContain("permission");
    expect(task).toContain("What is your notice period?");
    expect(task).toContain("Salary band");
  });

  it("renumbers questions q1..qn and drops blanks", () => {
    const { questions } = prepareEditedScript(
      ["  ", "First question?", "", "Second question?"],
      SCRIPT_INPUT,
    );
    expect(questions).toEqual([
      { id: "q1", text: "First question?" },
      { id: "q2", text: "Second question?" },
    ]);
  });

  it("returns findings for a prohibited question instead of dropping it", () => {
    const { findings, questions } = prepareEditedScript(
      ["How old are you?", "What is your notice period?"],
      SCRIPT_INPUT,
    );
    expect(findings.length).toBeGreaterThan(0);
    // The question is kept — a human wrote it, and they get the finding back.
    expect(questions.map((q) => q.text)).toContain("How old are you?");
  });

  it("does not report the same violation twice for question and script", () => {
    const { findings } = prepareEditedScript(["How old are you?"], SCRIPT_INPUT);
    const spans = findings.map((f) => `${f.category}:${f.matched}`);
    expect(new Set(spans).size).toBe(spans.length);
  });

  it("is clean for lawful questions", () => {
    const { findings } = prepareEditedScript(
      ["Walk me through a system you owned end to end."],
      SCRIPT_INPUT,
    );
    expect(findings).toEqual([]);
  });
});
