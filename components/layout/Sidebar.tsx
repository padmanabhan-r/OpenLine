"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";

const navMain = [
  { href: "/jobs", label: "Jobs", icon: "jobs" },
  { href: "/calls", label: "Screening Calls", icon: "phone" },
];

const navAccount = [{ href: "/safety", label: "Safety", icon: "shield" }];

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--red)" : "var(--ink-2)",
        background: active ? "rgba(197,52,27,0.10)" : "transparent",
        border: active
          ? "1px solid rgba(197,52,27,0.20)"
          : "1px solid transparent",
        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.40)" : "none",
        transition: "background .15s, color .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.background = "rgba(255,253,248,0.45)";
        e.currentTarget.style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--ink-2)";
      }}
    >
      <Icon
        name={icon}
        size={19}
        style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}
      />
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        color: "var(--ink-3)",
        padding: "18px 12px 7px",
        opacity: 0.7,
      }}
    >
      {label}
    </div>
  );
}

export default function Sidebar({ liveCalls }: { liveCalls: boolean }) {
  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--bg-glass)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        borderRight: "1px solid rgba(50,30,5,0.10)",
        boxShadow:
          "2px 0 24px rgba(70,45,20,.06), inset -1px 0 0 var(--glass-edge)",
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "6px 8px 22px" }}>
        <Link href="/jobs">
          <Logo size={28} word />
        </Link>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <SectionLabel label="Pipeline" />
        {navMain.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        <SectionLabel label="Account" />
        {navAccount.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/*
        Dial mode is always visible. This app can place real phone calls, and which
        mode it is in should never be something you have to go and check.
      */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 12px",
          borderRadius: 14,
          border: `1px solid ${liveCalls ? "rgba(197,52,27,0.28)" : "rgba(50,30,5,0.10)"}`,
          background: liveCalls
            ? "var(--red-tint)"
            : "rgba(255,253,248,0.45)",
          boxShadow: "inset 0 1px 0 var(--glass-edge)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            background: liveCalls ? "var(--red)" : "var(--green)",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
            {liveCalls ? "Live calls" : "Dry run"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.35 }}>
            {liveCalls ? "Real calls will be placed" : "Nothing will dial"}
          </div>
        </div>
      </div>
    </aside>
  );
}
