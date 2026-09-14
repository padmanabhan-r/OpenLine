"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface BoardRow {
  name: string;
  score: number | null;
  /** Honest absence: a shortlisted person with no dialable number. */
  hasPhone: boolean;
}

/**
 * The hero switchboard: the product's one orchestrated sequence.
 *
 * A cord patches into the last jack on the board, the amber lamp lights, and
 * the ticker prints the opening of a real screening call — the AI disclosure
 * and the consent question, in the same grammar assembleTask() dictates. One
 * control runs the whole thing; nothing else on the page performs.
 */
export default function Switchboard({
  rows,
  company,
  jobTitle,
}: {
  rows: BoardRow[];
  company: string;
  jobTitle: string;
}) {
  // Which jack the cord is in. A candidate with no number on file cannot be
  // patched through — the board refuses rather than dialling nothing.
  const firstDialable = Math.max(
    0,
    rows.findIndex((r) => r.hasPhone),
  );
  const [selected, setSelected] = useState(firstDialable);
  const chosen = rows[selected];
  const firstName = (chosen?.name ?? "").split(" ")[0];
  const lines = [
    // The one scripted line from assembleTask, split at its natural pause:
    // disclosure first, then the role and the request for permission.
    {
      speaker: "OPENLINE",
      text: `Hi, is this ${firstName}? This is an AI assistant calling for the recruiting team at ${company}.`,
      // The disclosure is the dramatic beat — it gets the brass underline.
      mark: "an AI assistant",
    },
    {
      speaker: "OPENLINE",
      text: `You applied for the ${jobTitle} role, and this is a quick two-minute first screen. OK if I ask a few screening questions?`,
      mark: null,
    },
    { speaker: firstName.toUpperCase(), text: "Yes, go ahead.", mark: null },
  ];

  type Phase = "idle" | "patching" | "typing" | "done";
  const [phase, setPhase] = useState<Phase>("idle");
  // How many characters of the whole transcript are printed so far.
  const [printed, setPrinted] = useState(0);
  const timers = useRef<number[]>([]);
  const reduced = useRef(false);

  const totalChars = lines.reduce(
    (n, l) => n + l.speaker.length + 3 + l.text.length,
    0,
  );

  const select = (i: number) => {
    if (!rows[i]?.hasPhone || i === selected) return;
    clearTimers();
    setSelected(i);
    setPhase("idle");
    setPrinted(0);
  };

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const run = useCallback(() => {
    clearTimers();
    if (reduced.current) {
      setPrinted(totalChars);
      setPhase("done");
      return;
    }
    setPrinted(0);
    setPhase("patching");
    timers.current.push(
      window.setTimeout(() => {
        setPhase("typing");
        let n = 0;
        const tick = () => {
          n += 2;
          setPrinted(n);
          if (n < totalChars) {
            timers.current.push(window.setTimeout(tick, 26));
          } else {
            setPhase("done");
          }
        };
        tick();
      }, 750),
    );
  }, [totalChars]);

  // No autoplay: the press is the dramatization. The tape stays blank until
  // someone places the call — the same gate the console holds.
  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return clearTimers;
  }, []);

  const live = phase !== "idle";
  const patched = phase === "typing" || phase === "done";

  // The tape is a fixed piece of paper. These two styles are shared with the
  // hidden measuring copy below, so the printed text lays out identically.
  const tapeLine: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.8,
    wordBreak: "break-word",
  };
  const tapeNote: React.CSSProperties = {
    fontSize: 11.5,
    marginTop: 10,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    opacity: 0.65,
  };

  // Slice the transcript to the printed character count.
  let budget = printed;
  const printedLines = lines.map((l) => {
    const full = `${l.speaker} — ${l.text}`;
    const take = Math.max(0, Math.min(full.length, budget));
    budget -= full.length;
    return { ...l, shown: full.slice(0, take), complete: take >= full.length };
  });

  // A jewel lamp: deep glass dome in a brass bezel. Unlit it smoulders
  // red-brown; lit it burns amber and throws light.
  const jack = (lit: boolean, armed = false) => (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px solid ${armed ? "var(--accent-deep)" : "var(--accent-soft)"}`,
        background: lit
          ? "radial-gradient(circle at 35% 30%, #FFE9B0 0%, var(--amber) 38%, #7A4A12 100%)"
          : "radial-gradient(circle at 35% 30%, #6E3A28 0%, #2A130C 62%, #170A06 100%)",
        boxShadow: lit
          ? "0 0 0 2px rgba(211,166,72,0.35), 0 0 16px rgba(224,166,62,0.6), inset 0 -2px 3px rgba(0,0,0,.45)"
          : "inset 0 2px 3px rgba(0,0,0,.55), inset 0 -1px 1px rgba(239,231,211,0.10), 0 1px 2px rgba(0,0,0,0.5)",
        transition: "box-shadow .4s ease, background .4s ease",
      }}
    />
  );

  // The engraved brass nameplate. Armed means the cord is in this jack.
  const nameplate = (armed: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "var(--cta-text)",
    backgroundImage: "url(/textures/brass-plate.webp)",
    backgroundSize: "cover",
    padding: "4px 12px",
    borderRadius: 4,
    boxShadow: armed
      ? "inset 0 1px 1px rgba(255,255,255,.38), 0 0 10px rgba(224,166,62,.35), 0 1px 2px rgba(0,0,0,.5)"
      : "inset 0 1px 1px rgba(255,255,255,.30), inset 0 -1px 2px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.5)",
    textShadow: "0 1px 0 rgba(255,255,255,.22)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "box-shadow .4s ease",
  });

  // A slotted panel screw, one per corner of the board.
  const screw = (pos: React.CSSProperties) => (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: 11,
        height: 11,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 30%, var(--cta-hover), var(--accent-soft) 75%)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,.35), 0 1px 2px rgba(0,0,0,.6)",
        ...pos,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 1.5,
          right: 1.5,
          top: 4.5,
          height: 1.5,
          background: "rgba(23,19,14,0.7)",
          transform: "rotate(24deg)",
        }}
      />
    </span>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* The machined instrument panel — bakelite grain, bevelled edge, a
          screw in each corner. Not a card shell: this is the subject itself,
          the way the approved comp renders it. */}
      <div
        style={{
          position: "relative",
          backgroundImage: "url(/textures/bakelite.webp)",
          backgroundSize: "512px 512px",
          border: "1px solid rgba(0,0,0,0.6)",
          borderRadius: "var(--radius)",
          boxShadow:
            "inset 0 1px 0 rgba(239,231,211,0.09), inset 0 -2px 4px rgba(0,0,0,.5), var(--shadow-lg)",
          padding: "10px 0 4px",
        }}
      >
        {screw({ top: 7, left: 8 })}
        {screw({ top: 7, right: 8 })}
        {screw({ bottom: 7, left: 8 })}
        {screw({ bottom: 7, right: 8 })}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 22px 12px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <span className="eyebrow muted">Exchange — shortlist board</span>
          <span className="plate" style={{ gap: 8 }}>
            <span
              className={`lamp${phase === "typing" ? " live" : ""}`}
              style={{
                color:
                  phase === "done"
                    ? "var(--green)"
                    : live
                      ? "var(--amber)"
                      : "var(--ink-3)",
              }}
            />
            {/* Stack the longest label under the live one so the plate keeps
                one width through all four phases. It grows otherwise, and in a
                narrow header that re-wraps the board's title. */}
            <span style={{ display: "inline-grid" }}>
              <span
                aria-hidden
                style={{ gridArea: "1 / 1", visibility: "hidden" }}
              >
                Transcript ready
              </span>
              <span style={{ gridArea: "1 / 1" }}>
                {phase === "done"
                  ? "Transcript ready"
                  : phase === "typing"
                    ? "On the line"
                    : phase === "patching"
                      ? "Patching"
                      : "Standing by"}
              </span>
            </span>
          </span>
        </div>

        {/* One cord, one jack at a time — so the board is a radio group.
            A line with no number on file cannot be patched through. */}
        <ul
          role="radiogroup"
          aria-label="Shortlist board — choose the line to call"
          style={{ listStyle: "none" }}
        >
          {rows.map((r, i) => {
            const armed = i === selected;
            return (
              <li key={r.name}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={armed}
                  disabled={!r.hasPhone}
                  onClick={() => select(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    width: "100%",
                    padding: "9px 22px",
                    background: armed ? "var(--accent-tint)" : "transparent",
                    border: "none",
                    borderBottom:
                      i < rows.length - 1
                        ? "1px solid var(--line-2)"
                        : "1px solid transparent",
                    color: "inherit",
                    textAlign: "left",
                    cursor: r.hasPhone ? "pointer" : "default",
                    transition: "background .35s ease",
                  }}
                >
                  {jack(armed && live, armed)}
                  <span className="mono" style={nameplate(armed)}>
                    {r.name}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      flex: 1,
                      borderBottom: "1px dotted var(--line)",
                      minWidth: 24,
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      color: r.hasPhone ? "var(--ink-3)" : "var(--amber)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.hasPhone ? `ATS SCORE ${r.score ?? "—"}` : "NO NUMBER ON FILE"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The cord: from the live jack down into the ticker's plug. */}
      <div
        aria-hidden
        style={{
          display: "flex",
          justifyContent: "flex-start",
          paddingLeft: 30,
          height: 38,
        }}
      >
        <svg width="120" height="38" viewBox="0 0 120 38" fill="none">
          <path
            d="M3 0 C 3 21, 60 13, 78 36"
            stroke="#6B5E4E"
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              strokeDasharray: 140,
              strokeDashoffset: patched ? 0 : 140,
              transition: "stroke-dashoffset .7s cubic-bezier(.2,.7,.3,1)",
            }}
          />
          {/* Woven wrap: a dashed band over the cord reads as cotton braid. */}
          <path
            d="M3 0 C 3 21, 60 13, 78 36"
            stroke="rgba(23,19,14,0.55)"
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray="1.5 4"
            opacity={patched ? 1 : 0}
            style={{ transition: "opacity .4s ease .4s" }}
          />
          <path
            d="M3 0 C 3 21, 60 13, 78 36"
            stroke="var(--amber)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={phase === "typing" || phase === "done" ? 0.9 : 0}
            style={{
              strokeDasharray: 140,
              strokeDashoffset: patched ? 0 : 140,
              transition:
                "stroke-dashoffset .7s cubic-bezier(.2,.7,.3,1), opacity .4s ease .3s",
            }}
          />
        </svg>
      </div>

      {/* The ticker: cream paper tape on a dark platen bar, brass spool ends,
          typewriter ink. What prints is what was said. */}
      <div style={{ position: "relative" }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: -8,
            right: -8,
            top: 16,
            bottom: 16,
            background: "linear-gradient(180deg, #2A241E, #0E0B08)",
            borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,.5)",
          }}
        />
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            aria-hidden
            style={{
              position: "absolute",
              [side]: -6,
              top: "50%",
              marginTop: -10,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 30%, var(--cta-hover), var(--accent-soft) 78%)",
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,.35), 0 1px 3px rgba(0,0,0,.6)",
            }}
          />
        ))}
      <div
        style={{
          position: "relative",
          backgroundImage: "url(/textures/tape-paper.webp)",
          backgroundSize: "512px 256px",
          backgroundColor: "#EFE7D3",
          color: "#1A1510",
          borderRadius: 3,
          boxShadow: "var(--shadow)",
          padding: "14px 28px 13px",
        }}
      >
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            aria-hidden
            style={{
              position: "absolute",
              [side]: 7,
              top: 8,
              bottom: 8,
              width: 12,
              backgroundImage:
                "radial-gradient(circle, rgba(26,21,16,0.25) 2px, transparent 2.5px)",
              backgroundSize: "12px 14px",
              // "space" fits whole sprocket holes only — no half-dots at the
              // tape's corners whatever the tape's rendered height.
              backgroundRepeat: "space",
              backgroundPosition: "center",
            }}
          />
        ))}
        {/*
         * The tape is cut to length before the call, not while it prints.
         * This copy of the finished transcript is laid out but never painted,
         * so the paper is already the right height in every state and at every
         * width — pressing the control prints into reserved space instead of
         * pushing whatever sits below the board off the screen.
         */}
        <div aria-hidden style={{ visibility: "hidden" }}>
          {lines.map((l, i) => (
            <p key={i} className="mono" style={tapeLine}>
              {`${l.speaker} — ${l.text}`}
            </p>
          ))}
          <p className="mono" style={tapeNote}>
            Demonstration call — fixture candidate. A human reads every word.
          </p>
        </div>
        <div style={{ position: "absolute", inset: "14px 28px 13px" }}>
        {printedLines.map((l, i) =>
          l.shown ? (
            <p
              key={i}
              className="mono"
              style={tapeLine}
            >
              {l.mark && l.complete ? (
                <>
                  {l.shown.slice(0, l.shown.indexOf(l.mark))}
                  <span
                    style={{
                      borderBottom: "2px solid var(--cta)",
                      fontWeight: 700,
                    }}
                  >
                    {l.mark}
                  </span>
                  {l.shown.slice(l.shown.indexOf(l.mark) + l.mark.length)}
                </>
              ) : (
                l.shown
              )}
              {i === printedLines.findIndex((x) => !x.complete) && (
                <span className="ticker-caret" style={{ fontWeight: 700 }}>
                  ▍
                </span>
              )}
            </p>
          ) : null,
        )}
        {phase === "idle" && (
          <p className="mono" style={{ fontSize: 13, opacity: 0.55 }}>
            — tape blank. place the call. —
          </p>
        )}
        {phase === "done" && (
          <p className="mono" style={tapeNote}>
            Demonstration call — fixture candidate. A human reads every word.
          </p>
        )}
        </div>
      </div>
      </div>

      {/* The one control. It runs the whole sequence, every time. */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={run}
          disabled={
            phase === "patching" || phase === "typing" || !chosen?.hasPhone
          }
          className="mono"
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--ink-2)",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 16px",
            cursor:
              phase === "patching" || phase === "typing"
                ? "default"
                : "pointer",
            opacity: phase === "patching" || phase === "typing" ? 0.5 : 1,
          }}
        >
          {phase === "done" ? "Replay the call" : "Place the call"}
        </button>
      </div>
    </div>
  );
}
