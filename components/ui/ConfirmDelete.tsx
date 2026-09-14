"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

/**
 * Delete, in two clicks. The first shows what goes with it; the second names
 * the thing and does it. Same shape as Reject, because nothing here can be undone.
 * On success the action redirects, so only a refusal ever comes back.
 */
export default function ConfirmDelete({
  label,
  confirmLabel,
  consequence,
  action,
}: {
  label: string;
  confirmLabel: string;
  consequence: string;
  action: () => Promise<{ ok: false; reason: string } | undefined>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const outcome = await action();
      if (outcome && !outcome.ok) {
        setError(outcome.reason);
        setConfirming(false);
      }
    });
  };

  if (!confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          {label}
        </Button>
        {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--ink-2)", maxWidth: 260 }}>{consequence}</span>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      <Button size="sm" variant="soft" disabled={pending} onClick={run}>
        {pending ? <Icon name="clock" size={13} /> : null}
        {confirmLabel}
      </Button>
    </span>
  );
}
