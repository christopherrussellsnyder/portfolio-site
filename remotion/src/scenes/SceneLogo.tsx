import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const wordOpacity = interpolate(frame, [18, 36], [0, 1], { extrapolateRight: "clamp" });
  const wordX = interpolate(frame, [18, 40], [-30, 0], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: "clamp" });
  const underline = interpolate(frame, [45, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40, transform: `scale(${0.7 + markScale * 0.3})` }}>
        {/* Splintered K mark */}
        <svg width="160" height="200" viewBox="0 0 400 400">
          <rect x="72" y="32" width="48" height="336" fill="#CC0000" />
          <polygon points="120,32 120,120 344,32 280,32" fill="#EEEEEE" />
          <polygon points="120,88 120,168 344,32 272,32" fill="#CC0000" opacity="0.7" />
          <polygon points="120,232 120,312 344,368 272,368" fill="#CC0000" opacity="0.7" />
          <polygon points="120,280 120,368 240,368 200,368" fill="#EEEEEE" />
        </svg>

        <div style={{ height: 140, width: 2, background: "rgba(204,0,0,0.4)" }} />

        <div style={{ opacity: wordOpacity, transform: `translateX(${wordX}px)` }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: 18,
              color: "#EEEEEE",
              fontFamily: "Inter",
              lineHeight: 1,
            }}
          >
            KOREX
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 8,
              color: "#CC0000",
              marginTop: 12,
              opacity: taglineOpacity,
              fontWeight: 400,
            }}
          >
            INTELLIGENCE SYSTEMS
          </div>
          <div
            style={{
              marginTop: 14,
              height: 2,
              background: "#CC0000",
              opacity: 0.6,
              width: `${underline * 100}%`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
