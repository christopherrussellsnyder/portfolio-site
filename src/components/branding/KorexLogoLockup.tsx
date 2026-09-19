import { KorexMark } from "@/components/branding/KorexMark";

interface KorexLogoLockupProps {
  className?: string;
  /** Height in px for the lockup. Icon and text scale together. */
  height?: number;
  /** Height on screens >= 768px. Defaults to `height`. */
  mdHeight?: number;
  /** Height on screens >= 1024px. Defaults to `mdHeight`. */
  lgHeight?: number;
  /** Show the "INTELLIGENCE SYSTEMS" tagline beneath KOREX */
  showTagline?: boolean;
}

/**
 * Official Korex lockup: tower icon stacked vertically above the
 * "KOREX" wordmark, a red rule, and the "INTELLIGENCE SYSTEMS" tagline.
 */
export const KorexLogoLockup = ({
  className = "",
  height = 48,
  mdHeight,
  lgHeight,
  showTagline = true,
}: KorexLogoLockupProps) => {
  const base = Math.max(16, height);
  const md = Math.max(16, mdHeight ?? height);
  const lg = Math.max(16, lgHeight ?? md);

  // Vertical stack: icon sits above the wordmark, so the icon takes
  // most of the given height and the type scales off it.
  const icon = (h: number) => Math.round(h * 1.0);
  const word = (h: number) => Math.round(icon(h) * 0.46);
  const tagline = (h: number) => Math.max(7, Math.round(icon(h) * 0.115));

  const vars = {
    "--korex-icon-base": `${icon(base)}px`,
    "--korex-icon-md": `${icon(md)}px`,
    "--korex-icon-lg": `${icon(lg)}px`,
    "--korex-word-base": `${word(base)}px`,
    "--korex-word-md": `${word(md)}px`,
    "--korex-word-lg": `${word(lg)}px`,
    "--korex-tagline-base": `${tagline(base)}px`,
    "--korex-tagline-md": `${tagline(md)}px`,
    "--korex-tagline-lg": `${tagline(lg)}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`korex-logo-lockup inline-flex flex-col items-center justify-center max-w-full ${className}`}
      style={vars}
    >
      {/* Three-tone mark: green candle, foreground tower, cut-out rules. */}
      <div
        className="max-w-full"
        style={{
          height: "var(--korex-icon-size)",
          width: "var(--korex-icon-size)",
        }}
      >
        <KorexMark
          title="Korex"
          className="w-full h-full"
          colorClassName="text-foreground"
        />
      </div>


      <div className="flex flex-col items-center leading-none mt-[0.18em]">
        <span
          className="font-black tracking-[0.18em] text-foreground inline-block"
          style={{ fontSize: "var(--korex-word-size)", paddingLeft: "0.18em" }}
        >
          KOREX
        </span>
        {showTagline && (
          <>
            <div
              aria-hidden="true"
              className="bg-primary w-full"
              style={{ height: 1, marginTop: "0.42em", marginBottom: "0.42em" }}
            />
            <span
              className="text-muted-foreground tracking-[0.42em] inline-block whitespace-nowrap"
              style={{ fontSize: "var(--korex-tagline-size)", paddingLeft: "0.42em" }}
            >
              INTELLIGENCE SYSTEMS
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default KorexLogoLockup;
