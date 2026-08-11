import { describe, expect, it } from "vitest";
import { assembleTask, type ScriptInput } from "./build";
import { inspectScript } from "./guard";

const input = (overrides: Partial<ScriptInput> = {}): ScriptInput => ({
  candidateName: "Priya",
  roleTitle: "Senior Backend Engineer",
  companyName: "Northwind",
  recruiterName: "Sam",
  questions: [
    { id: "q1", text: "What is your notice period?" },
    { id: "q2", text: "Which parts of the payments stack have you owned?" },
  ],
  factSheet: [
    { label: "Salary band", value: "₹45–60 lakh per annum" },
    { label: "Location policy", value: "Hybrid, two days a week in Bangalore" },
  ],
  ...overrides,
});

describe("assembleTask", () => {
  it("discloses that the caller is an AI before anything else", () => {
    const task = assembleTask(input());
    const disclosureAt = task.toLowerCase().indexOf("ai");
    const firstQuestionAt = task.indexOf("q1");
    expect(disclosureAt).toBeGreaterThan(-1);
    expect(disclosureAt).toBeLessThan(firstQuestionAt);
  });

  it("asks permission to continue and stops if refused", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toContain("good time");
    expect(task).toMatch(/if they (say no|decline|would rather not)/);
  });

  it("labels each question with its id so answers can be matched back", () => {
    const task = assembleTask(input());
    expect(task).toContain("q1");
    expect(task).toContain("What is your notice period?");
    expect(task).toContain("q2");
  });

  it("inlines the job fact sheet, since the agent cannot look anything up mid-call", () => {
    const task = assembleTask(input());
    expect(task).toContain("₹45–60 lakh per annum");
    expect(task).toContain("Hybrid, two days a week in Bangalore");
  });

  it("invites the candidate's own questions", () => {
    expect(assembleTask(input()).toLowerCase()).toContain(
      "questions",
    );
  });

  it("forbids answering beyond the fact sheet rather than improvising", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/(do not|never) (guess|invent|make up)/);
  });

  it("states that the assistant cannot make or imply an offer", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(
      /((cannot|do not) (make|imply|extend).*(offer|decision))|(no offers?, no decisions?)/,
    );
  });

  it("produces a guard-clean script from clean questions", () => {
    expect(inspectScript(assembleTask(input())).ok).toBe(true);
  });

  it("still fails the guard when a prohibited question is supplied", () => {
    // The guard is enforced on the assembled script, so a bad question cannot
    // reach a phone line by being smuggled through the builder.
    const task = assembleTask(
      input({ questions: [{ id: "q1", text: "How old are you?" }] }),
    );
    const result = inspectScript(task);
    expect(result.ok).toBe(false);
    expect(result.findings[0].category).toBe("age");
  });

  it("handles a candidate with no fact sheet entries", () => {
    const task = assembleTask(input({ factSheet: [] }));
    expect(task).toContain("q1");
    expect(inspectScript(task).ok).toBe(true);
  });

  it("names the candidate and the role", () => {
    const task = assembleTask(input());
    expect(task).toContain("Priya");
    expect(task).toContain("Senior Backend Engineer");
    expect(task).toContain("Northwind");
  });
});
