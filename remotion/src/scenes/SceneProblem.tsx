import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const words = ["GUESSING.", "SCATTERED DATA.", "WASTED SPEND."];

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", paddingLeft: 140 }}>
      <div style={{ fontSize: 22, letterSpacing: 6, color: "#CC0000", marginBottom: 30, opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }) }}>
        // THE OLD WAY
      </div>
      {words.map((w, i) => {
        const start = i * 14 + 6;
        const op = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: "clamp" });
        const x = interpolate(frame, [start, start + 18], [-40, 0], { extrapolateRight: "clamp" });
        const strike = interpolate(frame, [start + 28, start + 45], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "relative", marginBottom: 14, opacity: op, transform: `translateX(${x}px)` }}>
            <div
              style={{
                fontSize: 88,
                fontWeight: 900,
                letterSpacing: -2,
                color: "#EEEEEE",
                fontFamily: "Inter",
                lineHeight: 1.05,
              }}
            >
              {w}
            </div>
            <div
              style={{
                position: "absolute",
                top: "55%",
                left: 0,
                height: 6,
                width: `${strike * 100}%`,
                background: "#CC0000",
                boxShadow: "0 0 20px rgba(204,0,0,0.8)",
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
