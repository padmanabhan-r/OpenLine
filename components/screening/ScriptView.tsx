import type { GuardFinding } from "@/lib/script/guard";

/**
 * Render a call script with any prohibited question highlighted in place.
 *
 * Seeing the violation inside the sentence it came from is the point. A list of
 * category names tells you something is wrong; the highlight tells you what to
 * change.
 */
export default function ScriptView({
  task,
  findings = [],
}: {
  task: string;
  findings?: GuardFinding[];
}) {
  if (findings.length === 0) {
    return <div className="script">{task}</div>;
  }

  // Non-overlapping, left to right.
  const ordered = [...findings].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ordered.forEach((finding, i) => {
    if (finding.start < cursor) return; // already covered by an earlier highlight
    if (finding.start > cursor) {
      parts.push(<span key={`t${i}`}>{task.slice(cursor, finding.start)}</span>);
    }
    parts.push(
      <mark
        key={`m${i}`}
        className="violation"
        title={`${finding.category}: ${finding.explanation}`}
      >
        {task.slice(finding.start, finding.end)}
      </mark>,
    );
    cursor = finding.end;
  });

  if (cursor < task.length) {
    parts.push(<span key="tail">{task.slice(cursor)}</span>);
  }

  return <div className="script">{parts}</div>;
}
