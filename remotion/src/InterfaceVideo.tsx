import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont } from "@remotion/google-fonts/Inter";

import { IntroTitle } from "./scenes/interface/IntroTitle";
import { SceneShot } from "./scenes/interface/SceneShot";
import { FinalCTA } from "./scenes/interface/FinalCTA";

loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });

const DottedGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.4) % 24;
  return (
    <AbsoluteFill
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(204,0,0,0.18) 1.2px, transparent 1.2px)",
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
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(204,0,0,0.5), transparent)",
          opacity: 0.3,
        }}
      />
    </AbsoluteFill>
  );
};

export const InterfaceVideo: React.FC = () => {
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
            <IntroTitle />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: 15 })}
          />

          {/* Landing */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/landing.png"
              label="home"
              chapter="// 01 · LANDING"
              title="Your command center."
              sub="A cinematic dark UI built around one job — turning data into a strategy that ships."
              scaleFrom={1.02}
              scaleTo={1.12}
              panY={-40}
              callouts={[
                { x: 80, y: 110, w: 360, h: 90, label: "BRAND LOCKUP", sub: "Persistent nav · dark cyberpunk theme", delay: 25, corner: "tl" },
                { x: 1080, y: 420, w: 540, h: 160, label: "HERO CTA", sub: "Sign up flow gated by email verify", delay: 55, corner: "bl" },
              ]}
              cursors={[{ x: 1450, y: 480, delay: 70 }]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />

          {/* Features */}
          <TransitionSeries.Sequence durationInFrames={160}>
            <SceneShot
              src="shots/features.png"
              label="features"
              chapter="// 02 · FEATURES"
              title="Every module, one fabric."
              sub="AI Strategist · Strategy Generation · Insights · Content Library · Media · Settings."
              scaleFrom={1.04}
              scaleTo={1.18}
              panY={-120}
              callouts={[
                { x: 120, y: 280, w: 460, h: 220, label: "MODULE GRID", sub: "Six core modules, one shared context", delay: 25, corner: "tl" },
                { x: 1080, y: 560, w: 500, h: 180, label: "ANTI-OVERSATURATION", sub: "Strategies anchored to your products + audience", delay: 70, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={wipe({ direction: "from-left" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />

          {/* Demo */}
          <TransitionSeries.Sequence durationInFrames={160}>
            <SceneShot
              src="shots/demo.png"
              label="demo"
              chapter="// 03 · WORKFLOW"
              title="Upload → Generate → Execute."
              sub="Three steps. Drop a screenshot, get a complete 7-day plan, post it."
              scaleFrom={1.05}
              scaleTo={1.20}
              panY={-90}
              callouts={[
                { x: 120, y: 240, w: 520, h: 200, label: "STEP 01 · UPLOAD", sub: "Any platform export — Meta, TikTok, Google, LinkedIn", delay: 25, corner: "tl" },
                { x: 1080, y: 240, w: 520, h: 200, label: "STEP 02 · STRATEGIZE", sub: "Calibrated against YOUR historical baseline", delay: 60, corner: "bl" },
              ]}
              cursors={[{ x: 800, y: 700, delay: 100 }]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={slide({ direction: "from-bottom" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />

          {/* Pricing */}
          <TransitionSeries.Sequence durationInFrames={150}>
            <SceneShot
              src="shots/pricing.png"
              label="pricing"
              chapter="// 04 · PRICING"
              title="Built for solo to agency."
              sub="Starter · Pro · Agency. Monthly or annual — annual ships with two months free."
              scaleFrom={1.04}
              scaleTo={1.14}
              panY={-60}
              callouts={[
                { x: 600, y: 300, w: 380, h: 360, label: "PRO TIER", sub: "Unlimited strategies · full insights · A/B variants", delay: 25, corner: "tr" },
                { x: 1100, y: 380, w: 340, h: 220, label: "AGENCY", sub: "Multi-client · white-label · API access", delay: 65, corner: "bl" },
              ]}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={wipe({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
          />

          {/* About */}
          <TransitionSeries.Sequence durationInFrames={130}>
            <SceneShot
              src="shots/about.png"
              label="about"
              chapter="// 05 · WHY KOREX"
              title="Built by operators."
              sub="Not a chatbot wrapper. A full strategy engine grounded in your real performance."
              scaleFrom={1.05}
              scaleTo={1.16}
              panY={-100}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: 20 })}
          />

          <TransitionSeries.Sequence durationInFrames={130}>
            <FinalCTA />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>

      <Vignette />
    </AbsoluteFill>
  );
};
