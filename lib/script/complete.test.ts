import { describe, expect, it } from "vitest";
import { completeResult, type ScreeningResult } from "./schema";

const questions = [
  { id: "q1", text: "Are you still interested in the Senior AI Engineer role at Northwind Payments?" },
  { id: "q2", text: "Briefly, what are you working on in your current role?" },
  { id: "q3", text: "What is your notice period?" },
  { id: "q4", text: "When could you realistically start?" },
  { id: "q5", text: "What are your salary expectations for this role?" },
];

// The shape a real call came back in: every answer extracted with the
// candidate's words, but the start date left out of `availability`, the
// salary left out of its field, and the next step recorded as `none`.
const fromCall = (overrides: Partial<ScreeningResult> = {}): ScreeningResult => ({
  reached_candidate: "yes",
  consent_given: "yes",
  answers: [
    { question_id: "q1", answer_status: "answered", answer: "Yes, still interested.", evidence: "Yes, I am." },
    { question_id: "q2", answer_status: "answered", answer: "Building a RAG application.", evidence: "I'm building a rag project." },
    { question_id: "q3", answer_status: "answered", answer: "2 months.", evidence: "It's 2 months." },
    { question_id: "q4", answer_status: "answered", answer: "October.", evidence: "October." },
    { question_id: "q5", answer_status: "answered", answer: "Around $90,000 a year.", evidence: "Around ninety thousand dollars." },
  ],
  availability: "",
  notice_period: "2 months",
  salary_expectation: "",
  candidate_questions: [],
  interest_level: "high",
  followup: "none",
  call_recap: "The candidate completed the screen.",
  ...overrides,
});

describe("completeResult", () => {
  it("fills the start date from the answer to the start question, and says so", () => {
    const result = completeResult(fromCall(), questions);
    expect(result.availability).toBe("October");
    expect(result.filledFrom.availability).toBe("q4");
  });

  it("never fills the salary expectation, which could hold a current salary", () => {
    expect(completeResult(fromCall(), questions).salary_expectation).toBe("");
  });

  it("never overwrites a field CALL-E already filled, and marks nothing then", () => {
    const result = completeResult(fromCall({ availability: "after my notice period" }), questions);
    expect(result.availability).toBe("after my notice period");
    expect(result.filledFrom.availability).toBeUndefined();
    expect(result.notice_period).toBe("2 months");
  });

  it("does not fill a field from a question the candidate declined", () => {
    const declined = fromCall();
    declined.answers[3] = { question_id: "q4", answer_status: "declined", answer: "", evidence: "" };
    expect(completeResult(declined, questions).availability).toBe("");
  });

  it("leaves a field empty when no question in the script asked for it", () => {
    const edited = questions.filter((q) => q.id !== "q4");
    expect(completeResult(fromCall(), edited).availability).toBe("");
  });

  it("does not read a question that merely mentions starting as a start date", () => {
    const edited = questions.map((q) =>
      q.id === "q4" ? { ...q, text: "Why did you start looking for a new role?" } : q,
    );
    expect(completeResult(fromCall(), edited).availability).toBe("");
  });

  it("does not read a relocation question that says 'start in' as a start date", () => {
    const edited = questions.map((q) =>
      q.id === "q4" ? { ...q, text: "Could you start in Singapore within three months?" } : q,
    );
    expect(completeResult(fromCall(), edited).availability).toBe("");
  });

  it("fills neither field from a question that asks for both", () => {
    const combined = questions.map((q) =>
      q.id === "q3" ? { ...q, text: "What is your notice period, and when could you start?" } : q,
    );
    const result = completeResult(fromCall({ notice_period: "" }), combined);
    expect(result.notice_period).toBe("");
    expect(result.availability).toBe("October");
  });

  it("reads a completed, consented, interested screen as proceed rather than none", () => {
    const result = completeResult(fromCall(), questions);
    expect(result.followup).toBe("proceed");
    expect(result.filledFrom.followup).toBe("the call");
  });

  it("keeps unknown as unknown: that is CALL-E saying it could not tell", () => {
    expect(completeResult(fromCall({ followup: "unknown" }), questions).followup).toBe("unknown");
  });

  it("keeps none when the candidate withdrew", () => {
    expect(completeResult(fromCall({ interest_level: "withdrew" }), questions).followup).toBe("none");
  });

  it("keeps none when there was no consent", () => {
    expect(completeResult(fromCall({ consent_given: "no" }), questions).followup).toBe("none");
  });

  it("never replaces a request for a person", () => {
    const result = completeResult(fromCall({ followup: "human_callback_requested" }), questions);
    expect(result.followup).toBe("human_callback_requested");
  });
});
