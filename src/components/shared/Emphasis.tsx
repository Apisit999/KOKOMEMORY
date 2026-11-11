import type { ReactNode } from "react";

// Brand emphasis helpers — see EMPHASIS SYSTEM in globals.css.

/** One key word in a heading: italic serif + brand gradient. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="text-gradient">{children}</em>;
}

/** Key phrase inside body text: thin gradient underline. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="highlight">{children}</span>;
}

/** Small uppercase label above a heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
