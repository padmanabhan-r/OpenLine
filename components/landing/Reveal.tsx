"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Reveals its children once, when they first scroll into view.
 *
 * One observer per element and it disconnects after firing — the landing page
 * has a couple of dozen of these and none of them need to watch the scroll
 * position for the rest of the session.
 */
export default function Reveal({
  children,
  /** Stagger within a group, in ms. */
  delay = 0,
  /** Draw a rule open above the content as it arrives. */
  rule = false,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  rule?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${rule ? " rule-open" : ""}${shown ? " is-in" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}
