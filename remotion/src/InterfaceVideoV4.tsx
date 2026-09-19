import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont } from "@remotion/google-fonts/Inter";

import { IntroTitleV } from "./scenes/interface/IntroTitleV";
import { SceneShot } from "./scenes/interface/SceneShot";
import { FinalCTA } from "./scenes/interface/FinalCTA";

loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });

const DottedGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.4) % 24;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(circle, rgba(204,0,0,0.18) 1.2px, transparent 1.2px)",
        backgroundSize: "24px 24px",
        backgroundPosition: `${drift}px ${drift}px`,
        opacity: 0.4,
      }}
    />
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)",
      pointerEvents: "none",
    }}
  />
);

const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const y = ((frame * 5) % (height + 200)) - 100;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: y, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(204,0,0,0.5), transparent)",
          opacity: 0.3,
        }}
      />
    </AbsoluteFill>
  );
};

export const InterfaceVideoV4: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.94 + Math.sin(frame * 0.3) * 0.03;

  return (
    <AbsoluteFill style={{ background: "#060606", fontFamily: "Inter" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 25% 15%, rgba(204,0,0,0.20), transparent 50%), radial-gradient(circle at 75% 85%, rgba(204,0,0,0.10), transparent 50%)",
        }}
      />
      <DottedGrid />
      <ScanLine />

      <AbsoluteFill style={{ opacity: flicker }}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={80}>
            <IntroTitleV
              eyebrow="// INVESTOR PREVIEW"
              line1="What we built."
              line2="Why it ships."
              sub="A guided pass through the live Korex product."
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

          {/* About — opens with positioning */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/about.png"
              label="positioning"
              chapter="// 01 · POSITIONING"
              title="Not another wrapper."
              sub="A strategy engine — grounded in real ad data, calibrated to your business."
              scaleFrom={1.04}
              scaleTo={1.16}
              panY={-90}
              callouts={[
                { x: 120, y: 320, w: 500, h: 220, label: "DIFFERENTIATOR", sub: "Real performance ↔ real strategy", delay: 25, corner: "tl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Landing */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/landing.png"
              label="surface"
              chapter="// 02 · SURFACE"
              title="A dark, deliberate UI."
              sub="Cyberpunk minimalism — built for operators who live in the tool."
              scaleFrom={1.03}
              scaleTo={1.14}
              panY={-60}
              callouts={[
                { x: 1080, y: 420, w: 540, h: 200, label: "FLOW", sub: "Sign-up gated by verified email", delay: 30, corner: "bl" },
              ]}
              cursors={[{ x: 1500, y: 510, delay: 70 }]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Features */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/features.png"
              label="depth"
              chapter="// 03 · DEPTH"
              title="Six modules wired together."
              sub="Strategist · Generator · Insights · Library · Media · Settings."
              scaleFrom={1.04}
              scaleTo={1.18}
              panY={-120}
              callouts={[
                { x: 120, y: 280, w: 460, h: 220, label: "MODULES", sub: "Each one earns its place", delay: 25, corner: "tl" },
                { x: 1080, y: 560, w: 500, h: 180, label: "ONE CONTEXT", sub: "Shared memory across every screen", delay: 60, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Demo */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/demo.png"
              label="moat"
              chapter="// 04 · MOAT"
              title="A real intelligence loop."
              sub="Each strategy learns from the last — a compounding data advantage."
              scaleFrom={1.05}
              scaleTo={1.20}
              panY={-100}
              callouts={[
                { x: 120, y: 240, w: 520, h: 200, label: "FEEDBACK", sub: "Top performers calibrate new plans", delay: 25, corner: "tl" },
                { x: 1080, y: 600, w: 520, h: 180, label: "COMPOUNDING", sub: "Better data → better strategies", delay: 65, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Pricing */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/pricing.png"
              label="revenue"
              chapter="// 05 · REVENUE"
              title="Three tiers. Real margins."
              sub="Starter, Pro, Agency — annual ships with two months free + KOREX promo."
              scaleFrom={1.04}
              scaleTo={1.14}
              panY={-60}
              callouts={[
                { x: 1100, y: 380, w: 340, h: 220, label: "AGENCY", sub: "Multi-client · white-label · API", delay: 30, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 20 })} />

          <TransitionSeries.Sequence durationInFrames={130}>
            <FinalCTA />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>

      <Vignette />
    </AbsoluteFill>
  );
};
