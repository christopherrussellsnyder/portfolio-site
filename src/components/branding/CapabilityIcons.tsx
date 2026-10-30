/**
 * Custom capability icons, built in the same flat geometric construction as
 * KorexMark (the logo): a small number of solid shapes in exactly the
 * brand's own palette -- primary green for the focal shape, currentColor
 * for the supporting shape, background-colored "cut lines" through solid
 * shapes where that reads naturally (the same trick the tower mark itself
 * uses). No stroke icons, no borrowed icon library -- every shape here is
 * specific to what it represents.
 *
 * Usage: <SignalIcon className="w-6 h-6" /> -- sizing/positioning via
 * className like any icon component; colors are fixed to the design
 * tokens internally, not driven by text-color utilities.
 */

interface IconProps {
  className?: string;
}

const base = 'currentColor';

/** We read the market -- a signal pulsing outward from a source point. */
export const SignalIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="4" fill="hsl(var(--primary))" />
    <path d="M27 20a7 7 0 0 1-7 7" stroke={base} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    <path d="M32 20a12 12 0 0 1-12 12" stroke={base} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    <path d="M13 20a7 7 0 0 0 7 7" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
  </svg>
);

/** We read your business -- a page with real lines of data on it. */
export const ReadBusinessIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="6" width="22" height="28" rx="2" stroke={base} strokeWidth="2.5" />
    <rect x="13" y="13" width="14" height="2.5" rx="1" fill="hsl(var(--primary))" />
    <rect x="13" y="18.5" width="14" height="2.5" rx="1" fill={base} opacity="0.6" />
    <rect x="13" y="24" width="9" height="2.5" rx="1" fill={base} opacity="0.6" />
  </svg>
);

/** We build the plan -- blocks assembling upward. */
export const BuildPlanIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="24" width="24" height="7" rx="1.5" fill={base} opacity="0.55" />
    <rect x="11" y="15" width="18" height="7" rx="1.5" fill={base} opacity="0.8" />
    <rect x="14" y="6" width="12" height="7" rx="1.5" fill="hsl(var(--primary))" />
  </svg>
);

/** We review it before you see it -- a checked, approved mark. */
export const ReviewIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="14" stroke={base} strokeWidth="2.5" />
    <path d="M14 20.5l4 4 8-9" stroke="hsl(var(--primary))" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Live-Data Strategy Engine -- a live pulse climbing to a peak. */
export const StrategyEngineIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 24h6l3-9 5 15 4-20 3 14h9"
      stroke={base}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.75"
    />
    <circle cx="19" cy="10" r="2.5" fill="hsl(var(--primary))" />
  </svg>
);

/** Research Analysis -- a magnifying glass, built from primitives. */
export const ResearchIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="10" stroke={base} strokeWidth="2.5" />
    <path d="M25.5 25.5L33 33" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** AI Video Ads -- a frame with a play mark and the tower's cut-line motif. */
export const VideoAdsIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="9" width="28" height="22" rx="2" stroke={base} strokeWidth="2.5" />
    <rect x="6" y="9" width="28" height="4" fill={base} opacity="0.15" />
    <path d="M17 17l8 4-8 4v-8z" fill="hsl(var(--primary))" />
  </svg>
);

/** AI Image Studio -- layered creative frames. */
export const ImageStudioIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="6" width="20" height="20" rx="2" stroke={base} strokeWidth="2.5" />
    <rect x="8" y="14" width="20" height="20" rx="2" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2.5" />
    <circle cx="14" cy="20" r="2" fill="hsl(var(--primary))" />
    <path d="M10 32l6-6 4 4 7-7 3 3" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Caption A/B Variants -- two scored options, side by side. */
export const CaptionVariantsIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="9" height="20" rx="1.5" fill={base} opacity="0.35" />
    <rect x="23" y="4" width="9" height="26" rx="1.5" fill="hsl(var(--primary))" />
  </svg>
);

/** Multi-Brand Workspaces -- stacked, offset workspace cards. */
export const WorkspacesIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="13" y="6" width="19" height="13" rx="1.5" stroke={base} strokeWidth="2.25" opacity="0.5" />
    <rect x="8" y="14" width="19" height="13" rx="1.5" stroke={base} strokeWidth="2.25" opacity="0.75" fill="hsl(var(--background))" />
    <rect x="5" y="22" width="19" height="13" rx="1.5" fill="hsl(var(--primary))" />
  </svg>
);

/** White-Label Reports -- a document, cut through with real rules (tower motif). */
export const ReportsIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 5h13l7 7v22a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill={base} opacity="0.85" />
    <path d="M23 5v6a1 1 0 0 0 1 1h6" fill="hsl(var(--background))" />
    <rect x="13" y="19" width="14" height="2.25" fill="hsl(var(--background))" />
    <rect x="13" y="24" width="14" height="2.25" fill="hsl(var(--background))" />
    <rect x="13" y="19" width="9" height="2.25" fill="hsl(var(--primary))" />
  </svg>
);

/** Analytics Intelligence -- ascending measured bars. */
export const AnalyticsIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="21" width="7" height="13" rx="1" fill={base} opacity="0.45" />
    <rect x="16.5" y="14" width="7" height="20" rx="1" fill={base} opacity="0.75" />
    <rect x="26" y="6" width="7" height="28" rx="1" fill="hsl(var(--primary))" />
  </svg>
);
