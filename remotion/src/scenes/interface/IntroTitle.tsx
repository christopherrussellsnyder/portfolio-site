import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line1 = spring({ frame, fps, config: { damping: 18 } });
  const line2 = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const sub = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const barW = interpolate(frame, [10, 40], [0, 420], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 8, color: "#CC0000", marginBottom: 18, opacity: sub }}>
        // PLATFORM TOUR · 03
      </div>
      <div
        style={{
          fontSize: 124,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -3,
          lineHeight: 0.95,
          opacity: line1,
          transform: `translateY(${(1 - line1) * 30}px)`,
        }}
      >
        Inside the
      </div>
      <div
        style={{
          fontSize: 124,
          fontWeight: 900,
          background: "linear-gradient(90deg,#CC0000,#FF4D4D)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          letterSpacing: -3,
          lineHeight: 0.95,
          opacity: line2,
          transform: `translateY(${(1 - line2) * 30}px)`,
        }}
      >
        Korex Interface.
      </div>
      <div style={{ height: 3, width: barW, background: "#CC0000", marginTop: 30 }} />
      <div style={{ fontSize: 22, color: "#A0A0A8", marginTop: 24, letterSpacing: 4, opacity: sub }}>
        A real walkthrough — no mockups.
      </div>
    </AbsoluteFill>
  );
};
