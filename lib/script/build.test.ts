import { describe, expect, it } from "vitest";
import { assembleTask, firstNameOf, type ScriptInput } from "./build";
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
    { label: "Salary band", value: "$55,000–$70,000 a year" },
    { label: "Location policy", value: "Hybrid, two days a week in Bangalore" },
  ],
  ...overrides,
});

describe("assembleTask", () => {
  it("discloses that the caller is an AI before anything else", () => {
    const task = assembleTask(input());
    const disclosureAt = task.toLowerCase().indexOf("ai assistant");
    const firstQuestionAt = task.indexOf("q1");
    expect(disclosureAt).toBeGreaterThan(-1);
    expect(disclosureAt).toBeLessThan(firstQuestionAt);
  });

  it("frames the call as a short basic screen, not an interview", () => {
    // A live call proved the agent rambles without this. The brevity
    // instruction is safety-adjacent: a call that overstays its welcome is a
    // call that starts improvising.
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/basic screen, not an interview/);
    expect(task).toMatch(/no small talk/);
  });

  it("asks explicit permission for screening questions and stops if refused", () => {
    // "Is now a good time" is a convenience check, not consent. The schema's
    // consent_given field means "agreed to be screened by an AI", so the
    // script has to ask exactly that.
    const task = assembleTask(input()).toLowerCase();
    expect(task).toContain("permission");
    expect(task).toContain("screening questions");
    expect(task).not.toContain("good time");
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
    expect(task).toContain("$55,000–$70,000 a year");
    expect(task).toContain("Hybrid, two days a week in Bangalore");
  });

  it("says one scripted opening line: disclosure, who for, which role, and consent", () => {
    expect(assembleTask(input())).toContain(
      '"Hi, is this Priya? This is an AI assistant calling for Sam at Northwind. You applied for the Senior Backend Engineer role, and this is a quick two-minute first screen. OK if I ask a few screening questions?"',
    );
  });

  it("says only the first name, never the surname", () => {
    const task = assembleTask(input({ candidateName: "Priya Sharma" }));
    expect(task).toContain('"Hi, is this Priya? This is an AI assistant');
    expect(task).toMatch(/first name, Priya, and nothing else/);
    expect(task).not.toContain("Sharma");
  });

  it("skips an honorific when it picks the first name", () => {
    expect(firstNameOf("Dr. Priya Sharma")).toBe("Priya");
    expect(firstNameOf("Priya")).toBe("Priya");
  });

  it("skips initials, reads surname-first names, and softens capitals", () => {
    expect(firstNameOf("K. Rao")).toBe("Rao");
    expect(firstNameOf("S.K. Rao")).toBe("Rao");
    expect(firstNameOf("Dr. K. Rao")).toBe("Rao");
    expect(firstNameOf("Rao, Priya")).toBe("Priya");
    expect(firstNameOf("PRIYA SHARMA")).toBe("Priya");
    expect(assembleTask(input({ candidateName: "K. Rao" }))).toContain('"Hi, is this Rao?');
  });

  it("does not thank them after every answer, only once at the close", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/do not thank them or comment after an answer/);
    expect(task).toMatch(/thank them once, at the close/);
    expect(task).not.toContain("brief acknowledgement");
  });

  it("accepts the first answer and never follows up", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/no follow-ups/);
    expect(task).not.toContain("ask once");
  });

  it("answers a candidate's question only from the fact sheet, and never solicits one", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/answer only from/);
    expect(task).not.toContain("any quick questions");
  });

  it("forbids answering beyond the fact sheet rather than improvising", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(/(do not|never) (guess|invent|make up)/);
  });

  it("states that the assistant cannot make or imply an offer", () => {
    const task = assembleTask(input()).toLowerCase();
    expect(task).toMatch(
      /never make or imply an offer|((cannot|do not) (make|imply|extend).*(offer|decision))/,
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

  it("conducts the call in the job's language while the script stays English", () => {
    const task = assembleTask(input({ speakLanguage: "Tamil" }));
    expect(task).toContain("Conduct the whole call in Tamil");
    // The instruction comes before the opening line, so the first word is Tamil.
    expect(task.indexOf("Conduct the whole call")).toBeLessThan(task.indexOf('"Hi, is this'));
    expect(task).toContain("What is your notice period?");
    expect(inspectScript(task).ok).toBe(true);
  });

  it("says nothing about language for an English call", () => {
    expect(assembleTask(input())).not.toContain("Conduct the whole call");
  });

  it("names the candidate and the role", () => {
    const task = assembleTask(input());
    expect(task).toContain("Priya");
    expect(task).toContain("Senior Backend Engineer");
    expect(task).toContain("Northwind");
  });
});
