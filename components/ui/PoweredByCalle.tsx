import Image from "next/image";

/**
 * CALL-E attribution.
 *
 * OpenLine does not place phone calls itself — CALL-E does. The credit belongs
 * on screen rather than buried in a README, and the hackathon this was built
 * for should be visible to anyone who lands on the page.
 *
 * The mark is CALL-E's own SVG. Their artwork is black; on the exchange's
 * bakelite ground it is inverted to cream so the credit stays legible without
 * redrawing their mark.
 */

const CALLE_URL = "https://www.heycall-e.com/";

export function CalleMark({ height = 20 }: { height?: number }) {
  // The source SVG is 134 × 44.
  const width = Math.round((134 / 44) * height);
  return (
    <Image
      src="/logo-call-e.svg"
      alt="CALL-E"
      width={width}
      height={height}
      style={{ display: "block", filter: "invert(0.9)" }}
      priority={false}
    />
  );
}

/** Inline credit: "Powered by [CALL-E]". Used in the app shell. */
export function PoweredByCalle({ height = 16 }: { height?: number }) {
  return (
    <a
      href={CALLE_URL}
      target="_blank"
      rel="noreferrer noopener"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: 0.75,
        transition: "opacity .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.75";
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          whiteSpace: "nowrap",
        }}
      >
        Powered by
      </span>
      <CalleMark height={height} />
    </a>
  );
}

/** The fuller credit block, for the landing footer. */
export function CalleCredit() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        padding: "12px 16px",
        borderRadius: "var(--radius)",
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
      }}
    >
      <a href={CALLE_URL} target="_blank" rel="noreferrer noopener">
        <CalleMark height={22} />
      </a>
      {/* Only what this block alone says: who actually places the calls, and
          what this was built for. The call's own disclosure is demonstrated on
          the tape above, which is stronger than restating it here. */}
      <p
        style={{
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.5,
          minWidth: 0,
        }}
      >
        Every call on this page is placed by{" "}
        <a
          href={CALLE_URL}
          target="_blank"
          rel="noreferrer noopener"
          style={{ color: "var(--accent-deep)", fontWeight: 600 }}
        >
          CALL-E
        </a>
        . Built for the{" "}
        <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
          CALL-E: Your Code Is Calling
        </strong>{" "}
        hackathon.
      </p>
    </div>
  );
}
