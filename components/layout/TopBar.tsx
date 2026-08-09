import type { ReactNode } from "react";

export default function TopBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        minHeight: 70,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 34px",
        borderBottom: "1px solid rgba(50,30,5,0.10)",
        background: "var(--bg-glass)",
        backdropFilter: "var(--blur-strong)",
        WebkitBackdropFilter: "var(--blur-strong)",
        boxShadow: "0 1px 0 var(--glass-edge), var(--shadow-sm)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: "-.02em",
            color: "var(--ink)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ flex: 1 }} />
      {actions}
    </header>
  );
}

/** Standard page body width and padding. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div
      className="fade-up"
      style={{ padding: "28px 34px 64px", maxWidth: 1180, width: "100%" }}
    >
      {children}
    </div>
  );
}

/** A glass panel. */
export function Panel({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--bg-glass)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        border: "1px solid rgba(50,30,5,0.10)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--glass-edge)",
        overflow: "hidden",
        ...(padded ? { padding: 22 } : {}),
      }}
    >
      {children}
    </section>
  );
}
