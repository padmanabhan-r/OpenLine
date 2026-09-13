import type { ReactNode } from "react";

/** The one input treatment on the job form. Shared so the client and server halves match. */
export const FIELD_STYLE = {
  width: "100%",
  fontSize: 14,
  fontFamily: "inherit",
  padding: "10px 13px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
} as const;

export default function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>
        {label}
      </span>
      {hint && (
        <span
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            display: "block",
            marginBottom: 7,
            maxWidth: 560,
          }}
        >
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}
