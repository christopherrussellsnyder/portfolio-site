import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont } from "@remotion/google-fonts/Inter";

import { SceneLogo } from "./scenes/SceneLogo";
import { SceneProblem } from "./scenes/SceneProblem";
import { SceneStrategy } from "./scenes/SceneStrategy";
import { SceneInsights } from "./scenes/SceneInsights";
import { ScenePromos } from "./scenes/ScenePromos";
import { SceneClose } from "./scenes/SceneClose";

loadFont("normal", { weights: ["400", "600", "800", "900"], subsets: ["latin"] });

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
        opacity: 0.55,
      }}
    />
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
      pointerEvents: "none",
    }}
  />
);

const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const y = ((frame * 6) % (height + 200)) - 100;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 2,
          background:
            "linear-gradient(90deg, transparent, rgba(204,0,0,0.6), transparent)",
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.92 + Math.sin(frame * 0.3) * 0.04;

  return (
    <AbsoluteFill style={{ background: "#060606", fontFamily: "Inter" }}>
      {/* Persistent layers */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(204,0,0,0.18), transparent 50%), radial-gradient(circle at 70% 80%, rgba(204,0,0,0.10), transparent 50%)",
        }}
      />
      <DottedGrid />
      <ScanLine />

      <AbsoluteFill style={{ opacity: flicker }}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={75}>
            <SceneLogo />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: 18 })}
          />
          <TransitionSeries.Sequence durationInFrames={90}>
            <SceneProblem />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={wipe({ direction: "from-left" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
          />
          <TransitionSeries.Sequence durationInFrames={90}>
            <SceneStrategy />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={wipe({ direction: "from-right" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
          />
          <TransitionSeries.Sequence durationInFrames={90}>
            <SceneInsights />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={wipe({ direction: "from-bottom" })}
            timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
          />
          <TransitionSeries.Sequence durationInFrames={90}>
            <ScenePromos />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: 18 })}
          />
          <TransitionSeries.Sequence durationInFrames={120}>
            <SceneClose />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>

      <Vignette />
    </AbsoluteFill>
  );
};
