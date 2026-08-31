"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

/**
 * Sticky nav over the exchange floor: smoked bakelite once the page scrolls,
 * a hairline rule marking the edge. One quiet console link on the right.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px clamp(16px, 3vw, 34px)",
        background: scrolled ? "var(--bg-glass)" : "transparent",
        backdropFilter: scrolled ? "var(--blur)" : "none",
        WebkitBackdropFilter: scrolled ? "var(--blur)" : "none",
        borderBottom: scrolled ? "1px solid var(--line-2)" : "1px solid transparent",
        transition: "background .25s ease, border-color .25s ease",
      }}
    >
      <Link href="/" aria-label="OpenLine home">
        <Logo size={28} word />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {/* Plate, not pill: the hero's brass CTA stands alone in the viewport. */}
        <Link
          href="/jobs"
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            whiteSpace: "nowrap",
          }}
        >
          Open the console
        </Link>
      </div>
    </nav>
  );
}
