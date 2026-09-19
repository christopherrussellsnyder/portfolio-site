import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Callout: React.FC<{
  x: number; y: number; w?: number; h?: number; label: string; sub?: string; delay?: number; corner?: "tl" | "tr" | "bl" | "br";
}> = ({ x, y, w = 240, h = 120, label, sub, delay = 0, corner = "tl" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const pulse = 0.5 + Math.sin(frame * 0.15) * 0.5;

  const labelOffset = {
    tl: { left: w + 12, top: 0 },
    tr: { right: w + 12, top: 0 },
    bl: { left: w + 12, top: h - 60 },
    br: { right: w + 12, top: h - 60 },
  }[corner];

  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: op, transform: `scale(${0.92 + op * 0.08})` }}>
      <div
        style={{
          width: w,
          height: h,
          border: `2px solid rgba(204,0,0,${0.5 + pulse * 0.5})`,
          borderRadius: 8,
          boxShadow: `0 0 ${20 + pulse * 20}px rgba(204,0,0,0.5)`,
          background: "rgba(204,0,0,0.04)",
        }}
      />
      <div
        style={{
          position: "absolute",
          ...labelOffset,
          background: "#0B0B0D",
          border: "1px solid #CC0000",
          padding: "10px 16px",
          borderRadius: 6,
          minWidth: 220,
          fontFamily: "Inter",
        }}
      >
        <div style={{ fontSize: 11, color: "#CC0000", letterSpacing: 3, fontWeight: 800 }}>{label}</div>
        {sub && <div style={{ fontSize: 14, color: "#EEEEEE", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
};

export const Cursor: React.FC<{ x: number; y: number; delay?: number }> = ({ x, y, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: op,
        transform: `scale(${0.7 + op * 0.3})`,
        zIndex: 10,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24">
        <path d="M2 2 L2 18 L7 14 L10 22 L13 21 L10 13 L17 13 Z" fill="#FFFFFF" stroke="#CC0000" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
