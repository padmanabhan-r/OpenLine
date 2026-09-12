import TopBar, { Page, Panel } from "@/components/layout/TopBar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { operatorStatus, operatorTokenConfigured } from "@/lib/operator";
import { resolveCalleMode } from "@/lib/calle/port";
import { lockConsole, resetDemoData, unlockConsole } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The one door onto a deployment that can ring a real phone.
 *
 * Anyone can read the console. Placing a call, uploading a resume, or building
 * scripts needs the operator token, which lives only in the deployment's
 * environment and in the httpOnly cookie this page sets.
 */
export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string }>;
}) {
  const { wrong } = await searchParams;
  const configured = operatorTokenConfigured();
  const status = await operatorStatus();
  const mode = resolveCalleMode();

  return (
    <>
      <TopBar
        title="Unlock the console"
        subtitle="Reading is open to everyone. Dialing, uploading, and building scripts need the operator token."
      />
      <Page>
        <Panel>
          <div style={{ display: "grid", gap: 18, maxWidth: 560 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge tone={status.ok ? "good" : "warn"} dot>
                {status.ok ? "Unlocked" : "Locked"}
              </Badge>
              <Badge tone={mode === "live" ? "danger" : "info"} dot>
                {mode === "live"
                  ? "Calls are live"
                  : mode === "fake"
                    ? "Calls are simulated"
                    : "Calls are off"}
              </Badge>
            </div>

            {!configured ? (
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
                No <code>OPENLINE_OPERATOR_TOKEN</code> is set, so this
                console is open to whoever can reach it.{" "}
                {status.ok
                  ? "That is fine on a laptop."
                  : "In production with a live CALL-E key, that means no call can be placed until one is set."}
              </p>
            ) : status.ok ? (
              <div style={{ display: "grid", gap: 18 }}>
                <form action={lockConsole}>
                  <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 12 }}>
                    This browser holds the console. Lock it when you are done.
                  </p>
                  <Button size="sm" variant="ghost" type="submit">
                    Lock this browser
                  </Button>
                </form>
                {mode === "fake" && (
                  <form
                    action={resetDemoData}
                    style={{ borderTop: "1px solid var(--line-2)", paddingTop: 18 }}
                  >
                    <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 12 }}>
                      Finished trying it? Put the shortlist back the way you found
                      it: 50 applicants, 20 shortlisted, no calls placed.
                    </p>
                    <Button size="sm" variant="soft" type="submit">
                      Reset demo data
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <form action={unlockConsole} style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    Operator token
                  </span>
                  <input
                    name="token"
                    type="password"
                    autoComplete="off"
                    required
                    style={{
                      width: "100%",
                      fontSize: 14,
                      fontFamily: "var(--mono), ui-monospace, monospace",
                      padding: "10px 13px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--ink)",
                    }}
                  />
                </label>
                {wrong && (
                  <p style={{ fontSize: 12.5, color: "var(--danger)" }}>
                    That token did not match.
                  </p>
                )}
                <div>
                  <Button size="sm" type="submit">
                    Unlock
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Panel>
      </Page>
    </>
  );
}
