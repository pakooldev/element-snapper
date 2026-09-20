import React from "react";
import {
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  DEFAULT_CAPTURE,
  ElementThumb,
  Icon,
  ModeControl,
  MODES,
  MONO,
  promptLines,
} from "./Outputs";

// Scene 3 of the promo: the same captured element, three different outputs.
// Runs on a local frame (mounted inside a <Sequence>).
export const OUTPUTS_SCENE_FRAMES = 420;

const CLICK_IMAGE = 112; // frame the cursor clicks "Copy Image"
const CLICK_PROMPT = 236; // frame the cursor clicks "Copy as Prompt"
const SLIDE = 14; // pill slide duration

// Stage geometry (px, stage-local) — the cursor path is derived from these.
const STAGE_W = 1120;
const STAGE_H = 780;
const PAD = 40;
const CTRL_W = 780;
const CTRL_X = PAD + (STAGE_W - 2 * PAD - CTRL_W) / 2;
const CTRL_Y = 60;
const CTRL_CY = CTRL_Y + 31; // control is 62px tall
const SEG = (CTRL_W - 10) / 3;
const segX = (i: number) => CTRL_X + 5 + SEG * (i + 0.5);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const GREEN = "#10b981";

const Toast: React.FC<{ text: string; color: string; t: number }> = ({
  text,
  color,
  t,
}) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: t, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 26,
        right: 26,
        bottom: 20,
        display: "flex",
        justifyContent: "center",
        opacity: interpolate(t, [0, 8], [0, 1], clamp),
        transform: `translateY(${(1 - s) * 24}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "12px 18px",
          fontSize: 18,
          fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <Icon id="check" size={20} color={color} stroke={2.5} />
        {text}
      </div>
    </div>
  );
};

const PanelHeader: React.FC<{
  icon: "folder" | "image" | "prompt";
  color: string;
  label: string;
}> = ({ icon, color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: 40 }}>
    <Icon id={icon} size={26} color={color} />
    <span style={{ fontSize: 22, fontWeight: 700 }}>{label}</span>
  </div>
);

export const DownloadView: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const drop = spring({ frame: t, fps, config: { damping: 13 } });
  const progress = interpolate(t, [16, 56], [0, 100], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const done = t >= 56;
  const pop = spring({ frame: t - 56, fps, config: { damping: 10 } });
  return (
    <>
      <PanelHeader icon="folder" color={GREEN} label="Downloads" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 22,
          padding: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          opacity: interpolate(t, [0, 8], [0, 1], clamp),
          transform: `translateY(${(1 - drop) * -40}px)`,
        }}
      >
        <ElementThumb w={120} h={84} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {DEFAULT_CAPTURE.file}
          </div>
          <div style={{ fontSize: 16, color: "#94a3b8", margin: "6px 0 12px" }}>
            {done
              ? `${DEFAULT_CAPTURE.size} · Saved to Downloads`
              : `Downloading… ${Math.round(progress)}%`}
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{ width: `${progress}%`, height: "100%", background: GREEN }}
            />
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: GREEN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${done ? pop : 0})`,
          }}
        >
          <Icon id="check" size={24} color="white" stroke={3} />
        </div>
      </div>
      {/* Older downloads, for folder context */}
      {[180, 130].map((w) => (
      <div key={w}
        style={{
          marginTop: 12,
          height: 60,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 18px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 32,
            borderRadius: 6,
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            width: w,
            height: 12,
            borderRadius: 6,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>
      ))}
      <Toast text="Screenshot saved to downloads" color={GREEN} t={t - 58} />
    </>
  );
};

export const CopyImageView: React.FC<{ t: number; color: string }> = ({ t, color }) => {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: t, fps, from: 0.7, to: 1, config: { damping: 11 } });
  const ring = interpolate(t, [0, 26], [0, 1], clamp);
  const badge = spring({ frame: t - 12, fps, config: { damping: 10 } });
  const hint = interpolate(t, [40, 52], [0, 1], clamp);
  const kbd: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 20,
    fontWeight: 700,
  };
  return (
    <>
      <PanelHeader icon="image" color={color} label="Clipboard" />
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: 22 }}
      >
        <div
          style={{
            position: "relative",
            transform: `scale(${pop})`,
            opacity: interpolate(t, [0, 6], [0, 1], clamp),
            borderRadius: 24,
            boxShadow: `0 0 0 ${ring * 34}px ${color}${
              ring < 1 ? "22" : "00"
            }`,
          }}
        >
          <ElementThumb w={300} h={204} />
          <div
            style={{
              position: "absolute",
              top: -14,
              right: -14,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${badge})`,
              boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
            }}
          >
            <Icon id="check" size={24} color="white" stroke={3} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          marginTop: 22,
          fontSize: 20,
          color: "#94a3b8",
          opacity: hint,
        }}
      >
        Paste anywhere
        <span style={kbd}>⌘</span>
        <span style={kbd}>V</span>
      </div>
      <Toast text="Copied to clipboard" color={color} t={t - 16} />
    </>
  );
};

// Section headers, "Key: value" pairs and plain lines get different tints.
const PromptLine: React.FC<{ line: string }> = ({ line }) => {
  const kv = line.match(/^(\s*[A-Za-z -]+): (.+)$/);
  if (kv) {
    return (
      <div>
        <span style={{ color: "#c4b5fd" }}>{line.slice(0, kv[1].length + 2)}</span>
        <span style={{ color: "#e2e8f0" }}>{kv[2]}</span>
      </div>
    );
  }
  const header = /^[A-Za-z ]+:$/.test(line);
  return (
    <div
      style={{
        color: header ? "#a855f7" : "#e2e8f0",
        fontWeight: header ? 700 : 400,
        minHeight: 19,
      }}
    >
      {line}
    </div>
  );
};

// Skips the "Role:" line and stops after font-size so the block fits the panel.
const PROMPT_SHOWN = promptLines(DEFAULT_CAPTURE)
  .filter((l) => !l.startsWith("Role:"))
  .slice(0, 13);

export const PromptView: React.FC<{ t: number; color: string }> = ({ t, color }) => {
  const visible = Math.max(0, Math.floor(t / 2.2) + 1);
  return (
    <>
      <PanelHeader icon="prompt" color={color} label="Clipboard · text" />
      <div
        style={{
          marginTop: 14,
          height: 288,
          boxSizing: "border-box",
          padding: "12px 18px",
          background: "rgba(2,6,23,0.65)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 12,
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: "19px",
          whiteSpace: "pre",
          overflow: "hidden",
          opacity: interpolate(t, [0, 6], [0, 1], clamp),
        }}
      >
        {PROMPT_SHOWN.slice(0, visible).map((l, i) => (
          <PromptLine key={i} line={l} />
        ))}
      </div>
      <Toast text="Copied element context to clipboard" color={color} t={t - 44} />
    </>
  );
};

const CAPTIONS = [
  "Saved straight to your Downloads folder.",
  "On your clipboard, ready to paste anywhere.",
  "Element context as text, for your AI coding tool.",
];

// The page element with the mode-colored hover highlight (left side of the scene).
export const SourcePage: React.FC<{ color: string; fill: string; label: string }> = ({
  color,
  fill,
  label,
}) => (
  <div
    style={{
      width: 380,
      height: 440,
      background: "#f8fafc",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        height: 32,
        background: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 14px",
      }}
    >
      {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
        <div
          key={c}
          style={{ width: 10, height: 10, borderRadius: "50%", background: c }}
        />
      ))}
    </div>
    <div style={{ padding: "28px 34px" }}>
      <div
        style={{ width: "50%", height: 24, background: "#cbd5e1", borderRadius: 6 }}
      />
      {["100%", "85%"].map((w) => (
        <div
          key={w}
          style={{
            width: w,
            height: 14,
            background: "#e2e8f0",
            borderRadius: 4,
            marginTop: 12,
          }}
        />
      ))}
      <div style={{ position: "relative", marginTop: 38 }}>
        <div
          style={{
            height: 190,
            boxSizing: "border-box",
            background: "#3b82f6",
            borderRadius: 14,
            padding: 22,
            boxShadow: "0 16px 30px rgba(59,130,246,0.25)",
          }}
        >
          <div
            style={{
              width: "40%",
              height: 20,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 6,
              marginBottom: 18,
            }}
          />
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                height: 44,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 8,
                marginBottom: 12,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            inset: -6,
            border: `4px dashed ${color}`,
            borderRadius: 20,
            background: fill,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: -38,
              right: 12,
              background: color,
              color: "white",
              padding: "5px 12px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Right side: the "what you get" panel. Views are stacked inside <ResultLayer>s.
export const ResultPanel: React.FC<{
  border: string;
  glow: string;
  children: React.ReactNode;
}> = ({ border, glow, children }) => (
  <div
    style={{
      position: "relative",
      width: 540,
      height: 440,
      boxSizing: "border-box",
      background: "rgba(15,23,42,0.75)",
      border: `1px solid ${border}`,
      borderRadius: 20,
      boxShadow: `0 0 0 6px ${glow}`,
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);

export const ResultLayer: React.FC<{
  opacity?: number;
  children: React.ReactNode;
}> = ({ opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      padding: 26,
      opacity,
      overflow: "hidden",
      borderRadius: 20,
    }}
  >
    {children}
  </div>
);

export const OutputsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Pill position 0..2 (Download → Copy Image → Copy as Prompt)
  const p = interpolate(
    frame,
    [CLICK_IMAGE + 2, CLICK_IMAGE + 2 + SLIDE, CLICK_PROMPT + 2, CLICK_PROMPT + 2 + SLIDE],
    [0, 1, 1, 2],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const vis = (i: number) => Math.max(0, 1 - Math.abs(p - i));
  const colors = MODES.map((m) => m.color);
  const color = interpolateColors(p, [0, 1, 2], colors);
  const tint = (a: string) =>
    interpolateColors(p, [0, 1, 2], [
      `rgba(16,185,129,${a})`,
      `rgba(59,130,246,${a})`,
      `rgba(168,85,247,${a})`,
    ]);

  // Scene enter / exit
  const enterY = spring({ frame, fps, from: 200, to: 0, config: { damping: 14 } });
  const opacity = interpolate(
    frame,
    [0, 23, OUTPUTS_SCENE_FRAMES - 30, OUTPUTS_SCENE_FRAMES],
    [0, 1, 1, 0],
    clamp,
  );

  // Cursor: enters, clicks Copy Image, then Copy as Prompt, then leaves.
  const cy = CTRL_CY;
  const cursorX = interpolate(
    frame,
    [58, 100, 190, 228],
    [segX(1) + 380, segX(1), segX(1), segX(2)],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const cursorY = interpolate(
    frame,
    [58, 100, 190, 228, 262, 290],
    [cy + 330, cy + 6, cy + 6, cy + 6, cy + 6, cy + 200],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const cursorOpacity = interpolate(frame, [58, 70, 262, 290], [0, 1, 1, 0], clamp);
  const press = (c: number) =>
    interpolate(frame, [c, c + 3, c + 9], [1, 0.82, 1], clamp);
  const cursorScale = press(CLICK_IMAGE) * press(CLICK_PROMPT);

  const BODY_TOP = CTRL_Y + 62 + 44;
  return (
    <div
      style={{
        position: "absolute",
        left: (width - STAGE_W) / 2,
        top: (height - STAGE_H) / 2 - 20,
        width: STAGE_W,
        height: STAGE_H,
        boxSizing: "border-box",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 28,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        opacity,
        transform: `translateY(${enterY}px)`,
        zIndex: 4,
      }}
    >
      {/* Output control */}
      <div
        style={{
          position: "absolute",
          top: 34,
          width: "100%",
          textAlign: "center",
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
          color: "#94a3b8",
        }}
      >
        Output
      </div>
      <div style={{ position: "absolute", left: CTRL_X, top: CTRL_Y }}>
        <ModeControl pos={p} width={CTRL_W} fontSize={20} padY={14} />
      </div>

      {/* Source → result */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: BODY_TOP,
          width: STAGE_W - 2 * PAD,
          height: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* The page element, with the mode-colored hover highlight */}
        <SourcePage
          color={color}
          fill={tint("0.12")}
          label={p > 1.5 ? "Copy as Prompt" : "480 × 360"}
        />

        <div style={{ width: 40, display: "flex", justifyContent: "center" }}>
          <Icon id="arrow" size={40} color={color} />
        </div>

        {/* What you get */}
        <ResultPanel border={tint("0.45")} glow={tint("0.08")}>
          {[
            <DownloadView key="d" t={frame - 12} />,
            <CopyImageView key="i" t={frame - (CLICK_IMAGE + 8)} color={colors[1]} />,
            <PromptView key="p" t={frame - (CLICK_PROMPT + 8)} color={colors[2]} />,
          ].map((view, i) => (
            <ResultLayer key={i} opacity={vis(i)}>
              {view}
            </ResultLayer>
          ))}
        </ResultPanel>
      </div>

      {/* Caption */}
      {MODES.map((m, i) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: BODY_TOP + 460 + 24,
            textAlign: "center",
            opacity: vis(i),
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 800, color: m.color }}>
            {m.label}
          </div>
          <div style={{ fontSize: 24, color: "#94a3b8", marginTop: 6 }}>
            {CAPTIONS[i]}
          </div>
        </div>
      ))}

      {/* Cursor (tip at the click point) */}
      <div
        style={{
          position: "absolute",
          left: cursorX - 8,
          top: cursorY - 8,
          width: 50,
          height: 50,
          zIndex: 10,
          opacity: cursorOpacity,
          transform: `scale(${cursorScale})`,
          transformOrigin: "8.3px 8.3px",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.6))" }}
        >
          <path d="M4 4L11 22L14 15L21 12L4 4Z" fill="black" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};
