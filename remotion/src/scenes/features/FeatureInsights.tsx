import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const FeatureInsights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // upload → analyzing → results
  const uploadIn = spring({ frame: frame - 10, fps, config: { damping: 16 } });
  const scan = interpolate(frame, [30, 80], [0, 100], { extrapolateRight: "clamp" });
  const resultsIn = spring({ frame: frame - 80, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ padding: "70px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // 03 · INSIGHTS ENGINE
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1.5, marginTop: 8, opacity: labelOp }}>
        Drop a screenshot. Get the verdict.
      </div>

      <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
        {/* Upload pane */}
        <div
          style={{
            flex: 1,
            background: "rgba(15,16,18,0.95)",
            border: "2px dashed rgba(204,0,0,0.5)",
            borderRadius: 14,
            padding: 40,
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            opacity: uploadIn,
            transform: `translateX(${(1 - uploadIn) * -40}px)`,
          }}
        >
          <div style={{ fontSize: 14, color: "#6B6B73", letterSpacing: 3, marginBottom: 20 }}>
            META_ADS_DASHBOARD.PNG
          </div>
          {/* fake screenshot */}
          <div style={{ width: "100%", background: "#0a0b0e", border: "1px solid #2a2b2e", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ flex: 1, height: 50, background: "rgba(204,0,0,0.15)", borderRadius: 4 }} />
              ))}
            </div>
            <div style={{ height: 140, background: "linear-gradient(180deg, rgba(204,0,0,0.25), transparent)", borderRadius: 4, position: "relative" }}>
              <svg viewBox="0 0 300 140" style={{ width: "100%", height: "100%" }}>
                <polyline
                  points="0,110 30,90 60,95 90,70 120,75 150,55 180,45 210,30 240,40 270,20 300,15"
                  fill="none"
                  stroke="#CC0000"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
          {/* scan line */}
          {frame > 30 && frame < 85 && (
            <div
              style={{
                position: "absolute",
                left: 40,
                right: 40,
                top: `${20 + (scan / 100) * 70}%`,
                height: 3,
                background: "linear-gradient(90deg, transparent, #CC0000, transparent)",
                boxShadow: "0 0 20px #CC0000",
              }}
            />
          )}
          <div style={{ marginTop: 20, fontSize: 16, color: "#CC0000", letterSpacing: 3 }}>
            {frame < 30 ? "READY" : frame < 85 ? `ANALYZING ${Math.floor(scan)}%` : "COMPLETE"}
          </div>
        </div>

        {/* Results pane */}
        <div
          style={{
            flex: 1,
            background: "rgba(15,16,18,0.95)",
            border: "1px solid rgba(204,0,0,0.35)",
            borderTop: "3px solid #CC0000",
            borderRadius: 14,
            padding: 32,
            minHeight: 420,
            opacity: resultsIn,
            transform: `translateY(${(1 - resultsIn) * 30}px)`,
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: 4, color: "#A0A0A8", marginBottom: 12 }}>HEALTH SCORE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 120, fontWeight: 900, color: "#EEEEEE", letterSpacing: -4, lineHeight: 1 }}>
              {interpolate(frame, [80, 130], [0, 8.7], { extrapolateRight: "clamp" }).toFixed(1)}
            </div>
            <div style={{ fontSize: 36, color: "#CC0000", fontWeight: 700 }}>/10</div>
          </div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["CTR", "+34% above benchmark"],
              ["CPC", "Below industry median"],
              ["RECOMMENDATION", "Shift 20% budget to creative B"],
            ].map(([k, v], i) => {
              const op = interpolate(frame, [100 + i * 8, 115 + i * 8], [0, 1], { extrapolateRight: "clamp" });
              return (
                <div key={k} style={{ opacity: op, borderLeft: "3px solid #CC0000", paddingLeft: 16 }}>
                  <div style={{ fontSize: 12, color: "#6B6B73", letterSpacing: 2 }}>{k}</div>
                  <div style={{ fontSize: 20, color: "#EEEEEE", marginTop: 2 }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
