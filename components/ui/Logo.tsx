interface LogoProps {
  size?: number;
  word?: boolean;
}

/**
 * The OpenLine mark: a terracotta orb cut by an open line.
 *
 * It keeps HireSphere's orb so the two products read as siblings, but the line
 * through it is the whole idea — the channel is open, and it runs both ways.
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
            "radial-gradient(circle at 32% 28%, #F08A5D, var(--red), var(--red-deep))",
          boxShadow: "inset 0 0 6px rgba(255,255,255,.35)",
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Specular highlight */}
        <div
          style={{
            position: "absolute",
            top: "21%",
            left: "24%",
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: "50%",
            background: "rgba(255,255,255,.55)",
            filter: "blur(1px)",
          }}
        />
        {/* The open line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: "100%",
            height: Math.max(2, size * 0.09),
            transform: "translateY(-50%)",
            background: "var(--bg)",
            opacity: 0.92,
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
