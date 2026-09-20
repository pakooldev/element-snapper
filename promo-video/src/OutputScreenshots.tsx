import React from "react";
import { AbsoluteFill } from "remotion";
import { Icon, ModeControl, ModeId, modeOf, MODES } from "./Outputs";
import {
  CopyImageView,
  DownloadView,
  PromptView,
  ResultLayer,
  ResultPanel,
  SourcePage,
} from "./OutputsScene";

// One store screenshot per output mode: the video's scene 3, frozen on the
// finished state of a single mode. `t` is far past every animation so the
// shared views render fully settled.
const SETTLED = 999;
const SCALE = 1.1;

const SHOTS: Record<
  ModeId,
  { title: string; subtitle: string; label: string; view: (color: string) => React.ReactNode }
> = {
  download: {
    title: "Save it as a file.",
    subtitle: "Download saves a PNG or JPG straight to your Downloads folder.",
    label: "480 × 360",
    view: () => <DownloadView t={SETTLED} />,
  },
  image: {
    title: "Copy it as an image.",
    subtitle: "Copy Image puts the capture on your clipboard, ready to paste anywhere.",
    label: "480 × 360",
    view: (color) => <CopyImageView t={SETTLED} color={color} />,
  },
  prompt: {
    title: "Copy it as a prompt.",
    subtitle: "Copy as Prompt sends the element's context as text to your AI coding tool.",
    label: "Copy as Prompt",
    view: (color) => <PromptView t={SETTLED} color={color} />,
  },
};

const OutputShot: React.FC<{ id: ModeId }> = ({ id }) => {
  const { color } = modeOf(id);
  const shot = SHOTS[id];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        fontFamily: "Inter, sans-serif",
        color: "white",
        overflow: "hidden",
        alignItems: "center",
      }}
    >
      {/* Background glow, tinted by the mode so the three shots read as different */}
      <div
        style={{
          position: "absolute",
          top: "-400px",
          left: "calc(50% - 800px)",
          width: "1600px",
          height: "1600px",
          background: `radial-gradient(circle, ${color}33 0%, rgba(15,23,42,0) 70%)`,
          borderRadius: "50%",
        }}
      />

      <div style={{ marginTop: "48px", textAlign: "center", position: "relative" }}>
        <h1
          style={{
            fontSize: "54px",
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #ffffff, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          {shot.title}
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "#64748b",
            margin: "12px 0 0",
            fontWeight: 500,
          }}
        >
          {shot.subtitle}
        </p>
      </div>

      {/* Output control */}
      <div style={{ marginTop: "26px", position: "relative" }}>
        <div
          style={{
            textAlign: "center",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: "8px",
          }}
        >
          Output
        </div>
        <ModeControl
          pos={MODES.findIndex((m) => m.id === id)}
          width={600}
          fontSize={17}
          padY={11}
        />
      </div>

      {/* Page element → result */}
      <div
        style={{
          marginTop: "26px",
          height: 440 * SCALE,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `scale(${SCALE})`,
            transformOrigin: "top center",
          }}
        >
          <SourcePage color={color} fill={`${color}1f`} label={shot.label} />
          <div style={{ width: 40, display: "flex", justifyContent: "center" }}>
            <Icon id="arrow" size={40} color={color} />
          </div>
          <ResultPanel border={`${color}73`} glow={`${color}14`}>
            <ResultLayer>{shot.view(color)}</ResultLayer>
          </ResultPanel>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ScreenshotDownload: React.FC = () => <OutputShot id="download" />;
export const ScreenshotCopyImage: React.FC = () => <OutputShot id="image" />;
export const ScreenshotCopyPrompt: React.FC = () => <OutputShot id="prompt" />;
