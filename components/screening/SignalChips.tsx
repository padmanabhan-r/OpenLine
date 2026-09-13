import Badge from "@/components/ui/Badge";

/**
 * What the call actually established, at a glance.
 *
 * These chips exist so a list answers "is this person worth my attention"
 * without opening the transcript: did we reach them, how keen are they, how
 * soon could they move, and whether the call left something for a human.
 */
export default function SignalChips({
  reachedCandidate,
  interestLevel,
  noticePeriod,
  needsHuman,
}: {
  reachedCandidate?: string | null;
  interestLevel?: string | null;
  noticePeriod?: string | null;
  needsHuman?: boolean | null;
}) {
  const chips: Array<{ label: string; tone: "good" | "warn" | "info" | "neutral" }> = [];

  if (reachedCandidate && reachedCandidate !== "yes") {
    chips.push({ label: reachedCandidate.replace("_", " "), tone: "warn" });
  }
  if (interestLevel) {
    chips.push({
      label: `interest: ${interestLevel.replace("_", " ")}`,
      tone: interestLevel === "high" ? "good" : interestLevel === "low" ? "warn" : "info",
    });
  }
  if (noticePeriod) {
    chips.push({ label: noticePeriod, tone: "neutral" });
  }
  if (chips.length === 0 && !needsHuman) return null;

  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {chips.slice(0, 3).map((chip) => (
        <Badge key={chip.label} tone={chip.tone}>
          {chip.label}
        </Badge>
      ))}
      {needsHuman && (
        <Badge tone="warn" dot>
          Needs you
        </Badge>
      )}
    </span>
  );
}
