"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { callCandidate } from "@/app/(app)/calls/[id]/actions";

/**
 * The one control in OpenLine that spends money and rings a stranger.
 *
 * It asks for confirmation naming the person, because "are you sure?" is
 * useless when you cannot remember which row you clicked. Starting the call
 * takes a second or two; the conversation itself continues detached, and the
 * page's dialing banner takes over from there.
 */
export default function CallButton({
  screeningCallId,
  candidateId,
  candidateName,
  scriptVersion,
  disabled,
  disabledReason,
}: {
  screeningCallId: string;
  candidateId: string;
  candidateName: string;
  /** The version of the words on screen — what the confirmation is for. */
  scriptVersion: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <div style={{ textAlign: "right", maxWidth: 320 }}>
        <Button size="sm" disabled>
          <Icon name="phone" size={15} />
          Place call
        </Button>
        {disabledReason && (
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            {disabledReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ textAlign: "right", maxWidth: 340 }}>
      {confirming ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await callCandidate(screeningCallId, {
                  candidateId,
                  scriptVersion,
                });
                if (!result.ok) setError(result.reason);
                setConfirming(false);
              });
            }}
          >
            <Icon name={pending ? "clock" : "phone"} size={15} />
            {pending ? "Starting call…" : `Yes, call ${candidateName.split(" ")[0]}`}
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setConfirming(true)}>
          <Icon name="phone" size={15} />
          Place call
        </Button>
      )}

      {confirming && !pending && (
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>
          This dials {candidateName} for real and uses one CALL-E call.
        </p>
      )}
      {pending && (
        <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>
          Asking CALL-E to dial…
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
