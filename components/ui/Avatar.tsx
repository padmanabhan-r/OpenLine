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

/** Stable hue from a name, so the same person keeps the same colour. */
export function nameToHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

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
        background: `oklch(0.62 0.13 ${nameToHue(name)})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: font,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
