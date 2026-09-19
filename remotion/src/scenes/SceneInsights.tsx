import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const Counter: React.FC<{ to: number; suffix?: string; delay: number }> = ({ to, suffix = "", delay }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + 40], [0, to], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <span>
      {v.toFixed(suffix === "%" || suffix === "x" ? 1 : 0)}
      {suffix}
    </span>
  );
};

const metrics = [
  { label: "ENGAGEMENT LIFT", to: 47, suffix: "%" },
  { label: "HEALTH SCORE", to: 9.2, suffix: "" },
  { label: "REACH GROWTH", to: 3.4, suffix: "x" },
];

export const SceneInsights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // INSIGHTS ENGINE
      </div>
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -2,
          marginTop: 12,
          opacity: titleOp,
          lineHeight: 1.05,
        }}
      >
        Upload a screenshot.
        <br />
        <span style={{ color: "#CC0000" }}>Get the verdict.</span>
      </div>

      <div style={{ display: "flex", gap: 32, marginTop: 70 }}>
        {metrics.map((m, i) => {
          const s = i * 10 + 30;
          const sp = spring({ frame: frame - s, fps, config: { damping: 14 } });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "40px 32px",
                background: "rgba(22,23,26,0.9)",
                border: "1px solid rgba(204,0,0,0.4)",
                borderTop: "3px solid #CC0000",
                transform: `translateY(${(1 - sp) * 60}px)`,
                opacity: sp,
                boxShadow: "0 0 30px rgba(204,0,0,0.15)",
              }}
            >
              <div style={{ fontSize: 14, letterSpacing: 4, color: "#A0A0A8", marginBottom: 16 }}>{m.label}</div>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: "#EEEEEE",
                  letterSpacing: -3,
                  lineHeight: 1,
                }}
              >
                {frame >= s ? <Counter to={m.to} suffix={m.suffix} delay={s} /> : "0"}
                {m.suffix === "" && <span style={{ color: "#CC0000" }}>/10</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 50, fontSize: 22, color: "#A0A0A8", opacity: interpolate(frame, [60, 78], [0, 1], { extrapolateRight: "clamp" }) }}>
        Trend analysis · Recommendations · Benchmarking — all automated.
      </div>
    </AbsoluteFill>
  );
};
