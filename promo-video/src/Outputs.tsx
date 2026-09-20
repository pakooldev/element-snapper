import React from "react";

// Shared building blocks for the three v1.5.0 output modes. Colors mirror the
// extension's hover highlights (content/utils.js): green / blue / purple.
export const MODES = [
  { id: "download", label: "Download", color: "#10b981" },
  { id: "image", label: "Copy Image", color: "#3b82f6" },
  { id: "prompt", label: "Copy as Prompt", color: "#a855f7" },
] as const;
export type ModeId = (typeof MODES)[number]["id"];
export const modeOf = (id: ModeId) => MODES.find((m) => m.id === id)!;

export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export type Capture = {
  file: string;
  size: string;
  dims: string;
  selector: string;
};
export const DEFAULT_CAPTURE: Capture = {
  file: "element_capture.png",
  size: "184 KB",
  dims: "480x360",
  selector: "main > div.hero-card",
};

// Same fields, same order as buildElementPromptText() in content/utils.js.
export const promptLines = (c: Capture): string[] => [
  "Attached browser context from https://example.com/",
  "",
  "Selected element:",
  "div",
  "Role: div",
  `Selector: ${c.selector}`,
  `Dimensions: ${c.dims}`,
  "",
  "Text content:",
  "Ship faster with pixel-perfect captures",
  "",
  "Computed styles:",
  "  display: flex",
  "  font-size: 16px",
  "  color: rgb(15, 23, 42)",
  "  background-color: rgb(255, 255, 255)",
];

const ICONS = {
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  image: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  prompt: (
    <>
      <path d="M4 17l6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export const Icon: React.FC<{
  id: keyof typeof ICONS;
  size?: number;
  color?: string;
  stroke?: number;
}> = ({ id, size = 20, color = "currentColor", stroke = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {ICONS[id]}
  </svg>
);

// Miniature of the captured blue element, used as the "image" in every output.
export const ElementThumb: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const pad = Math.max(4, Math.round(w / 14));
  const bar = (width: string, height: number, alpha: number) => (
    <div
      style={{
        width,
        height,
        background: `rgba(255,255,255,${alpha})`,
        borderRadius: Math.max(2, height / 4),
      }}
    />
  );
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "#cbd5e1",
        borderRadius: Math.round(w / 12),
        padding: pad,
        boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#3b82f6",
          borderRadius: Math.round(w / 16),
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: Math.round(h / 14),
        }}
      >
        {bar("38%", Math.round(h / 12), 0.55)}
        {bar("100%", Math.round(h / 5), 0.22)}
        {bar("100%", Math.round(h / 5), 0.22)}
      </div>
    </div>
  );
};

// The popup / panel "Output" segmented control. `pos` is fractional (0..2) so
// the video can slide the pill between options; screenshots pass an integer.
export const ModeControl: React.FC<{
  pos: number;
  width: number;
  fontSize?: number;
  padY?: number;
}> = ({ pos, width, fontSize = 11.5, padY = 8 }) => {
  const seg = (width - 10) / 3; // 2×border + 2×padding
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width,
        boxSizing: "border-box",
        background: "#1e293b",
        padding: 4,
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4 + pos * seg,
          width: seg,
          background: "#3b82f6",
          borderRadius: 4,
        }}
      />
      {MODES.map((m, i) => {
        const on = Math.abs(pos - i) < 0.5;
        return (
          <div
            key={m.id}
            style={{
              flex: 1,
              position: "relative",
              textAlign: "center",
              padding: `${padY}px 2px`,
              fontSize,
              lineHeight: 1.2,
              fontWeight: on ? 500 : 400,
              color: on ? "white" : "#94a3b8",
              whiteSpace: "nowrap",
            }}
          >
            {m.label}
          </div>
        );
      })}
    </div>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 5,
      padding: "2px 7px",
      fontSize: 12,
      fontWeight: 600,
      color: "#e2e8f0",
    }}
  >
    {children}
  </span>
);

// Compact "what you get" card for the store screenshots.
export const OutputCard: React.FC<{ id: ModeId; capture: Capture }> = ({
  id,
  capture,
}) => {
  const m = modeOf(id);
  const shown = [0, 2, 3, 5, 6].map((i) => promptLines(capture)[i]);
  return (
    <div
      style={{
        height: 168,
        boxSizing: "border-box",
        background: "#1e293b",
        border: `1px solid ${m.color}66`,
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 0 4px ${m.color}14`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: `${m.color}26`,
            color: m.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon id={id} size={18} />
        </div>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{m.label}</span>
      </div>

      {id === "prompt" ? (
        <div
          style={{
            flex: 1,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: 10,
            padding: "8px 12px",
            fontFamily: MONO,
            fontSize: 11,
            lineHeight: "15px",
            color: "#cbd5e1",
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          {shown.join("\n")}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
          <ElementThumb w={92} h={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {id === "download" ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {capture.file}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  {capture.size} · Saved to Downloads
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  Copied to clipboard
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#94a3b8",
                    marginTop: 6,
                  }}
                >
                  Paste anywhere <Kbd>⌘</Kbd>
                  <Kbd>V</Kbd>
                </div>
              </>
            )}
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: m.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon id="check" size={16} color="white" stroke={3} />
          </div>
        </div>
      )}
    </div>
  );
};
