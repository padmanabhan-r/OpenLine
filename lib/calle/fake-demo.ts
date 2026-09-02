import type { FakeCalleOptions } from "./fake-server";

/**
 * What the fake CALL-E says back when OpenLine runs with no account.
 *
 * `OPENLINE_FAKE_CALLE=1` swaps the SDK's transport for an in-process fake, so
 * the whole pipeline — claim, dial, wait, transcript, structured result, guard,
 * needs-human routing — runs end to end without a key, a network, or a phone
 * ringing. The canned conversation follows the real script: AI disclosure,
 * consent, the five basic-screen questions, one candidate question the fact
 * sheet cannot answer (so the needs-human route is exercised too).
 */

/** The name from "You are calling <name> about their application…". */
function candidateNameIn(task: string): string {
  const match = task.match(/^You are calling (.+?) about their application/);
  return match?.[1] ?? "there";
}

export const FAKE_SCREENING: FakeCalleOptions = {
  transcriptFor: (task) => {
    const name = candidateNameIn(task);
    const first = name.split(" ")[0];
    return [
      { offset_seconds: 0, speaker: "bot", text: `Hi, is this ${name}?` },
      { offset_seconds: 3, speaker: "user", text: "Yes, speaking." },
      {
        offset_seconds: 5,
        speaker: "bot",
        text: `Hi ${first}. I'm an AI assistant calling on behalf of the recruiter about your application. Is now a good time for a couple of quick questions?`,
      },
      { offset_seconds: 12, speaker: "user", text: "Sure, go ahead." },
      { offset_seconds: 14, speaker: "bot", text: "Are you still interested in the role?" },
      { offset_seconds: 17, speaker: "user", text: "Yes, very much. It looks like a good fit." },
      { offset_seconds: 20, speaker: "bot", text: "Briefly, what are you working on in your current role?" },
      {
        offset_seconds: 24,
        speaker: "user",
        text: "I lead a small team building retrieval pipelines for a fintech product.",
      },
      { offset_seconds: 31, speaker: "bot", text: "What is your notice period?" },
      { offset_seconds: 33, speaker: "user", text: "Sixty days, though I might be able to negotiate it down." },
      { offset_seconds: 38, speaker: "bot", text: "When could you realistically start?" },
      { offset_seconds: 40, speaker: "user", text: "Early November, realistically." },
      { offset_seconds: 43, speaker: "bot", text: "What are your salary expectations for this role?" },
      { offset_seconds: 46, speaker: "user", text: "Somewhere around fifty-five lakh, but I'm open to discussion." },
      { offset_seconds: 52, speaker: "bot", text: "Thanks. Do you have any quick questions for me?" },
      { offset_seconds: 55, speaker: "user", text: "Is the role remote, and how big is the team?" },
      {
        offset_seconds: 59,
        speaker: "bot",
        text: "The role is hybrid in Bangalore, three days a week. I don't have the team size to hand — the recruiter will follow up on that.",
      },
      { offset_seconds: 68, speaker: "user", text: "That's fine, thanks." },
      {
        offset_seconds: 70,
        speaker: "bot",
        text: "Thank you. The recruiter will follow up, and you'll get a copy of this conversation. Goodbye.",
      },
    ];
  },
  structuredResult: {
    reached_candidate: "yes",
    consent_given: "yes",
    answers: [
      {
        question_id: "q1",
        answer_status: "answered",
        answer: "Still interested.",
        evidence: "Yes, very much. It looks like a good fit.",
      },
      {
        question_id: "q2",
        answer_status: "answered",
        answer: "Leads a small team building retrieval pipelines for a fintech product.",
        evidence: "I lead a small team building retrieval pipelines for a fintech product.",
      },
      {
        question_id: "q3",
        answer_status: "answered",
        answer: "60 days, possibly negotiable.",
        evidence: "Sixty days, though I might be able to negotiate it down.",
      },
      {
        question_id: "q4",
        answer_status: "answered",
        answer: "Early November.",
        evidence: "Early November, realistically.",
      },
      {
        question_id: "q5",
        answer_status: "answered",
        answer: "Around 55 lakh, open to discussion.",
        evidence: "Somewhere around fifty-five lakh, but I'm open to discussion.",
      },
    ],
    availability: "early November",
    notice_period: "60 days",
    salary_expectation: "around 55 lakh, open to discussion",
    candidate_questions: [
      { question: "Is the role remote?", was_answered: "yes" },
      { question: "How big is the team?", was_answered: "no" },
    ],
    interest_level: "high",
    followup: "proceed",
    call_recap:
      "The candidate confirmed interest, described their current work, and gave a notice period, start date and salary expectation. They asked about remote work and team size; the assistant answered the first and deferred the second to the recruiter.",
  },
  confidence: { score: 0.91, label: "high" },
};
