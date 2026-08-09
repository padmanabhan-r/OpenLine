import type { CSSProperties, ReactNode } from "react";

export type BadgeTone =
  | "accent"
  | "good"
  | "warn"
  | "info"
  | "neutral"
  | "danger";

const tones: Record<BadgeTone, CSSProperties> = {
  accent: { color: "var(--red)", background: "var(--red-tint)", borderColor: "#F0D6CC" },
  good: { color: "var(--green)", background: "var(--green-wash)", borderColor: "#D7DEC6" },
  warn: { color: "var(--amber)", background: "var(--amber-wash)", borderColor: "#E6D3AC" },
  info: { color: "var(--blue)", background: "var(--blue-wash)", borderColor: "#CDD6E0" },
  neutral: { color: "var(--ink-3)", background: "var(--bg-2)", borderColor: "var(--line)" },
  danger: { color: "var(--red-deep)", background: "var(--red-wash)", borderColor: "#EFCBBD" },
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
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "currentColor",
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
        color: accent ? "var(--red-deep)" : "var(--ink-2)",
        background: accent ? "var(--red-tint)" : "var(--surface)",
        borderColor: accent ? "#F0D6CC" : "var(--line)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
