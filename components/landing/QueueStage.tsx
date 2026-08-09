/**
 * One dot per shortlisted candidate.
 *
 * A few start aqua — the ones a recruiter gets through by hand in a day. The
 * rest sit waiting until the band fills in, which is the argument the product
 * makes without a sentence.
 *
 * Wide and short on purpose: it should read as a workload, not a mosaic. Every
 * number in the caption is derived from the constants below, so the words can
 * never drift from what is actually on screen.
 */

const TOTAL = 320;
const COLUMNS = 40;

/** The few a person actually gets through in a day. Scattered, so it reads as arbitrary. */
const CALLED_BY_HAND = new Set([23, 91, 146, 208, 262, 297]);
const BY_HAND = CALLED_BY_HAND.size;

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export default function QueueStage() {
  return (
    <div
      style={{
        position: "relative",
        margin: "40px auto 0",
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

      {/* Say what a dot is, before showing 320 of them. */}
      <p
        className="eyebrow"
        style={{ position: "relative", zIndex: 1, marginBottom: 12 }}
      >
        One dot = one shortlisted candidate
      </p>

      <div
        role="img"
        aria-label={`${TOTAL} shortlisted candidates. ${BY_HAND} were reached by hand today; OpenLine calls all ${TOTAL}.`}
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

      {/* The punch, then the legend that makes the colours mean something. */}
      <p
        style={{
          fontSize: "clamp(16px, 1.9vw, 19px)",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-.015em",
          marginTop: 20,
        }}
      >
        {BY_HAND} calls a day by hand. Or all {TOTAL} by tonight.
      </p>

      <div
        style={{
          display: "flex",
          gap: 22,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 10,
          fontSize: 13,
          color: "var(--ink-3)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Swatch color="var(--accent)" />
          {BY_HAND} reached by hand
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Swatch color="var(--cta)" />
          {TOTAL - BY_HAND} still waiting — OpenLine calls them
        </span>
      </div>
    </div>
  );
}
