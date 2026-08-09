/**
 * One dot per applicant.
 *
 * Five start filled — the handful a recruiter has time to phone. The other 495
 * are the ones who hear nothing back. On load the whole grid fills in.
 *
 * It is the argument the product makes, made without a sentence.
 */

const TOTAL = 500;
const COLUMNS = 25;
/** The five a person actually got to. Spread out, so it reads as arbitrary. */
const ALREADY_CALLED = new Set([37, 118, 241, 356, 462]);

export default function QueueStage() {
  return (
    <div
      style={{
        position: "relative",
        margin: "44px auto 0",
        width: "min(760px, 92vw)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-14% -8%",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(47,182,188,.22), transparent 70%)",
          filter: "blur(38px)",
          zIndex: 0,
        }}
      />

      <div
        role="img"
        aria-label="Five hundred applicants. Five were phoned by a recruiter; OpenLine calls all five hundred."
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: "clamp(4px, 0.7vw, 8px)",
          padding: "clamp(18px, 3vw, 30px)",
          background: "var(--bg-glass)",
          backdropFilter: "var(--blur)",
          WebkitBackdropFilter: "var(--blur)",
          border: "1px solid rgba(29,27,16,0.14)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-edge)",
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const called = ALREADY_CALLED.has(i);
          return (
            <span
              key={i}
              className={`queue-dot ${called ? "called" : "pending"}`}
              style={
                called
                  ? undefined
                  : // Sweep left to right, top to bottom, after the eye has
                    // had a moment to register the five that were already lit.
                    { animationDelay: `${900 + i * 3.4}ms` }
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
            500 applied.
          </strong>{" "}
          A recruiter had time for five.
        </span>
        <span style={{ fontSize: 13.5, color: "var(--accent-deep)", fontWeight: 600 }}>
          OpenLine calls all of them.
        </span>
      </div>
    </div>
  );
}
