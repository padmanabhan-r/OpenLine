import { describe, expect, it } from "vitest";
import {
  CALL_LANGUAGES,
  DEFAULT_CALL_LANGUAGE,
  isCallLanguage,
  languageLabel,
  spokenLanguage,
  unreadLanguageReason,
} from "./language";

describe("call languages", () => {
  it("offers both English variants", () => {
    expect(isCallLanguage("en-US")).toBe(true);
    expect(isCallLanguage("en-IN")).toBe(true);
    expect(languageLabel("en-US")).toBe("English (US)");
  });

  it("adds no language instruction and no unread-transcript routing for either English", () => {
    for (const locale of ["en-US", "en-IN"]) {
      expect(spokenLanguage(locale)).toBeUndefined();
      expect(unreadLanguageReason(locale)).toBeNull();
    }
  });

  it("still routes a call in another language to a person", () => {
    expect(spokenLanguage("ta-IN")).toBe("Tamil");
    expect(unreadLanguageReason("ta-IN")).toMatch(/Tamil/);
  });

  it("refuses a tag that is not on the list, and keeps the default on it", () => {
    expect(isCallLanguage("fr-FR")).toBe(false);
    expect(CALL_LANGUAGES.some((l) => l.locale === DEFAULT_CALL_LANGUAGE)).toBe(true);
  });
});
