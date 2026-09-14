/**
 * A call's transcript as chat bubbles: the agent on the left, the person on
 * the right, each turn stamped with its offset into the call. Plain markup, so
 * the call page and Try a call render what was said the same way.
 */
export interface TranscriptTurn {
  speaker: string;
  text: string;
  offsetSeconds?: number | null;
}

export default function Transcript({
  turns,
  candidateFirstName,
}: {
  turns: TranscriptTurn[];
  candidateFirstName: string;
}) {
  return (
    <div style={{ display: "grid", gap: 10, maxHeight: 520, overflowY: "auto" }}>
      {turns.map((turn, i) => {
        const isAgent = turn.speaker === "bot";
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isAgent ? "flex-start" : "flex-end",
            }}
          >
            <div
              style={{
                maxWidth: "76%",
                padding: "10px 14px",
                borderRadius: 14,
                background: isAgent ? "var(--surface-2)" : "var(--accent-tint)",
                border: `1px solid ${isAgent ? "var(--line-2)" : "color-mix(in srgb, var(--accent) 35%, transparent)"}`,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  marginBottom: 4,
                }}
              >
                {isAgent ? "OpenLine" : candidateFirstName}
                {turn.offsetSeconds != null &&
                  ` · ${Math.floor(turn.offsetSeconds / 60)}:${String(
                    turn.offsetSeconds % 60,
                  ).padStart(2, "0")}`}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>{turn.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
