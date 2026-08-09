/**
 * One dot per shortlisted candidate.
 *
 * A handful start aqua — the ones a recruiter gets through by hand on a good
 * day. The rest sit waiting. On load the whole band fills in, which is the
 * argument the product makes, made without a sentence.
 *
 * Wide and short on purpose: it should read as a workload, not a mosaic.
 */

const TOTAL = 320;
const COLUMNS = 40;
/** The few a person actually got through today. Scattered, so it reads as arbitrary. */
const CALLED_BY_HAND = new Set([23, 91, 146, 208, 262, 297]);

export default function QueueStage() {
  return (
    <div
      style={{
        position: "relative",
        margin: "44px auto 0",
        width: "min(1180px, 96vw)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-22% -6%",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(47,182,188,.22), transparent 70%)",
          filter: "blur(38px)",
          zIndex: 0,
        }}
      />

      <div
        role="img"
        aria-label="Three hundred and twenty shortlisted candidates. Six were reached by hand today; OpenLine calls all of them."
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: "clamp(5px, 0.65vw, 10px)",
          padding: "clamp(20px, 2.6vw, 34px)",
          background: "var(--bg-glass)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid rgba(29,27,16,0.14)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-edge)",
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const called = CALLED_BY_HAND.has(i);
          return (
            <span
              key={i}
              className={`queue-dot ${called ? "called" : "pending"}`}
              style={
                called
                  ? undefined
                  : // Sweep left to right, after the eye has had a moment to
                    // register the few that were already lit.
                    { animationDelay: `${900 + i * 4.5}ms` }
              }
            />
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>
          <strong style={{ color: "var(--ink-2)", fontWeight: 600 }}>
            320 shortlisted.
          </strong>{" "}
          Dialing them by hand takes weeks.
        </span>
        <span
          style={{ fontSize: 13.5, color: "var(--accent-deep)", fontWeight: 600 }}
        >
          OpenLine calls every one of them.
        </span>
      </div>
    </div>
  );
}
