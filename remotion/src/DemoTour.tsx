import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

loadFont("normal", { weights: ["400", "600", "800", "900"], subsets: ["latin"] });

// Timing (frames @30fps). Total = 3838 frames = 127.92s ≈ 2:08.
const S1 = 683;
const S2 = 646;
const S3 = 726;
const S4 = 618;
const S5 = 696;
const S6 = 469;
export const DEMO_TOUR_DURATION = S1 + S2 + S3 + S4 + S5 + S6; // 3838

// ————————————————————————————————————————————
// Persistent layers
// ————————————————————————————————————————————
const DottedGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.35) % 24;
  return (
    <AbsoluteFill
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(204,0,0,0.16) 1.1px, transparent 1.1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: `${drift}px ${drift}px`,
        opacity: 0.45,
      }}
    />
  );
};

const Glow: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 0.85 + Math.sin(frame * 0.04) * 0.15;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 22% 18%, rgba(204,0,0,0.20), transparent 55%), radial-gradient(circle at 78% 82%, rgba(204,0,0,0.10), transparent 55%)",
        opacity: pulse,
      }}
    />
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)",
      pointerEvents: "none",
    }}
  />
);

// ————————————————————————————————————————————
// Reusable chapter shell
// ————————————————————————————————————————————
const ChapterFrame: React.FC<{
  index: string;
  title: string;
  subtitle: string;
  imgSrc: string;
  bullets?: string[];
  panDirection?: "in" | "out" | "left" | "right";
}> = ({ index, title, subtitle, imgSrc, bullets = [], panDirection = "in" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const introOp = spring({ frame, fps, config: { damping: 22 } });
  const outroOp = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const op = Math.min(introOp, outroOp);

  // Ken burns
  const scale = interpolate(frame, [0, durationInFrames], panDirection === "out" ? [1.18, 1.02] : [1.02, 1.15]);
  const px = interpolate(frame, [0, durationInFrames], panDirection === "left" ? [40, -40] : panDirection === "right" ? [-40, 40] : [0, 0]);
  const py = interpolate(frame, [0, durationInFrames], [8, -8]);

  const titleSlide = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const subSlide = spring({ frame: frame - 14, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ opacity: op }}>
      {/* Screenshot layer with browser frame */}
      <AbsoluteFill style={{ padding: "50px 60px", display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "58%",
            height: "78%",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(204,0,0,0.35)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(204,0,0,0.15)",
            background: "#0B0B0D",
            position: "relative",
            transform: `translateY(${(1 - introOp) * 30}px)`,
          }}
        >
          {/* Browser bar */}
          <div
            style={{
              height: 32,
              background: "linear-gradient(180deg,#161618,#0E0E10)",
              borderBottom: "1px solid rgba(204,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 7,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#CC0000" }} />
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#3a3a3a" }} />
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#3a3a3a" }} />
            <div
              style={{
                marginLeft: 18,
                flex: 1,
                height: 18,
                background: "#08080A",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                fontSize: 9,
                color: "#6B6B73",
                letterSpacing: 2,
                fontFamily: "Inter",
              }}
            >
              korexintelligencesystems.com
            </div>
          </div>
          <div style={{ position: "absolute", inset: "32px 0 0 0", overflow: "hidden" }}>
            <Img
              src={staticFile(imgSrc)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
                transform: `scale(${scale}) translate(${px}px, ${py}px)`,
              }}
            />
          </div>
        </div>

        {/* Right-side copy panel */}
        <div style={{ flex: 1, paddingLeft: 50, color: "#EEEEEE" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: titleSlide,
              transform: `translateX(${(1 - titleSlide) * -30}px)`,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 14,
                letterSpacing: 6,
                color: "#CC0000",
                fontWeight: 800,
              }}
            >
              {index}
            </div>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,#CC0000,transparent)" }} />
          </div>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              margin: 0,
              opacity: titleSlide,
              transform: `translateY(${(1 - titleSlide) * 24}px)`,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              marginTop: 20,
              fontSize: 20,
              lineHeight: 1.5,
              color: "#A0A0A8",
              opacity: subSlide,
              transform: `translateY(${(1 - subSlide) * 18}px)`,
              maxWidth: 520,
            }}
          >
            {subtitle}
          </p>
          <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
            {bullets.map((b, i) => {
              const bulletOp = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 20 } });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: bulletOp,
                    transform: `translateX(${(1 - bulletOp) * -20}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "#CC0000",
                      boxShadow: "0 0 12px rgba(204,0,0,0.8)",
                    }}
                  />
                  <div style={{ fontSize: 17, color: "#DADADF", letterSpacing: 0.3 }}>{b}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ————————————————————————————————————————————
// Chapter 6 — Closing beat
// ————————————————————————————————————————————
const CloseBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const op = spring({ frame, fps, config: { damping: 20 } });
  const scale = interpolate(frame, [0, 60], [0.9, 1], { extrapolateRight: "clamp" });
  const outroOp = interpolate(frame, [durationInFrames - 40, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOp = spring({ frame: frame - 30, fps, config: { damping: 25 } });
  const tagOp = spring({ frame: frame - 90, fps, config: { damping: 25 } });

  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(op, outroOp),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: 12,
            color: "#CC0000",
            fontWeight: 800,
            marginBottom: 30,
          }}
        >
          KOREX INTELLIGENCE SYSTEMS
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -3,
            color: "#EEEEEE",
            lineHeight: 1,
            opacity: subOp,
          }}
        >
          Stop guessing.
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -3,
            color: "#CC0000",
            lineHeight: 1,
            marginTop: 8,
            opacity: subOp,
            textShadow: "0 0 40px rgba(204,0,0,0.5)",
          }}
        >
          Start winning.
        </div>
        <div
          style={{
            marginTop: 60,
            fontSize: 18,
            letterSpacing: 5,
            color: "#A0A0A8",
            opacity: tagOp,
          }}
        >
          korexintelligencesystems.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ————————————————————————————————————————————
// Root composition
// ————————————————————————————————————————————
export const DemoTour: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.95 + Math.sin(frame * 0.25) * 0.03;

  let cursor = 0;
  const seq = (dur: number) => {
    const from = cursor;
    cursor += dur;
    return { from, dur };
  };
  const s1 = seq(S1);
  const s2 = seq(S2);
  const s3 = seq(S3);
  const s4 = seq(S4);
  const s5 = seq(S5);
  const s6 = seq(S6);

  return (
    <AbsoluteFill style={{ background: "#060606", fontFamily: "Inter" }}>
      <Glow />
      <DottedGrid />

      <AbsoluteFill style={{ opacity: flicker }}>
        <Sequence from={s1.from} durationInFrames={s1.dur}>
          <ChapterFrame
            index="CHAPTER 01"
            title="Marketing shouldn't feel like guesswork."
            subtitle="Korex Intelligence Systems is the AI strategist built for founders, creators, and agencies who are tired of generic advice."
            imgSrc="shots/landing.png"
            bullets={["Strategies that move the needle", "Built for real operators", "Powered by proprietary intelligence"]}
            panDirection="in"
          />
        </Sequence>
        <Sequence from={s2.from} durationInFrames={s2.dur}>
          <ChapterFrame
            index="CHAPTER 02"
            title="More than a chatbot. A full intelligence system."
            subtitle="Upload analytics from Meta, TikTok, or Google. Korex extracts the winning patterns behind every high-performing campaign."
            imgSrc="shots/features.png"
            bullets={["Cross-platform analytics ingestion", "Winning-pattern extraction", "Platform-specific playbooks"]}
            panDirection="left"
          />
        </Sequence>
        <Sequence from={s3.from} durationInFrames={s3.dur}>
          <ChapterFrame
            index="CHAPTER 03"
            title="From upload to full strategy in under a minute."
            subtitle="Drop a screenshot. Answer a few questions. Get a complete 7 or 14-day content strategy — captions, visuals, campaign structures, and more."
            imgSrc="shots/demo.png"
            bullets={["7 or 14-day content plans", "Caption A/B variants", "CBO / ABO recommendations"]}
            panDirection="right"
          />
        </Sequence>
        <Sequence from={s4.from} durationInFrames={s4.dur}>
          <ChapterFrame
            index="CHAPTER 04"
            title="Strategies anchored to you. Never generic."
            subtitle="Every plan is anchored to your unique demographics and product differentiators. Korex learns from your top performers and gets sharper with every cycle."
            imgSrc="shots/about.png"
            bullets={["Anti-oversaturation directive", "Feedback loop from your best posts", "Continuously self-improving"]}
            panDirection="out"
          />
        </Sequence>
        <Sequence from={s5.from} durationInFrames={s5.dur}>
          <ChapterFrame
            index="CHAPTER 05"
            title="Start free. Scale to Pro or Agency."
            subtitle="Pro $49/mo · Agency $149/mo · Go annual and get 2 months free. Use code KOREX at checkout for 15% off your launch order."
            imgSrc="shots/pricing.png"
            bullets={["Unlimited strategies on Pro", "White-label on Agency", "KOREX code · 15% off"]}
            panDirection="in"
          />
        </Sequence>
        <Sequence from={s6.from} durationInFrames={s6.dur}>
          <CloseBeat />
        </Sequence>
      </AbsoluteFill>

      <Vignette />

      <Audio src={staticFile("voiceover.mp3")} />
    </AbsoluteFill>
  );
};
