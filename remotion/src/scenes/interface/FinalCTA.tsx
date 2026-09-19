import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const FinalCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 18 } });
  const t2 = spring({ frame: frame - 15, fps, config: { damping: 18 } });
  const promo = spring({ frame: frame - 35, fps, config: { damping: 12 } });
  const url = interpolate(frame, [45, 70], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 0.85 + Math.sin(frame * 0.18) * 0.15;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 8, color: "#CC0000", marginBottom: 20, opacity: t1 }}>
        // YOUR TURN
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -4,
          lineHeight: 0.95,
          opacity: t1,
          transform: `translateY(${(1 - t1) * 30}px)`,
        }}
      >
        See it live.
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 900,
          background: "linear-gradient(90deg,#CC0000,#FF4D4D)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          letterSpacing: -4,
          lineHeight: 0.95,
          opacity: t2,
          transform: `translateY(${(1 - t2) * 30}px)`,
        }}
      >
        Run it yourself.
      </div>

      <div
        style={{
          marginTop: 50,
          padding: "14px 32px",
          border: "2px solid #CC0000",
          background: "rgba(204,0,0,0.08)",
          boxShadow: `0 0 ${20 + pulse * 30}px rgba(204,0,0,0.5)`,
          borderRadius: 8,
          opacity: promo,
          transform: `scale(${0.9 + promo * 0.1})`,
        }}
      >
        <span style={{ fontSize: 16, color: "#A0A0A8", letterSpacing: 3 }}>LAUNCH OFFER · </span>
        <span style={{ fontSize: 20, color: "#FFFFFF", fontWeight: 900, letterSpacing: 4 }}>
          USE CODE KOREX · 15% OFF
        </span>
      </div>

      <div style={{ marginTop: 36, fontSize: 26, color: "#EEEEEE", letterSpacing: 4, opacity: url }}>
        korexintelligencesystems.com
      </div>
    </AbsoluteFill>
  );
};
