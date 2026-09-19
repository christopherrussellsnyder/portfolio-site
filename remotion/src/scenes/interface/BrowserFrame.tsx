import { staticFile, Img } from "remotion";

export const BrowserFrame: React.FC<{
  src: string;
  label?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}> = ({ src, label, scale = 1, offsetX = 0, offsetY = 0 }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0B0B0D",
        borderRadius: 18,
        border: "1px solid rgba(204,0,0,0.35)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(204,0,0,0.15), 0 0 60px rgba(204,0,0,0.18)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 38,
          background: "linear-gradient(180deg,#161618,#0E0E10)",
          borderBottom: "1px solid rgba(204,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#CC0000" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3a3a3a" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3a3a3a" }} />
        <div
          style={{
            marginLeft: 20,
            flex: 1,
            height: 22,
            background: "#08080A",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontSize: 11,
            color: "#6B6B73",
            letterSpacing: 2,
            fontFamily: "Inter",
          }}
        >
          korexintelligencesystems.com{label ? ` / ${label}` : ""}
        </div>
      </div>

      {/* Viewport */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "#060606" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
            transformOrigin: "center center",
          }}
        >
          <Img
            src={staticFile(src)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>
    </div>
  );
};
