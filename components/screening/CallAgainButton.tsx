"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { callAgain } from "@/app/(app)/calls/[id]/actions";

/**
 * Re-dial from a finished call's page. The finished call stays untouched as a
 * record; a fresh attempt is created and the page navigates to it.
 */
export default function CallAgainButton({
  screeningCallId,
  candidateName,
}: {
  screeningCallId: string;
  candidateName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = candidateName.split(" ")[0];

  return (
    <div style={{ textAlign: "right", maxWidth: 340 }}>
      {confirming ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const outcome = await callAgain(screeningCallId);
                if (!outcome.ok) {
                  setError(outcome.reason);
                  setConfirming(false);
                  return;
                }
                router.push(`/calls/${outcome.newCallId}`);
              });
            }}
          >
            <Icon name={pending ? "clock" : "phone"} size={15} />
            {pending ? "Starting…" : `Yes, call ${firstName} again`}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Icon name="phone" size={15} />
          Call again
        </Button>
      )}
      {confirming && !pending && (
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>
          This dials {candidateName} again. This call&rsquo;s record stays intact.
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
