"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const LINKS = [
  { label: "Where it sits", href: "#how-it-works" },
  { label: "Features", href: "#features" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "16px 28px",
        background: "color-mix(in srgb, var(--bg) 80%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
        transition: "border-color .2s",
      }}
    >
      <Link href="/">
        <Logo size={28} word />
      </Link>

      {/* Pushed right: the nav carries no call to action — the hero's is the
          only "Open the console" on the page. */}
      <div
        style={{ display: "flex", gap: 26, marginLeft: "auto" }}
        className="nav-links"
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: 14.5,
              fontWeight: 500,
              color: "var(--ink-2)",
              transition: "color .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
