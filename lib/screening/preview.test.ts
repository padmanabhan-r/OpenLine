import { describe, expect, it } from "vitest";
import { basicScreenQuestions } from "./preview";
import { inspectScript } from "@/lib/script/guard";

describe("basicScreenQuestions", () => {
  const questions = basicScreenQuestions("Senior AI Engineer", "Northwind Payments");

  it("asks exactly the five basic-screen questions, in order", () => {
    expect(questions).toHaveLength(5);
    expect(questions[0]).toContain("still interested");
    expect(questions[1]).toContain("current role");
    expect(questions[2]).toContain("notice period");
    expect(questions[3]).toContain("start");
    expect(questions[4]).toContain("salary expectations");
  });

  it("names the actual role and company, so the call is not generic", () => {
    expect(questions[0]).toContain("Senior AI Engineer");
    expect(questions[0]).toContain("Northwind Payments");
  });

  it("is guard-clean, question by question", () => {
    // Salary EXPECTATIONS are permitted; current salary is not. This pins the
    // template on the right side of that line.
    for (const q of questions) {
      expect(inspectScript(q).ok, q).toBe(true);
    }
  });

  it("is deterministic — the same job always yields the same script", () => {
    expect(basicScreenQuestions("Senior AI Engineer", "Northwind Payments")).toEqual(
      questions,
    );
  });
});
