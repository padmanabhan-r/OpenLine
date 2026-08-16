const sizes = {
  sm: { px: 28, font: 11 },
  default: { px: 34, font: 13 },
  lg: { px: 56, font: 20 },
} as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * One material, every person: a bakelite disc with a brass ring and cream
 * initials. A per-name hue would put magenta on the exchange floor and hand
 * every queue row its own accent — the world allows neither.
 */
export default function Avatar({
  name,
  size = "default",
}: {
  name: string;
  size?: keyof typeof sizes;
}) {
  const { px, font } = sizes[size];
  return (
    <div
      aria-hidden="true"
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 34% 30%, var(--surface-2), var(--bg-2) 70%)",
        border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
        boxShadow: "inset 0 1px 1px rgba(239,231,211,0.10), 0 1px 2px rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: font,
        fontWeight: 700,
        color: "var(--ink-2)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
