import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markSp = spring({ frame, fps, config: { damping: 14 } });
  const wordOp = interpolate(frame, [12, 32], [0, 1], { extrapolateRight: "clamp" });
  const headOp = interpolate(frame, [22, 42], [0, 1], { extrapolateRight: "clamp" });
  const headY = interpolate(frame, [22, 42], [30, 0], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [42, 62], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });

  // gentle pulse at end
  const pulse = 1 + Math.sin(frame * 0.15) * 0.015;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, transform: `scale(${0.6 + markSp * 0.4})` }}>
        <svg width="80" height="100" viewBox="0 0 400 400">
          <rect x="72" y="32" width="48" height="336" fill="#CC0000" />
          <polygon points="120,32 120,120 344,32 280,32" fill="#EEEEEE" />
          <polygon points="120,88 120,168 344,32 272,32" fill="#CC0000" opacity="0.7" />
          <polygon points="120,232 120,312 344,368 272,368" fill="#CC0000" opacity="0.7" />
          <polygon points="120,280 120,368 240,368 200,368" fill="#EEEEEE" />
        </svg>
        <div style={{ opacity: wordOp, fontSize: 64, fontWeight: 900, color: "#EEEEEE", letterSpacing: 14 }}>
          KOREX
        </div>
      </div>

      <div
        style={{
          marginTop: 50,
          fontSize: 110,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -3,
          textAlign: "center",
          lineHeight: 1,
          opacity: headOp,
          transform: `translateY(${headY}px) scale(${pulse})`,
        }}
      >
        STOP <span style={{ color: "#CC0000" }}>GUESSING.</span>
        <br />
        START <span style={{ color: "#CC0000" }}>WINNING.</span>
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 26,
          color: "#A0A0A8",
          letterSpacing: 4,
          opacity: subOp,
        }}
      >
        THE INTELLIGENCE LAYER FOR MODERN MARKETING
      </div>

      <div
        style={{
          marginTop: 32,
          padding: "16px 40px",
          border: "2px solid #CC0000",
          color: "#EEEEEE",
          fontSize: 22,
          letterSpacing: 4,
          fontWeight: 700,
          opacity: urlOp,
          boxShadow: "0 0 30px rgba(204,0,0,0.4)",
        }}
      >
        KOREXINTELLIGENCESYSTEMS.COM
      </div>
    </AbsoluteFill>
  );
};
