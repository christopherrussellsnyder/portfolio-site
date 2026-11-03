interface ProductFrameProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Browser-chrome mockup for real product screenshots. Neutral dot cluster
 * (no traffic-light colors) and a URL pill keep it consistent with the
 * brand's flat, non-cartoonish visual language rather than a generic
 * stock-mockup look.
 */
export const ProductFrame = ({ src, alt, className = '' }: ProductFrameProps) => (
  <div className={`rounded-md border border-border bg-card shadow-[0_0_40px_hsl(var(--primary)/0.12)] overflow-hidden ${className}`}>
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--foreground)/0.15)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--foreground)/0.15)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--foreground)/0.15)]" />
      </div>
      <div className="flex-1 max-w-xs mx-auto bg-[hsl(var(--foreground)/0.05)] rounded-full px-3 py-1 text-center">
        <span className="text-[11px] text-[hsl(var(--text-tertiary))] truncate">app.korexintelligence.com</span>
      </div>
    </div>
    <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />
  </div>
);
