import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const posts = [
  { tag: "INSTAGRAM · REEL", hook: "Stop scrolling — your hairline called.", variant: "A" },
  { tag: "INSTAGRAM · REEL", hook: "Three signs your serum is gaslighting you.", variant: "B" },
];

export const FeatureContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const card1 = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const card2 = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const img = spring({ frame: frame - 70, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ padding: "70px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // 04 · CONTENT + VISUALS
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1.5, marginTop: 8, opacity: labelOp }}>
        A/B captions + AI-generated visuals.
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
        {/* Caption variants */}
        <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: 18 }}>
          {posts.map((p, i) => {
            const op = i === 0 ? card1 : card2;
            return (
              <div
                key={i}
                style={{
                  background: "rgba(15,16,18,0.95)",
                  border: "1px solid rgba(204,0,0,0.35)",
                  borderLeft: "4px solid #CC0000",
                  borderRadius: 10,
                  padding: 24,
                  opacity: op,
                  transform: `translateX(${(1 - op) * -40}px)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#CC0000", letterSpacing: 3, fontWeight: 700 }}>{p.tag}</div>
                  <div
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      background: "#CC0000",
                      color: "#fff",
                      borderRadius: 4,
                      letterSpacing: 2,
                      fontWeight: 800,
                    }}
                  >
                    VARIANT {p.variant}
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#EEEEEE", lineHeight: 1.3 }}>
                  "{p.hook}"
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 16, fontSize: 13, color: "#6B6B73", letterSpacing: 2 }}>
                  <span>HOOK STRENGTH · 9.2</span>
                  <span>·</span>
                  <span>FRAMEWORK · PAS</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generated image preview */}
        <div
          style={{
            flex: 1,
            background: "rgba(15,16,18,0.95)",
            border: "1px solid rgba(204,0,0,0.35)",
            borderRadius: 10,
            padding: 18,
            opacity: img,
            transform: `scale(${0.92 + img * 0.08})`,
          }}
        >
          <div style={{ fontSize: 12, color: "#CC0000", letterSpacing: 3, marginBottom: 12 }}>
            AI VISUAL · 1080×1080
          </div>
          <div
            style={{
              aspectRatio: "1 / 1",
              borderRadius: 8,
              background: `
                radial-gradient(circle at 30% 30%, rgba(204,0,0,0.6), transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(255,80,80,0.4), transparent 50%),
                linear-gradient(135deg, #1a0808, #060606)
              `,
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(204,0,0,0.3)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(circle, rgba(204,0,0,0.3) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                fontSize: 14,
                color: "#EEEEEE",
                letterSpacing: 3,
                fontWeight: 800,
              }}>
              GENERATED IN 4.2s
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
