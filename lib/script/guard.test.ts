import { describe, expect, it } from "vitest";
import { inspectScript, inspectTranscript } from "./guard";

const categoriesOf = (text: string) =>
  inspectScript(text).findings.map((f) => f.category);

describe("inspectScript — blocks protected-class questions", () => {
  it.each([
    ["how old are you?", "age"],
    ["What is your age?", "age"],
    ["Can you tell me your date of birth?", "age"],
    ["What year were you born?", "age"],
    ["What year did you graduate?", "age"],
    ["Are you married?", "marital_family"],
    ["What is your marital status?", "marital_family"],
    ["Do you have any children?", "marital_family"],
    ["Are you planning to start a family?", "pregnancy"],
    ["Are you currently pregnant?", "pregnancy"],
    ["What religion do you follow?", "religion_caste"],
    ["Which caste do you belong to?", "religion_caste"],
    ["What community are you from?", "religion_caste"],
    ["What is your nationality?", "national_origin"],
    ["Where are you originally from?", "national_origin"],
    ["What is your mother tongue?", "national_origin"],
    ["Do you have any disabilities?", "disability_health"],
    ["Do you have any medical conditions?", "disability_health"],
    ["Are you male or female?", "gender_orientation"],
    ["What is your sexual orientation?", "gender_orientation"],
    ["Which party did you vote for?", "political"],
    ["What is your current salary?", "salary_history"],
    ["What is your current CTC?", "salary_history"],
    ["What do you earn at the moment?", "salary_history"],
    ["What salary are you on at the moment?", "salary_history"],
    ["What's your salary now?", "salary_history"],
    ["What is your present salary?", "salary_history"],
    ["What was your last salary?", "salary_history"],
    // A lawful clause must not hide the unlawful one joined to it.
    ["Find out whether they need visa sponsorship and their current salary.", "salary_history"],
    ["Check whether they require sponsorship and their nationality.", "national_origin"],
    ["Do you need visa sponsorship, and what is your current salary?", "salary_history"],
  ])("blocks %j as %s", (text, category) => {
    const result = inspectScript(text);
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.category)).toContain(category);
  });

  it("reports the offending span so the UI can highlight it", () => {
    const script =
      "Introduce yourself. Then ask: how old are you? Then thank them.";
    const [finding] = inspectScript(script).findings;
    expect(finding.category).toBe("age");
    expect(script.slice(finding.start, finding.end).toLowerCase()).toContain(
      "how old are you",
    );
  });

  describe("reported speech — how a generated script actually phrases things", () => {
    // A script is an instruction *to* the agent, so violations arrive as
    // "Ask whether they are married", not "Are you married?".
    it.each([
      ["Ask how old they are.", "age"],
      ["Find out when they graduated.", "age"],
      ["Ask whether they are married.", "marital_family"],
      ["Check if they have children.", "marital_family"],
      ["Ask if she is pregnant.", "pregnancy"],
      ["Find out their nationality.", "national_origin"],
      ["Ask what country they are from.", "national_origin"],
      ["Ask whether the candidate is healthy.", "disability_health"],
      ["Ask how much they currently earn.", "salary_history"],
      ["Note their current CTC.", "salary_history"],
      ["Ask who they voted for.", "political"],
      ["Record the candidate's gender.", "gender_orientation"],
    ])("blocks %j as %s", (text, category) => {
      const result = inspectScript(text);
      expect(result.ok).toBe(false);
      expect(result.findings.map((f) => f.category)).toContain(category);
    });

    it("still permits reported-speech versions of lawful questions", () => {
      expect(
        inspectScript(
          "Ask whether they are authorised to work in India, and what their salary expectations are.",
        ).ok,
      ).toBe(true);
    });
  });

  it("reports every distinct violation, not just the first", () => {
    const categories = categoriesOf(
      "Ask how old they are, whether they are married, and their current CTC.",
    );
    expect(new Set(categories)).toEqual(
      new Set(["age", "marital_family", "salary_history"]),
    );
  });
});

describe("inspectScript — a lawful phrase never hides what is joined to it", () => {
  it.each([
    "Find out whether they need visa sponsorship as well as their current salary.",
    "Do you need visa sponsorship plus your current salary?",
    "Check whether they require sponsorship along with their nationality.",
    "Do you need visa sponsorship given your nationality?",
    "Are you authorised to work in the UK with your nationality?",
    "Are you authorized to work here or what is your age?",
  ])("blocks %j", (text) => {
    expect(inspectScript(text).ok).toBe(false);
  });
});

describe("inspectScript — permits legitimate questions", () => {
  it.each([
    // Work authorisation is lawful; nationality is not. This pair is the whole
    // reason the guard cannot be a keyword ban.
    "Are you authorised to work in India?",
    "Are you legally authorized to work in the United States?",
    "Do you have the right to work in the UK?",
    "Will you require visa sponsorship for this role?",
    // Compensation *expectations* are fine; compensation *history* is not.
    "What are your salary expectations for this role?",
    "What is your expected CTC?",
    // Ordinary screening questions that brush protected vocabulary.
    "How many years of experience do you have with TypeScript?",
    "What is your notice period?",
    "Are you able to travel to the Bangalore office twice a month?",
    "Which programming communities are you active in?",
    "Tell me about the team you currently work with.",
    // Salary words that are not a question about current pay, including the
    // agent's own line when it lacks a detail.
    "What salary would you want now?",
    "Is the salary band OK for you today?",
    "Have you had any past pay disputes?",
    "I don't have the salary details right now, so the recruiter will follow up.",
    "I don't have that salary detail at the moment.",
    "The salary band is currently $65,000 to $90,000 a year.",
  ])("permits %j", (text) => {
    const result = inspectScript(text);
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("permits an entire clean generated script", () => {
    const script = [
      "You are calling Priya about the Senior Backend Engineer role.",
      "Disclose that you are an AI assistant and ask if now is a good time.",
      "Ask: what is your notice period?",
      "Ask: what are your salary expectations?",
      "Ask: are you authorised to work in India?",
      "Answer any questions they have about the role.",
    ].join("\n");
    expect(inspectScript(script).ok).toBe(true);
  });
});

describe("inspectTranscript", () => {
  const turn = (speaker: "bot" | "user", text: string) => ({
    speaker,
    text,
    offsetSeconds: 0,
  });

  it("flags the agent asking a prohibited question", () => {
    const result = inspectTranscript([
      turn("bot", "Thanks for taking the call. How old are you?"),
      turn("user", "I'd rather not say."),
    ]);
    expect(result.ok).toBe(false);
    expect(result.findings[0].category).toBe("age");
  });

  it("does not flag the candidate volunteering protected information", () => {
    // The candidate mentioning their own age is not a violation by the agent.
    // Only what the agent asked is in scope.
    const result = inspectTranscript([
      turn("bot", "What is your notice period?"),
      turn("user", "About a month. I'm 34 and married, if that matters."),
    ]);
    expect(result.ok).toBe(true);
  });

  it("records which turn the violation came from", () => {
    const result = inspectTranscript([
      turn("bot", "What is your notice period?"),
      turn("user", "Two months."),
      turn("bot", "And are you married?"),
    ]);
    expect(result.findings[0].turnIndex).toBe(2);
  });

  it("passes a clean transcript", () => {
    expect(
      inspectTranscript([
        turn("bot", "Are you authorised to work in India?"),
        turn("user", "Yes, I'm a citizen."),
      ]).ok,
    ).toBe(true);
  });
});
