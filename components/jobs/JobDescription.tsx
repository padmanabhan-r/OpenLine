/**
 * Render the job posting the way a candidate would read it.
 *
 * The description is stored as plain text because that is what a recruiter
 * pastes in and what question generation reads. Rather than ask anyone to write
 * markup, this recovers the structure already present in the prose: the first
 * line is the role, the second is a `·`-separated meta line, an all-caps line is
 * a section heading, a line starting with "- " is a bullet, and everything else
 * is a paragraph.
 *
 * Deliberately forgiving. A posting that follows none of these conventions still
 * renders as readable paragraphs rather than breaking the page.
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "paragraph"; text: string };

/** All caps, short, and not a bullet — the shape of a section heading. */
function isHeading(line: string) {
  return (
    line.length > 0 &&
    line.length < 40 &&
    line === line.toUpperCase() &&
    /[A-Z]/.test(line) &&
    !line.startsWith("-")
  );
}

export function parseDescription(description: string): {
  title: string | null;
  meta: string[];
  blocks: Block[];
} {
  const lines = description.split("\n").map((l) => l.trimEnd());

  let cursor = 0;
  while (cursor < lines.length && !lines[cursor].trim()) cursor++;

  let title: string | null = null;
  let meta: string[] = [];

  const first = lines[cursor]?.trim();
  if (first && !isHeading(first) && !first.startsWith("-")) {
    title = first;
    cursor++;
    const second = lines[cursor]?.trim();
    if (second && !isHeading(second) && !second.startsWith("-")) {
      // Each `·`-separated part is a distinct fact — location, contract type,
      // experience — so they are split rather than printed as one grey line.
      meta = second
        .split("·")
        .map((part) => part.trim())
        .filter(Boolean);
      cursor++;
    }
  }

  const blocks: Block[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];

  const flushBullets = () => {
    if (bullets.length) blocks.push({ kind: "bullets", items: bullets });
    bullets = [];
  };
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of lines.slice(cursor)) {
    const line = raw.trim();

    if (!line) {
      flushBullets();
      flushParagraph();
      continue;
    }
    if (isHeading(line)) {
      flushBullets();
      flushParagraph();
      blocks.push({ kind: "heading", text: line });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      bullets.push(line.slice(2));
      continue;
    }
    flushBullets();
    paragraph.push(line);
  }
  flushBullets();
  flushParagraph();

  return { title, meta, blocks };
}

/** ~68 characters at 14px — the measure prose stays comfortable at. */
const MEASURE = 640;

export default function JobDescription({
  description,
}: {
  description: string;
}) {
  const { title, meta, blocks } = parseDescription(description);
  const firstHeading = blocks.findIndex((b) => b.kind === "heading");

  return (
    <article style={{ maxWidth: MEASURE }}>
      {title && (
        <h2
          style={{
            fontSize: 25,
            fontWeight: 800,
            letterSpacing: "-.03em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
      )}

      {meta.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 14,
          }}
        >
          {meta.map((fact) => (
            <span
              key={fact}
              style={{
                fontSize: 12.5,
                color: "var(--ink-2)",
                background: "var(--surface-2)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--radius-pill)",
                padding: "4px 11px",
              }}
            >
              {fact}
            </span>
          ))}
        </div>
      )}

      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          // A rule above every section but the first: it separates, and a rule
          // before the opening section would just underline the header.
          const rule = i !== firstHeading;
          return (
            <h3
              key={i}
              className="eyebrow"
              style={{
                color: "var(--accent-deep)",
                marginTop: rule ? 30 : 28,
                paddingTop: rule ? 22 : 0,
                marginBottom: 12,
                borderTop: rule ? "1px solid var(--line-2)" : undefined,
              }}
            >
              {block.text}
            </h3>
          );
        }

        if (block.kind === "bullets") {
          return (
            <ul
              key={i}
              style={{
                listStyle: "none",
                margin: "0 0 14px",
                padding: 0,
                display: "grid",
                gap: 9,
              }}
            >
              {block.items.map((item, j) => (
                <li
                  key={j}
                  style={{
                    position: "relative",
                    paddingLeft: 18,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--ink-2)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 9,
                      width: 7,
                      height: 2,
                      borderRadius: 1,
                      background: "var(--accent)",
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={i}
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--ink-2)",
              marginBottom: 14,
            }}
          >
            {block.text}
          </p>
        );
      })}
    </article>
  );
}
