import type { FakeCalleOptions } from "./fake-server";

/**
 * What the fake CALL-E says back when OpenLine runs with no account.
 *
 * `OPENLINE_FAKE_CALLE=1` swaps the SDK's transport for an in-process fake, so
 * the whole pipeline — claim, dial, wait, transcript, structured result, guard,
 * needs-human routing — runs end to end without a key, a network, or a phone
 * ringing. The canned conversation follows the real script: the one quoted
 * opening line (disclosure and consent in one breath), the five basic-screen
 * questions, one candidate question the fact sheet cannot answer (so the
 * needs-human route is exercised too), and a one-line close.
 */

/** The name from "You are calling <name> about their application…". */
function candidateNameIn(task: string): string {
  const match = task.match(/^You are calling (.+?) about their application/);
  return match?.[1] ?? "there";
}

/**
 * The quoted opening line from the task, spoken exactly as written. A task
 * without one (a hand-written test task) gets the shortest honest version.
 */
function openingLineIn(task: string, name: string): string {
  const match = task.match(/^"(Hi, is this .+?)"$/m);
  return (
    match?.[1] ??
    `Hi, is this ${name}? This is an AI assistant calling for the recruiter about your application. OK if I ask a few screening questions?`
  );
}

export const FAKE_SCREENING: FakeCalleOptions = {
  transcriptFor: (task) => {
    const name = candidateNameIn(task);
    return [
      { offset_seconds: 0, speaker: "bot", text: openingLineIn(task, name) },
      { offset_seconds: 9, speaker: "user", text: "Yes, go ahead." },
      { offset_seconds: 11, speaker: "bot", text: "Are you still interested in the role?" },
      { offset_seconds: 14, speaker: "user", text: "Yes, very much. It looks like a good fit." },
      { offset_seconds: 17, speaker: "bot", text: "Briefly, what are you working on in your current role?" },
      {
        offset_seconds: 21,
        speaker: "user",
        text: "I lead a small team building retrieval pipelines for a fintech product.",
      },
      { offset_seconds: 28, speaker: "bot", text: "What is your notice period?" },
      { offset_seconds: 30, speaker: "user", text: "Sixty days, though I might be able to negotiate it down." },
      { offset_seconds: 35, speaker: "bot", text: "When could you realistically start?" },
      { offset_seconds: 37, speaker: "user", text: "Early November, realistically." },
      { offset_seconds: 40, speaker: "bot", text: "What are your salary expectations for this role?" },
      {
        offset_seconds: 43,
        speaker: "user",
        text: "Somewhere around fifty-five lakh, but I'm open to discussion. Is the role remote, and how big is the team?",
      },
      {
        offset_seconds: 50,
        speaker: "bot",
        text: "The role is hybrid, two days a week in the Bangalore office. I don't have the team size to hand — the recruiter will follow up on that.",
      },
      { offset_seconds: 58, speaker: "user", text: "That's fine, thanks." },
      {
        offset_seconds: 60,
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
