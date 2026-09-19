import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const posts = [
  { day: "DAY 1", platform: "INSTAGRAM", title: "Reel · Behind the build" },
  { day: "DAY 2", platform: "TIKTOK", title: "Hook · Pain point story" },
  { day: "DAY 3", platform: "LINKEDIN", title: "Carousel · Case study" },
  { day: "DAY 4", platform: "X / TWITTER", title: "Thread · Industry insight" },
  { day: "DAY 5", platform: "INSTAGRAM", title: "Story · Promo teaser" },
];

export const SceneStrategy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [6, 22], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 22, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // AI STRATEGY GENERATION
      </div>
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: "#EEEEEE",
          letterSpacing: -2,
          marginTop: 12,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          lineHeight: 1.05,
        }}
      >
        14 days. Every platform.
        <br />
        <span style={{ color: "#CC0000" }}>Generated in seconds.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 50 }}>
        {posts.map((p, i) => {
          const s = i * 8 + 28;
          const op = interpolate(frame, [s, s + 12], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(frame, [s, s + 18], [-60, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "16px 24px",
                background: "rgba(22,23,26,0.85)",
                border: "1px solid rgba(204,0,0,0.4)",
                borderLeft: "4px solid #CC0000",
                opacity: op,
                transform: `translateX(${x}px)`,
                maxWidth: 900,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#CC0000", width: 90, letterSpacing: 2 }}>{p.day}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#A0A0A8", width: 160, letterSpacing: 2 }}>{p.platform}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#EEEEEE" }}>{p.title}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
