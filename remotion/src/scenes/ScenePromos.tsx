import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const features = [
  "PROMOTIONS & DISCOUNTS",
  "MULTI-PLATFORM SCRAPING",
  "BUSINESS CONTEXT GROUNDING",
  "AGENCY MULTI-TENANT",
];

export const ScenePromos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // THE FULL STACK
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -2,
          marginTop: 12,
          opacity: titleOp,
          lineHeight: 1.05,
        }}
      >
        Built for operators who
        <br />
        <span style={{ color: "#CC0000" }}>refuse to guess.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 60, maxWidth: 1400 }}>
        {features.map((f, i) => {
          const s = i * 8 + 28;
          const sp = spring({ frame: frame - s, fps, config: { damping: 16, stiffness: 140 } });
          return (
            <div
              key={i}
              style={{
                padding: "32px 36px",
                background: "rgba(22,23,26,0.9)",
                border: "1px solid rgba(204,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 24,
                transform: `translateX(${(1 - sp) * -80}px)`,
                opacity: sp,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  background: "#CC0000",
                  boxShadow: "0 0 16px #CC0000",
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 32, fontWeight: 800, color: "#EEEEEE", letterSpacing: 1 }}>{f}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
