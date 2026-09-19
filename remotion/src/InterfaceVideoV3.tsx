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

export const InterfaceVideoV3: React.FC = () => {
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
              eyebrow="// FEATURE DEEP-DIVE"
              line1="Every screen,"
              line2="under the hood."
              sub="A close-up tour of the modules that ship strategy."
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

          {/* Features — tight zoom */}
          <TransitionSeries.Sequence durationInFrames={170}>
            <SceneShot
              src="shots/features.png"
              label="features"
              chapter="// FEATURE 01 · AI STRATEGIST"
              title="An operator, not a chatbot."
              sub="Streams real strategy, grounded in your business context."
              scaleFrom={1.06}
              scaleTo={1.24}
              panY={-160}
              callouts={[
                { x: 120, y: 220, w: 540, h: 280, label: "REAL-TIME", sub: "Postgres-streamed responses", delay: 30, corner: "tl" },
                { x: 1080, y: 520, w: 500, h: 220, label: "MEMORY", sub: "Remembers your products, audience, promos", delay: 75, corner: "bl" },
              ]}
              cursors={[{ x: 720, y: 600, delay: 110 }]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Demo — tight zoom on insights */}
          <TransitionSeries.Sequence durationInFrames={170}>
            <SceneShot
              src="shots/demo.png"
              label="insights"
              chapter="// FEATURE 02 · INSIGHTS"
              title="Reads what actually wins."
              sub="Drop in a Meta/TikTok/Google export — extract the patterns behind real performance."
              scaleFrom={1.08}
              scaleTo={1.26}
              panY={-140}
              callouts={[
                { x: 100, y: 280, w: 540, h: 240, label: "10-STEP SCAN", sub: "Hook · arc · CTA · pacing · format", delay: 30, corner: "tl" },
                { x: 1080, y: 280, w: 540, h: 240, label: "MULTI-FORMAT", sub: "PNG · PDF · CSV · spreadsheet", delay: 75, corner: "br" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Landing — A/B */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/landing.png"
              label="variants"
              chapter="// FEATURE 03 · A/B CAPTIONS"
              title="Three angles per post."
              sub="Tap to generate alternate caption variants without rewriting the whole strategy."
              scaleFrom={1.05}
              scaleTo={1.18}
              panY={-80}
              callouts={[
                { x: 1000, y: 380, w: 540, h: 220, label: "VARIANTS", sub: "Swap angles · keep the strategy", delay: 30, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* About */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/about.png"
              label="why"
              chapter="// FEATURE 04 · GUARDRAILS"
              title="Anti-oversaturation, built in."
              sub="Quality floor + proven frameworks + your real differentiators."
              scaleFrom={1.05}
              scaleTo={1.16}
              panY={-100}
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
