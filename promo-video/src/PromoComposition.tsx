import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
  Sequence,
} from "remotion";
import React from "react";
import { OutputsScene, OUTPUTS_SCENE_FRAMES } from "./OutputsScene";

const SCENE3_START = 457;
export const TOTAL_FRAMES = SCENE3_START + OUTPUTS_SCENE_FRAMES;

export const PromoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // -----------------------------------------
  // SCENE 1: Intro & Click (Frames 0 - 140)
  // -----------------------------------------
  // Smoothly oscillate the background for a seamless loop over the full length
  const bgGradient = interpolate(frame, [0, TOTAL_FRAMES / 2, TOTAL_FRAMES], [0, 200, 0], {
    extrapolateRight: "clamp",
  });

  // Logo animation "gimmick"
  const logoScale = spring({ frame: frame - 15, fps, config: { damping: 12 } });
  const logoRotate = interpolate(frame, [15, 67], [-90, 0], {
    easing: Easing.out(Easing.exp),
    extrapolateRight: "clamp",
  });
  const logoDash = interpolate(frame, [15, 75], [100, 0], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [22, 45, 75, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [22, 45, 75, 90], [30, 0, 0, -30], {
    extrapolateRight: "clamp",
  });

  // Box UI
  const scaleUI = spring({ frame: frame - 90, fps, config: { damping: 12 } });
  const uiOpacity = interpolate(frame, [180, 202], [1, 0], {
    extrapolateRight: "clamp",
  });

  // Center positions
  const targetCursorX = width / 2;
  const targetCursorY = height * 0.45 + 80; // Exactly box top (45%) + padding (40) + half button (40)

  const cursorX = interpolate(
    frame,
    [120, 155],
    [targetCursorX + 400, targetCursorX],
    { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" },
  );
  const cursorY = interpolate(
    frame,
    [120, 155],
    [targetCursorY + 300, targetCursorY],
    { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" },
  );

  const cursorScale = spring({
    frame: frame - 160,
    fps,
    from: 1,
    to: 0.8,
    config: { damping: 14 },
  });
  const clickReleaseScale = spring({
    frame: frame - 166,
    fps,
    from: 0,
    to: 0.2,
    config: { damping: 14 },
  });
  const finalCursorScale =
    frame < 166 ? cursorScale : cursorScale + clickReleaseScale;

  // Button click feedback
  const isClicked = frame >= 160 && frame <= 166;

  // -----------------------------------------
  // SCENE 2: The Webpage & Selection (Frames 130 - 300)
  // -----------------------------------------
  const pageScale = spring({
    frame: frame - 195,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15 },
  });
  const pageOpacity = interpolate(frame, [195, 217, 435, 457], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pageY = spring({ frame: frame - 195, fps, from: 100, to: 0 });

  // Scroll the webpage faster (shifted earlier)
  const pageScrollY = interpolate(frame, [220, 255], [0, -240], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // The snapping bounding box
  const highlightOpacity = interpolate(frame, [287, 302], [0, 1], {
    extrapolateRight: "clamp",
  });
  const highlightDash = interpolate(frame, [287, 355], [0, 100], {
    extrapolateRight: "clamp",
  });

  // Flash effect for the snapshot
  const flashOpacity = interpolate(frame, [340, 343, 362], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Popup Download Notification
  const notifY = spring({ frame: frame - 355, fps, from: -100, to: 20 });
  const notifOpacity = interpolate(frame, [355, 362, 435, 457], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 2 Cursor (Crosshair snapping element)
  const s2CursorX = interpolate(
    frame,
    [255, 285],
    [width / 2 + 200, width / 2],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    },
  );
  const s2CursorY = interpolate(
    frame,
    [255, 285],
    [height / 2 + 300, height / 2 - 50],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    },
  );

  const s2CursorScale = spring({
    frame: frame - 287,
    fps,
    from: 1,
    to: 0.85,
    config: { damping: 14 },
  });
  const s2ClickReleaseScale = spring({
    frame: frame - 295,
    fps,
    from: 0,
    to: 0.15,
    config: { damping: 14 },
  });
  const s2FinalCursorScale =
    frame < 295 ? s2CursorScale : s2CursorScale + s2ClickReleaseScale;

  const s2CursorOpacity = interpolate(
    frame,
    [255, 265, 312, 325],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // -----------------------------------------
  // SCENE 3: Three outputs (see OutputsScene.tsx)
  // -----------------------------------------
  const scene3Base = SCENE3_START;


  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, sans-serif",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Dramatic glowing background */}
      <div
        style={{
          position: "absolute",
          top: "-500px",
          left: `calc(50% - 800px + ${bgGradient}px)`,
          width: "1600px",
          height: "1600px",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(15,23,42,0) 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      {/* ------- SCENE 1: INTRO ------- */}
      <Sequence from={0} durationInFrames={210}>
        <div
          style={{
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            position: "absolute",
            top: "20%",
            width: "100%",
          }}
        >
          {/* Animated Logo Gimmick */}
          <div
            style={{
              transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
              marginBottom: "24px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "120px",
              height: "120px",
              background: "rgba(30, 41, 59, 0.5)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.3)",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="3"
                width="22"
                height="22"
                rx="4"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeDashoffset={logoDash}
              />
              <path
                d="M3 9V7C3 4.79086 4.79086 3 7 3H9"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={20}
                strokeDashoffset={logoDash}
              />
              <path
                d="M25 9V7C25 4.79086 23.2091 3 21 3H19"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={20}
                strokeDashoffset={logoDash}
              />
              <path
                d="M3 19V21C3 23.2091 4.79086 25 7 25H9"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={20}
                strokeDashoffset={logoDash}
              />
              <path
                d="M25 19V21C25 23.2091 23.2091 25 21 25H19"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={20}
                strokeDashoffset={logoDash}
              />
              <circle
                cx="14"
                cy="14"
                r="5"
                fill="#3b82f6"
                style={{
                  opacity: interpolate(frame, [45, 60], [0, 1], {
                    extrapolateLeft: "clamp",
                  }),
                  transform: `scale(${interpolate(frame, [45, 67], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.elastic(1),
                  })})`,
                  transformOrigin: "center",
                }}
              />
              <circle
                cx="14"
                cy="14"
                r="2"
                fill="#0f172a"
                style={{
                  opacity: interpolate(frame, [52, 67], [0, 1], {
                    extrapolateLeft: "clamp",
                  }),
                }}
              />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "80px",
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #60a5fa, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Element Snapper
          </h1>
          <p
            style={{
              fontSize: "32px",
              color: "#94a3b8",
              marginTop: "16px",
              fontWeight: 500,
            }}
          >
            Pixel-Perfect Captures.
          </p>
        </div>

        {/* Mock UI Box that springs in */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "calc(50% - 240px)",
            transform: `scale(${scaleUI})`,
            opacity: uiOpacity,
            background: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "40px",
            width: "480px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "80px",
              background: isClicked
                ? "#2563eb"
                : "linear-gradient(135deg, #3b82f6, #2563eb)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 600,
              boxShadow: "0 8px 20px -6px rgba(59, 130, 246, 0.4)",
              transform: isClicked ? "scale(0.96)" : "scale(1)",
              transition: "all 0.1s",
            }}
          >
            Select Element
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "20px",
              width: "100%",
            }}
          >
            {["Area", "Screen", "Page"].map((label) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  height: "60px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Fake Vector Cursor (Disappears after clicking) */}
        <div
          style={{
            position: "absolute",
            left: `${cursorX - 8}px`, // Offset by cursor tip inside SVG
            top: `${cursorY - 8}px`,
            width: "50px",
            height: "50px",
            zIndex: 10,
            transform: `scale(${finalCursorScale})`,
            transformOrigin: "8.3px 8.3px", // Origin at the tip of the cursor
            opacity: uiOpacity, // Fade out along with UI
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="white"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.6))" }}
          >
            <path
              d="M4 4L11 22L14 15L21 12L4 4Z"
              fill="black"
              strokeWidth="1"
            />
          </svg>
        </div>
      </Sequence>

      {/* ------- SCENE 2: THE WEBPAGE ------- */}
      <Sequence from={195} durationInFrames={255}>
        <div
          style={{
            position: "absolute",
            left: "calc(50% - 700px)",
            top: "10%",
            width: "1400px",
            height: "80%",
            background: "#f8fafc",
            borderRadius: "16px",
            overflow: "hidden",
            opacity: pageOpacity,
            transform: `scale(${pageScale}) translateY(${pageY}px)`,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            zIndex: 3,
          }}
        >
          {/* Browser Top Bar */}
          <div
            style={{
              height: "40px",
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: "8px",
              borderBottom: "1px solid #cbd5e1",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#ef4444",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            ></div>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10b981",
              }}
            ></div>
            <div
              style={{
                marginLeft: "16px",
                background: "white",
                padding: "4px 160px",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              example.com
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div style={{ transform: `translateY(${pageScrollY}px)` }}>
            {/* Nav Content */}
            <div
              style={{
                height: "100px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 40px",
              }}
            >
              <div
                style={{
                  width: "200px",
                  height: "40px",
                  background: "#cbd5e1",
                  borderRadius: "8px",
                }}
              ></div>
            </div>

            {/* Main Content Area */}
            <div
              style={{
                padding: "60px 40px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "900px" }}>
                <div
                  style={{
                    width: "80%",
                    height: "60px",
                    background: "#cbd5e1",
                    borderRadius: "8px",
                    marginBottom: "30px",
                    marginLeft: "inherit",
                  }}
                ></div>
                <div
                  style={{
                    width: "100%",
                    height: "20px",
                    background: "#e2e8f0",
                    borderRadius: "4px",
                    marginBottom: "16px",
                  }}
                ></div>
                <div
                  style={{
                    width: "95%",
                    height: "20px",
                    background: "#e2e8f0",
                    borderRadius: "4px",
                    marginBottom: "16px",
                  }}
                ></div>
                <div
                  style={{
                    width: "90%",
                    height: "20px",
                    background: "#e2e8f0",
                    borderRadius: "4px",
                    marginBottom: "50px",
                  }}
                ></div>

                {/* TARGET ELEMENT TO CAPTURE */}
                <div
                  style={{
                    width: "100%",
                    height:
                      "600px" /* Big element that requires scrolling to see all of it! */,
                    background: "#3b82f6" /* Blue card */,
                    borderRadius: "16px",
                    padding: "40px",
                    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
                    position: "relative",
                  }}
                >
                  {/* The Element Snapper Bounding Box Indicator */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-4px",
                      left: "-4px",
                      right: "-4px",
                      bottom: "-4px",
                      border: "4px dashed #10b981",
                      borderRadius: "20px",
                      background: "rgba(16, 185, 129, 0.1)",
                      opacity: highlightOpacity,
                      strokeDasharray: "20, 10",
                      strokeDashoffset: highlightDash,
                    }}
                  >
                    {/* Little dimensions badge */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-36px",
                        right: "12px",
                        background: "#10b981",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontWeight: 600,
                        fontSize: "14px",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                      }}
                    >
                      920 × 600
                    </div>
                  </div>

                  <div
                    style={{
                      width: "40%",
                      height: "40px",
                      background: "rgba(255,255,255,0.5)",
                      borderRadius: "8px",
                      marginBottom: "30px",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "100%",
                      height: "120px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      marginBottom: "20px",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "100%",
                      height: "120px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      marginBottom: "20px",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Effect over entire screen */}
        <AbsoluteFill
          style={{
            backgroundColor: "white",
            opacity: flashOpacity,
            zIndex: 10,
          }}
        />

        {/* Download Success Notification */}
        <div
          style={{
            position: "absolute",
            top: `${notifY}px`,
            right: "20px",
            background: "rgba(30, 41, 59, 0.9)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "20px 30px",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            opacity: notifOpacity,
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#10b981",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
              }}
            >
              Screenshot Saved
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#94a3b8",
                marginTop: "4px",
              }}
            >
              element_capture.png
            </p>
          </div>
        </div>

        {/* Scene 2 Crosshair Cursor */}
        <div
          style={{
            position: "absolute",
            left: `${s2CursorX - 12}px`,
            top: `${s2CursorY - 12}px`,
            width: "24px",
            height: "24px",
            zIndex: 100,
            transform: `scale(${s2FinalCursorScale})`,
            transformOrigin: "12px 12px",
            opacity: s2CursorOpacity,
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="black"
            strokeWidth="3"
            style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))" }}
          >
            <path d="M12 2V22M2 12H22" strokeLinecap="round" />
          </svg>
        </div>
      </Sequence>

      {/* ------- SCENE 3: THREE OUTPUTS (Download / Copy Image / Copy as Prompt) ------- */}
      <Sequence from={scene3Base} durationInFrames={OUTPUTS_SCENE_FRAMES}>
        <OutputsScene />
      </Sequence>
    </AbsoluteFill>
  );
};
