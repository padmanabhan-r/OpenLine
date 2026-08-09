"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "dark" | "ghost" | "soft";
type Size = "sm" | "default" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid transparent",
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "transform .12s ease, background .18s ease, border-color .18s",
  borderRadius: "var(--radius-pill)",
  fontFamily: "inherit",
};

const variants: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--red)",
    color: "#fff",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.15)",
  },
  dark: { background: "var(--ink)", color: "var(--bg-2)" },
  ghost: {
    background: "transparent",
    color: "var(--ink)",
    borderColor: "var(--line)",
  },
  soft: {
    background: "var(--surface)",
    color: "var(--ink)",
    borderColor: "var(--line)",
    boxShadow: "var(--shadow-sm)",
  },
};

const sizes: Record<Size, CSSProperties> = {
  sm: { height: 38, padding: "0 16px", fontSize: 14 },
  default: { height: 46, padding: "0 22px", fontSize: 15 },
  lg: { height: 54, padding: "0 30px", fontSize: 16 },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "default", style, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (variant === "primary") el.style.background = "var(--red-deep)";
        if (variant === "dark") el.style.background = "#36281d";
        if (variant === "ghost") {
          el.style.background = "var(--surface)";
          el.style.borderColor = "var(--ink-3)";
        }
        if (variant === "soft") el.style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        Object.assign(e.currentTarget.style, variants[variant]);
      }}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
