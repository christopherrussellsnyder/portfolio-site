import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const CloseCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 18 } });
  const t2 = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const url = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const bar = interpolate(frame, [55, 85], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 22,
          letterSpacing: 8,
          color: "#CC0000",
          opacity: t1,
          marginBottom: 24,
        }}
      >
        // START FREE · 15% OFF WITH CODE KOREX
      </div>
      <div
        style={{
          fontSize: 140,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 0.95,
          opacity: t1,
          transform: `translateY(${(1 - t1) * 40}px)`,
        }}
      >
        Stop guessing.
        <br />
        <span style={{ color: "#CC0000" }}>Start operating.</span>
      </div>

      <div
        style={{
          marginTop: 50,
          fontSize: 28,
          color: "#A0A0A8",
          opacity: t2,
          letterSpacing: 2,
        }}
      >
        Every feature. One platform. Zero filler.
      </div>

      <div
        style={{
          marginTop: 60,
          padding: "20px 50px",
          border: "2px solid #CC0000",
          borderRadius: 8,
          fontSize: 36,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: 4,
          opacity: url,
          boxShadow: "0 0 40px rgba(204,0,0,0.4)",
        }}
      >
        KOREXINTELLIGENCESYSTEMS.COM
      </div>

      <div style={{ width: 600, height: 2, background: "rgba(204,0,0,0.2)", marginTop: 40, overflow: "hidden" }}>
        <div style={{ width: `${bar}%`, height: "100%", background: "#CC0000", boxShadow: "0 0 12px #CC0000" }} />
      </div>
    </AbsoluteFill>
  );
};
