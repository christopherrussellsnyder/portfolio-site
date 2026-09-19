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

export const InterfaceVideoV2: React.FC = () => {
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
              eyebrow="// PLATFORM TOUR · OPERATOR CUT"
              line1="From a screenshot,"
              line2="to a 7-day plan."
              sub="Watch the workflow end-to-end."
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />

          {/* Demo first — workflow-led */}
          <TransitionSeries.Sequence durationInFrames={160}>
            <SceneShot
              src="shots/demo.png"
              label="workflow"
              chapter="// 01 · THE LOOP"
              title="Drop. Generate. Ship."
              sub="The full Korex loop in three deliberate steps — no busywork."
              scaleFrom={1.05}
              scaleTo={1.20}
              panY={-110}
              callouts={[
                { x: 120, y: 240, w: 520, h: 200, label: "INGEST", sub: "Screenshots · CSVs · platform exports", delay: 25, corner: "tl" },
                { x: 1080, y: 600, w: 520, h: 180, label: "SHIP", sub: "Calendar-ready posts with captions + visuals", delay: 65, corner: "bl" },
              ]}
              cursors={[{ x: 960, y: 540, delay: 100 }]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Features */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/features.png"
              label="features"
              chapter="// 02 · THE STACK"
              title="Six modules. One context."
              sub="Strategist, Generator, Insights, Library, Media, Settings — all share the same memory."
              scaleFrom={1.04}
              scaleTo={1.16}
              panY={-100}
              callouts={[
                { x: 120, y: 320, w: 480, h: 200, label: "SHARED BRAIN", sub: "Business context flows into every module", delay: 25, corner: "tl" },
                { x: 1080, y: 540, w: 500, h: 200, label: "GROUNDED OUTPUT", sub: "Every suggestion tied to YOUR niche + audience", delay: 65, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Landing */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/landing.png"
              label="home"
              chapter="// 03 · CONTROL ROOM"
              title="The dashboard you live in."
              sub="Persistent dark cockpit. Every action one click away."
              scaleFrom={1.03}
              scaleTo={1.13}
              panY={-50}
              callouts={[
                { x: 80, y: 110, w: 380, h: 90, label: "NAV", sub: "Core routes pinned · zero hunting", delay: 25, corner: "tl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

          {/* Pricing */}
          <TransitionSeries.Sequence durationInFrames={140}>
            <SceneShot
              src="shots/pricing.png"
              label="pricing"
              chapter="// 04 · TIERS"
              title="Solo or agency — same engine."
              sub="Annual = two months free. Agency unlocks multi-client + white-label."
              scaleFrom={1.04}
              scaleTo={1.14}
              panY={-60}
              callouts={[
                { x: 600, y: 300, w: 380, h: 360, label: "PRO", sub: "The operator's tier", delay: 25, corner: "tr" },
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
