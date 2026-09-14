/**
 * The languages a screening call can be conducted in.
 *
 * Two jobs per entry: `locale` goes to CALL-E as the voice and conversation
 * locale for the call; `spoken` (when set) goes into the task text as
 * "conduct the whole call in Tamil". English has no `spoken` — the script is
 * already English, and an instruction to speak English would only add words
 * to the call. The questions stay written in English on the script a
 * recruiter reviews, whatever the agent says on the line.
 *
 * A curated list rather than the BCP 47 registry: a malformed tag reaches a
 * real phone, so only tags we have a name for are offered.
 *
 * Known limit: the post-call transcript guard reads English only, so a call
 * in any other language is routed to a human with that reason, every time.
 */
export const CALL_LANGUAGES = [
  { locale: "en-US", label: "English (US)" },
  { locale: "en-IN", label: "English (India)" },
  { locale: "hi-IN", label: "Hindi", spoken: "Hindi" },
  { locale: "ta-IN", label: "Tamil", spoken: "Tamil" },
  { locale: "te-IN", label: "Telugu", spoken: "Telugu" },
  { locale: "kn-IN", label: "Kannada", spoken: "Kannada" },
  { locale: "ml-IN", label: "Malayalam", spoken: "Malayalam" },
] as const;

export type CallLanguage = (typeof CALL_LANGUAGES)[number]["locale"];

export const DEFAULT_CALL_LANGUAGE: CallLanguage = "en-US";

export function isCallLanguage(value: string): value is CallLanguage {
  return CALL_LANGUAGES.some((l) => l.locale === value);
}

/** The English name of the language to speak, or undefined for English itself. */
export function spokenLanguage(locale: string): string | undefined {
  const entry = CALL_LANGUAGES.find((l) => l.locale === locale);
  return entry && "spoken" in entry ? entry.spoken : undefined;
}

export function languageLabel(locale: string): string {
  return CALL_LANGUAGES.find((l) => l.locale === locale)?.label ?? locale;
}

/**
 * Why a call in this language needs a person to read it, or null for English.
 * The post-call transcript guard reads English only, and a clean verdict on
 * text it never read would be a lie.
 */
export function unreadLanguageReason(locale: string): string | null {
  const spoken = spokenLanguage(locale);
  return spoken
    ? `The call was conducted in ${spoken}. The prohibited-topic check reads English only, so this transcript was not checked — read it.`
    : null;
}
