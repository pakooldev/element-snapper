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

export const PromoComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // -----------------------------------------
  // SCENE 1: Intro & Click (Frames 0 - 140)
  // -----------------------------------------
  // Smoothly oscillate the background for a seamless 727-frame loop
  const bgGradient = interpolate(frame, [0, 363, 727], [0, 200, 0], {
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

  // Scroll the webpage faster
  const pageScrollY = interpolate(frame, [255, 290], [0, -240], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // The snapping bounding box (appears at frame 215)
  const highlightOpacity = interpolate(frame, [322, 337], [0, 1], {
    extrapolateRight: "clamp",
  });
  const highlightDash = interpolate(frame, [322, 390], [0, 100], {
    extrapolateRight: "clamp",
  });

  // Flash effect for the snapshot
  const flashOpacity = interpolate(frame, [375, 378, 397], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Popup Download Notification
  const notifY = spring({ frame: frame - 390, fps, from: -100, to: 20 });
  const notifOpacity = interpolate(frame, [390, 397, 435, 457], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // -----------------------------------------
  // SCENE 3: Chat Message (Frames 457 - 727)
  // -----------------------------------------
  const scene3Base = 457;

  const chatY = spring({
    frame: frame - scene3Base,
    fps,
    from: 200,
    to: 0,
    config: { damping: 14 },
  });

  const chatOpacity = interpolate(
    frame,
    [scene3Base, scene3Base + 23, scene3Base + 240, scene3Base + 270],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Scene 3 Cursor
  const s3CursorX = interpolate(
    frame - scene3Base,
    [10, 50],
    [width / 2 + 400, width / 2],
    { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" },
  );
  // Approximate top of chat input box relative to the Composition root
  const s3CursorY = interpolate(
    frame - scene3Base,
    [10, 50],
    [height * 0.15 + 300, height * 0.15 + 500],
    { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" },
  );

  const s3CursorScale = spring({
    frame: frame - scene3Base - 65,
    fps,
    from: 1,
    to: 0.85,
    config: { damping: 14 },
  });
  const s3ClickReleaseScale = spring({
    frame: frame - scene3Base - 75,
    fps,
    from: 0,
    to: 0.15,
    config: { damping: 14 },
  });
  const s3FinalCursorScale =
    frame - scene3Base < 75
      ? s3CursorScale
      : s3CursorScale + s3ClickReleaseScale;
  const isInputFocused = frame - scene3Base >= 65;

  // Cmd+V Keystroke animation
  const cmdVScale = spring({
    frame: frame - scene3Base - 100,
    fps,
    from: 0.5,
    to: 1,
    config: { damping: 12 },
  });
  const cmdVOpacity = interpolate(
    frame - scene3Base,
    [100, 105, 135, 140],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Enter Keystroke animation
  const enterScale = spring({
    frame: frame - scene3Base - 160,
    fps,
    from: 0.5,
    to: 1,
    config: { damping: 12 },
  });
  const enterOpacity = interpolate(
    frame - scene3Base,
    [160, 165, 185, 190],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const isPasted = frame - scene3Base >= 100;
  const pasteScale = spring({
    frame: frame - scene3Base - 100,
    fps,
    from: 0,
    to: 1,
    config: { damping: 14 },
  });

  const isSent = frame - scene3Base >= 160;

  // Sending the image to the chat history
  const sendSlideY = spring({
    frame: frame - scene3Base - 160,
    fps,
    from: 20,
    to: 0,
    config: { damping: 14 },
  });

  const sentMessageOpacity = spring({
    frame: frame - scene3Base - 160,
    fps,
    from: 0,
    to: 1,
    config: { damping: 14 },
  });

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
            <div
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
              Screen Shot
            </div>
            <div
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
              Full Page
            </div>
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
      </Sequence>

      {/* ------- SCENE 3: CHAT MESSAGE (SLACK / DISCORD CLONE) ------- */}
      <Sequence from={scene3Base} durationInFrames={270}>
        <div
          style={{
            position: "absolute",
            left: "calc(50% - 400px)",
            top: "15%",
            width: "800px",
            height: "600px",
            background: "#1e293b",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            opacity: chatOpacity,
            transform: `translateY(${chatY}px)`,
            fontFamily: "Inter, sans-serif",
            overflow: "hidden",
            zIndex: 4,
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              height: "64px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              background: "#0f172a",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>
              # design-feedback
            </div>
          </div>

          {/* Chat History */}
          <div
            style={{
              flex: 1,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "24px",
            }}
          >
            {/* Existing Dummy Message */}
            <div style={{ display: "flex", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  background: "#475569",
                }}
              ></div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "white" }}>Alice</span>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Today at 10:42 AM
                  </span>
                </div>
                <div style={{ color: "#cbd5e1" }}>
                  Can someone share the latest snapshot of the new hero section?
                </div>
              </div>
            </div>

            {/* Sent Snapshot Message (Appears when sendProgress hits) */}
            {isSent && (
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  opacity: sentMessageOpacity,
                  transform: `translateY(${sendSlideY}px)`,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    background: "#3b82f6",
                  }}
                ></div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "white" }}>You</span>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Just now
                    </span>
                  </div>
                  {/* The pasted element screenshot rendered nicely */}
                  <div
                    style={{
                      width: "360px",
                      height: "180px",
                      background: "#cbd5e1",
                      borderRadius: "8px",
                      marginTop: "8px",
                      padding: "12px",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {/* Miniature version of the captured blue element */}
                    <div
                      style={{
                        width: "100%",
                        flex: 1,
                        background: "#3b82f6",
                        borderRadius: "6px",
                        position: "relative",
                        padding: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "30%",
                          height: "8px",
                          background: "rgba(255,255,255,0.5)",
                          borderRadius: "2px",
                          marginBottom: "6px",
                        }}
                      />
                      <div
                        style={{
                          width: "100%",
                          height: "24px",
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: "2px",
                          marginBottom: "4px",
                        }}
                      />
                      <div
                        style={{
                          width: "100%",
                          height: "24px",
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: "2px",
                          marginBottom: "4px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Box */}
          <div style={{ padding: "0 24px 24px 24px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                border: isInputFocused
                  ? "1px solid rgba(59, 130, 246, 0.8)"
                  : "1px solid rgba(255,255,255,0.1)",
                boxShadow: isInputFocused
                  ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                  : "none",
                borderRadius: "8px",
                minHeight: "56px",
                padding: "12px 16px",
                position: "relative",
                transition: "all 0.2s ease",
              }}
            >
              {frame - scene3Base < 100 ? (
                <div
                  style={{
                    color: "#94a3b8",
                  }}
                >
                  Message #design-feedback
                </div>
              ) : null}

              {/* The image being pasted into the input */}
              {isPasted && !isSent && (
                <div
                  style={{
                    position: "absolute",
                    left: "16px",
                    top: "12px",
                    transform: `scale(${pasteScale})`,
                    transformOrigin: "left top",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: "rgba(255,255,255,0.1)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <div
                      style={{
                        width: "60px",
                        height: "40px",
                        background: "#3b82f6",
                        borderRadius: "4px",
                      }}
                    />
                    <div style={{ color: "white", fontWeight: 500 }}>
                      element_capture.png
                    </div>
                  </div>
                </div>
              )}

              {/* Cmd+V Floating Keystroke Hint */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${cmdVScale})`,
                  opacity: cmdVOpacity,
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "18px",
                  letterSpacing: "0.05em",
                  zIndex: 10,
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  ⌘
                </div>
                <span>+</span>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  V
                </div>
              </div>

              {/* Enter Floating Keystroke Hint */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${enterScale})`,
                  opacity: enterOpacity,
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "18px",
                  letterSpacing: "0.05em",
                  zIndex: 10,
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  ↵
                </div>
                <span>Enter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scene 3 Fake Vector Cursor */}
        <div
          style={{
            position: "absolute",
            left: `${s3CursorX - 8}px`,
            top: `${s3CursorY - 8}px`,
            width: "50px",
            height: "50px",
            zIndex: 10,
            transform: `scale(${s3FinalCursorScale})`,
            transformOrigin: "8.3px 8.3px",
            opacity: interpolate(frame - scene3Base, [100, 115], [1, 0], {
              extrapolateRight: "clamp",
            }),
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
    </AbsoluteFill>
  );
};
