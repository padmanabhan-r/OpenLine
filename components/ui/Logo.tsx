interface LogoProps {
  size?: number;
  word?: boolean;
}

/**
 * The OpenLine mark: an ink-black orb cut by a yellow open line.
 *
 * Black on yellow is CALL-E's own voice, so the mark reads as family. The line
 * through the orb is the whole idea — the channel is open, and it runs both
 * ways.
 */
export default function Logo({ size = 32, word = false }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: word ? 10 : 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #35331F, var(--cta) 68%)",
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* The open line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            height: Math.max(2, size * 0.11),
            transform: "translateY(-50%)",
            background: "var(--bg)",
          }}
        />
      </div>
      {word && (
        <span
          style={{
            fontSize: size * 0.72,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          OpenLine
        </span>
      )}
    </div>
  );
}
