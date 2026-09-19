import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const IntroTitleV: React.FC<{
  eyebrow: string;
  line1: string;
  line2: string;
  sub: string;
}> = ({ eyebrow, line1, line2, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 18 } });
  const b = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const c = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const barW = interpolate(frame, [10, 40], [0, 460], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 8, color: "#CC0000", marginBottom: 18, opacity: c }}>
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 124, fontWeight: 900, color: "#EEEEEE", letterSpacing: -3, lineHeight: 0.95,
          opacity: a, transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontSize: 124, fontWeight: 900,
          background: "linear-gradient(90deg,#CC0000,#FF4D4D)",
          WebkitBackgroundClip: "text", color: "transparent",
          letterSpacing: -3, lineHeight: 0.95,
          opacity: b, transform: `translateY(${(1 - b) * 30}px)`,
        }}
      >
        {line2}
      </div>
      <div style={{ height: 3, width: barW, background: "#CC0000", marginTop: 30 }} />
      <div style={{ fontSize: 22, color: "#A0A0A8", marginTop: 24, letterSpacing: 4, opacity: c }}>
        {sub}
      </div>
    </AbsoluteFill>
  );
};
