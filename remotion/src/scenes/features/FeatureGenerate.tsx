import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const steps = [
  "Pulling business context",
  "Loading audience demographics",
  "Scraping platform trends",
  "Applying anti-saturation directive",
  "Calibrating to your top performers",
  "Generating 14 posts across 4 platforms",
];

export const FeatureGenerate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const cardOp = spring({ frame: frame - 8, fps, config: { damping: 20 } });
  const progress = interpolate(frame, [20, 130], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "70px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // 02 · STRATEGY GENERATION
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1.5, marginTop: 8, opacity: labelOp }}>
        From context → calendar. Live.
      </div>

      <div
        style={{
          marginTop: 40,
          background: "rgba(15,16,18,0.95)",
          border: "1px solid rgba(204,0,0,0.35)",
          borderRadius: 14,
          padding: 32,
          maxWidth: 1500,
          opacity: cardOp,
          transform: `translateY(${(1 - cardOp) * 40}px)`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#EEEEEE", letterSpacing: 1 }}>
            GENERATING STRATEGY
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: "#CC0000", letterSpacing: -2 }}>
            {Math.floor(progress)}%
          </div>
        </div>

        {/* progress bar */}
        <div style={{ height: 8, background: "rgba(204,0,0,0.15)", borderRadius: 4, overflow: "hidden", marginBottom: 28 }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #CC0000, #ff3333)",
              boxShadow: "0 0 16px rgba(204,0,0,0.6)",
            }}
          />
        </div>

        {/* steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {steps.map((s, i) => {
            const sStart = i * 18 + 25;
            const done = frame > sStart + 16;
            const active = frame > sStart && !done;
            const op = interpolate(frame, [sStart - 4, sStart + 8], [0.2, 1], { extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  opacity: op,
                  fontSize: 22,
                  color: done ? "#EEEEEE" : active ? "#CC0000" : "#6B6B73",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    border: `2px solid ${done || active ? "#CC0000" : "#3a3a3e"}`,
                    background: done ? "#CC0000" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  {done ? "✓" : ""}
                </div>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
