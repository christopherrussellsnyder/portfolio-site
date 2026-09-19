interface KorexMarkProps {
  /** Tailwind sizing classes, e.g. "w-8 h-8" */
  className?: string;
  /** Tailwind text color utility that drives the tower body. Defaults to foreground. */
  colorClassName?: string;
  title?: string;
}

/**
 * The Korex tower mark.
 *
 * Three-tone brand construction:
 *  - candle / flame  → brand green (`--primary`)
 *  - tower body      → `currentColor` (foreground: black on light, light on dark)
 *  - tower rules     → `--background` so they read as clean cut-out lines
 */
export const KorexMark = ({
  className = "w-8 h-8",
  colorClassName = "text-foreground",
  title = "Korex",
}: KorexMarkProps) => (
  <svg
    viewBox="0 0 400 400"
    role="img"
    aria-label={title}
    className={`${colorClassName} ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>{title}</title>
    <g transform="translate(0,23)">
      {/* Candle / flame — brand green */}
      <path
        d="M200,70 C228,125 236,162 200,208 C164,162 172,125 200,70 Z"
        fill="hsl(var(--primary))"
      />
      <path
        d="M200,105 C214,138 218,160 200,185 C182,160 186,138 200,105 Z"
        fill="hsl(var(--primary-light, var(--primary)))"
      />

      {/* Tower body — foreground */}
      <polygon points="150,230 250,230 224,340 176,340" fill="currentColor" />
      <rect x="168" y="340" width="64" height="14" fill="currentColor" />

      {/* Interior rules — background so they cut through the tower */}
      <rect x="150" y="230" width="100" height="12" fill="hsl(var(--background))" />
      <rect x="163" y="268" width="74" height="10" fill="hsl(var(--background))" />
      <rect x="176" y="304" width="48" height="9" fill="hsl(var(--background))" />
    </g>
  </svg>
);

export default KorexMark;
