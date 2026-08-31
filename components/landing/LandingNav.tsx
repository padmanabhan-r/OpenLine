"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
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
        {/* The console link is the page's only call to action now that the
            hero carries none, so it takes the brass rather than a plate. */}
        <Link href="/jobs">
          <Button size="sm">Open the console</Button>
        </Link>
      </div>
    </nav>
  );
}
