"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";

/**
 * Mounted only while a call's status is "dialing".
 *
 * Refreshes the server-rendered page every few seconds; once the call reaches
 * a terminal state the re-rendered page no longer mounts this component, so
 * the polling stops by construction rather than by bookkeeping.
 */
export default function DialingWatcher({
  intervalMs = 4000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 16px",
        borderRadius: "var(--radius-sm)",
        background: "var(--accent-wash)",
        border: "1px solid var(--accent-soft)",
      }}
    >
      <Icon name="phone" size={16} style={{ color: "var(--accent-deep)" }} />
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
          Call initiated
        </p>
        <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
          The conversation is happening now. This page updates itself — no need
          to stay.
        </p>
      </div>
    </div>
  );
}
