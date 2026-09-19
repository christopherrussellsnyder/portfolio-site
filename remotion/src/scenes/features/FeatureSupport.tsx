import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const FeatureSupport: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const items = [
    { k: "PROMOTIONS", v: "Active sales injected into every plan" },
    { k: "AGENCY MULTI-CLIENT", v: "Switch workspaces in one click" },
    { k: "SUPPORT WIDGET", v: "AI answers — humans escalate" },
    { k: "ANNUAL PLAN", v: "2 months free, KOREX = 15% off" },
  ];

  // Floating support widget
  const widgetIn = spring({ frame: frame - 50, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ padding: "70px 120px", flexDirection: "column" }}>
      <div style={{ fontSize: 20, letterSpacing: 6, color: "#CC0000", opacity: labelOp }}>
        // 05 · THE REST OF THE STACK
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1.5, marginTop: 8, opacity: labelOp }}>
        Built so nothing slows you down.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 40, maxWidth: 1300 }}>
        {items.map((it, i) => {
          const s = i * 10 + 14;
          const sp = spring({ frame: frame - s, fps, config: { damping: 18 } });
          return (
            <div
              key={i}
              style={{
                padding: "26px 30px",
                background: "rgba(15,16,18,0.95)",
                border: "1px solid rgba(204,0,0,0.3)",
                borderRadius: 10,
                transform: `translateY(${(1 - sp) * 30}px)`,
                opacity: sp,
              }}
            >
              <div style={{ fontSize: 12, color: "#CC0000", letterSpacing: 3, fontWeight: 800, marginBottom: 8 }}>
                {it.k}
              </div>
              <div style={{ fontSize: 24, color: "#EEEEEE", fontWeight: 600 }}>{it.v}</div>
            </div>
          );
        })}
      </div>

      {/* floating support widget */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 120,
          opacity: widgetIn,
          transform: `translateY(${(1 - widgetIn) * 30}px) scale(${0.9 + widgetIn * 0.1})`,
        }}
      >
        <div
          style={{
            width: 340,
            background: "rgba(15,16,18,0.98)",
            border: "1px solid rgba(204,0,0,0.5)",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(204,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            <div style={{ fontSize: 14, color: "#EEEEEE", letterSpacing: 2, fontWeight: 700 }}>KOREX SUPPORT</div>
          </div>
          <div
            style={{
              background: "rgba(204,0,0,0.12)",
              border: "1px solid rgba(204,0,0,0.3)",
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              color: "#EEEEEE",
              lineHeight: 1.5,
            }}
          >
            Need help with your strategy? I can answer instantly — or loop in the team.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
