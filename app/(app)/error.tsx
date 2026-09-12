"use client";

import { useEffect } from "react";
import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";

/**
 * The console's own error page.
 *
 * A database hiccup during judging should read like OpenLine, not like a
 * framework. Nothing here dials, and nothing here hides what happened: the
 * message is shown, and the one action is to try again.
 */
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("console error boundary:", error);
  }, [error]);

  return (
    <>
      <TopBar
        title="Something went wrong"
        subtitle="The page could not be loaded. No call was placed."
      />
      <Page>
        <Panel>
          <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {error.message || "An unexpected error occurred."}
              {error.digest && (
                <span className="mono" style={{ color: "var(--ink-3)" }}>
                  {" "}
                  ({error.digest})
                </span>
              )}
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>
              Usually this is the database waking up. Everything already
              recorded is still there.
            </p>
            <div>
              <Button size="sm" onClick={() => reset()}>
                Try again
              </Button>
            </div>
          </div>
        </Panel>
      </Page>
    </>
  );
}
