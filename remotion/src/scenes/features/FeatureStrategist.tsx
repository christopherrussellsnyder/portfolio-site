import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const userMsg = "Build me a 14-day strategy for my DTC skincare brand.";
const aiMsg = "Analyzing your audience, products, and active promotions...";

const Typing: React.FC<{ text: string; start: number; speed?: number }> = ({ text, start, speed = 1.2 }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - start) * speed));
  return <>{text.slice(0, chars)}</>;
};

export const FeatureStrategist: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const win = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const userBubble = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const aiBubble = spring({ frame: frame - 75, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ padding: "70px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // 01 · AI STRATEGIST
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1.5, marginTop: 8, opacity: labelOp }}>
        Talk to the algorithm.
      </div>

      <div
        style={{
          marginTop: 40,
          background: "rgba(15,16,18,0.95)",
          border: "1px solid rgba(204,0,0,0.35)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 1500,
          transform: `translateY(${(1 - win) * 40}px) scale(${0.97 + win * 0.03})`,
          opacity: win,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(204,0,0,0.12)",
        }}
      >
        {/* window chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#CC0000" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3a3a3e" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3a3a3e" }} />
          <div style={{ marginLeft: 16, fontSize: 14, color: "#6B6B73", letterSpacing: 2 }}>
            korex.app / ai-strategist
          </div>
        </div>

        {/* user bubble */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            opacity: userBubble,
            transform: `translateY(${(1 - userBubble) * 16}px)`,
          }}
        >
          <div
            style={{
              background: "#CC0000",
              color: "#fff",
              padding: "18px 24px",
              borderRadius: "16px 16px 4px 16px",
              fontSize: 22,
              fontWeight: 500,
              maxWidth: 800,
            }}
          >
            <Typing text={userMsg} start={36} />
          </div>
        </div>

        {/* ai bubble */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            justifyContent: "flex-start",
            opacity: aiBubble,
            transform: `translateY(${(1 - aiBubble) * 16}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(40,41,45,0.95)",
              color: "#EEEEEE",
              padding: "18px 24px",
              borderRadius: "16px 16px 16px 4px",
              fontSize: 22,
              maxWidth: 900,
              border: "1px solid rgba(204,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, color: "#CC0000", letterSpacing: 3, marginBottom: 8 }}>KOREX ALGORITHM</div>
            <Typing text={aiMsg} start={82} />
            {frame > 145 && <span style={{ color: "#CC0000" }}>{Math.floor(frame / 10) % 2 ? "▍" : " "}</span>}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
