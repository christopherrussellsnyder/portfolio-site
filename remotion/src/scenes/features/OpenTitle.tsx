import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const OpenTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame, fps, config: { damping: 18 } });
  const sub = interpolate(frame, [20, 38], [0, 1], { extrapolateRight: "clamp" });
  const cursor = Math.floor(frame / 12) % 2;

  return (
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 120px" }}>
      <div style={{ fontSize: 20, letterSpacing: 8, color: "#CC0000", opacity: sp }}>
        // FEATURE TOUR · v2026
      </div>
      <div
        style={{
          fontSize: 140,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -4,
          marginTop: 20,
          lineHeight: 0.95,
          transform: `translateY(${(1 - sp) * 40}px)`,
          opacity: sp,
        }}
      >
        Inside <span style={{ color: "#CC0000" }}>Korex.</span>
      </div>
      <div
        style={{
          fontSize: 32,
          color: "#A0A0A8",
          marginTop: 24,
          opacity: sub,
          fontWeight: 400,
        }}
      >
        Every feature. In action.{cursor ? <span style={{ color: "#CC0000" }}>_</span> : <span> </span>}
      </div>
    </AbsoluteFill>
  );
};
