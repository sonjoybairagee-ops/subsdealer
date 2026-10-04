/**
 * The Subsdealer mark: two separate strokes that together read as an "S" —
 * one subscription, split between people.
 *
 * Drawn on a 24×24 grid with round caps, so it stays even at favicon size.
 * `currentColor` by default, so it inherits whatever colour it sits in.
 */
export function LogoMark({
  className,
  title,
}: {
  className?: string;
  /** Give this only when the mark stands alone; inside the lockup the
      wordmark already carries the name, and a second label just repeats it. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path
        d="M4 4h10a6 6 0 0 1 0 12H9.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M20 20H10a6 6 0 0 1 0-12h4.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

/** Mark inside the accent tile, the way it appears in the header. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span className={`logo-tile ${className ?? ""}`}>
      <LogoMark />
    </span>
  );
}
