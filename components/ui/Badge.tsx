import type { CSSProperties, ReactNode } from "react";

export type BadgeTone =
  | "accent"
  | "good"
  | "warn"
  | "info"
  | "neutral"
  | "danger";

/* Borders derive from each tone's own color, so a retint never orphans them. */
const edge = (tone: string) => `color-mix(in srgb, ${tone} 38%, transparent)`;

const tones: Record<BadgeTone, CSSProperties> = {
  accent: { color: "var(--accent-deep)", background: "var(--accent-tint)", borderColor: edge("var(--accent)") },
  good: { color: "var(--green)", background: "var(--green-wash)", borderColor: edge("var(--green)") },
  warn: { color: "var(--amber)", background: "var(--amber-wash)", borderColor: edge("var(--amber)") },
  info: { color: "var(--blue)", background: "var(--blue-wash)", borderColor: edge("var(--blue)") },
  neutral: { color: "var(--ink-3)", background: "var(--bg-2)", borderColor: "var(--line)" },
  // Danger stays red. A guard violation in a cheerful tone would be a lie.
  danger: { color: "var(--danger-deep)", background: "var(--danger-wash)", borderColor: edge("var(--danger)") },
};

export default function Badge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 11px",
        borderRadius: "var(--radius-pill)",
        fontSize: 12.5,
        fontWeight: 600,
        border: "1px solid",
        whiteSpace: "nowrap",
        ...tones[tone],
      }}
    >
      {dot && (
        <span
          // The dot is a jewel lamp now — lit glass, not a flat disc.
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "currentColor",
            boxShadow: "0 0 5px 1px currentColor",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export function Chip({
  children,
  accent = false,
  style,
}: {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 12px",
        borderRadius: "var(--radius-pill)",
        fontSize: 13,
        fontWeight: 500,
        border: "1px solid",
        whiteSpace: "nowrap",
        color: accent ? "var(--accent-deep)" : "var(--ink-2)",
        background: accent ? "var(--accent-tint)" : "var(--surface)",
        borderColor: accent
          ? "color-mix(in srgb, var(--accent) 38%, transparent)"
          : "var(--line)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
