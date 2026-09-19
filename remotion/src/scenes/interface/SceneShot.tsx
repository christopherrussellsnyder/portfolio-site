import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame } from "./BrowserFrame";
import { Callout, Cursor } from "./Callout";

export const SceneShot: React.FC<{
  src: string;
  label: string;
  chapter: string;
  title: string;
  sub: string;
  scaleFrom?: number;
  scaleTo?: number;
  panX?: number;
  panY?: number;
  callouts?: { x: number; y: number; w?: number; h?: number; label: string; sub?: string; delay?: number; corner?: "tl" | "tr" | "bl" | "br" }[];
  cursors?: { x: number; y: number; delay?: number }[];
}> = ({ src, label, chapter, title, sub, scaleFrom = 1.05, scaleTo = 1.15, panX = 0, panY = 0, callouts = [], cursors = [] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [scaleFrom, scaleTo]);
  const ox = interpolate(frame, [0, durationInFrames], [0, panX]);
  const oy = interpolate(frame, [0, durationInFrames], [0, panY]);

  const headerOp = spring({ frame, fps, config: { damping: 20 } });
  const frameIn = spring({ frame: frame - 8, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ padding: 60, flexDirection: "column" }}>
      {/* Chapter header */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24, opacity: headerOp }}>
        <div style={{ fontSize: 16, letterSpacing: 6, color: "#CC0000", fontWeight: 800 }}>{chapter}</div>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#CC0000,transparent)" }} />
        <div style={{ fontSize: 32, fontWeight: 900, color: "#EEEEEE", letterSpacing: -1 }}>{title}</div>
      </div>

      {/* Browser frame container */}
      <div
        style={{
          flex: 1,
          position: "relative",
          opacity: frameIn,
          transform: `translateY(${(1 - frameIn) * 40}px)`,
        }}
      >
        <BrowserFrame src={src} label={label} scale={scale} offsetX={ox} offsetY={oy} />

        {/* Overlay callouts (positioned over the browser viewport) */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {callouts.map((c, i) => (
            <Callout key={i} {...c} />
          ))}
          {cursors.map((c, i) => (
            <Cursor key={i} {...c} />
          ))}
        </div>
      </div>

      {/* Sub caption */}
      <div style={{ marginTop: 18, fontSize: 18, color: "#A0A0A8", letterSpacing: 2, opacity: headerOp }}>
        {sub}
      </div>
    </AbsoluteFill>
  );
};
