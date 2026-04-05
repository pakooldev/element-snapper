import React from "react";
import { AbsoluteFill } from "remotion";

// Wrapper for all screenshots to maintain consistent layout
const ScreenshotLayout: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        fontFamily: "Inter, sans-serif",
        color: "white",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-400px",
          left: "calc(50% - 800px)",
          width: "1600px",
          height: "1600px",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(15,23,42,0) 70%)",
          borderRadius: "50%",
          zIndex: 0,
        }}
      />

      {/* Header Text */}
      <div style={{ marginTop: "80px", textAlign: "center", zIndex: 1 }}>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            margin: 0,
            background: "linear-gradient(135deg, #ffffff, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "28px",
              color: "#64748b",
              marginTop: "16px",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end", // Align browser to bottom by default
          position: "relative",
          zIndex: 1,
          paddingTop: "60px",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// Reusable Browser Frame
const BrowserMockup: React.FC<{
  children: React.ReactNode;
  width?: string;
  height?: string;
}> = ({ children, width = "1000px", height = "600px" }) => {
  return (
    <div
      style={{
        width,
        height,
        background: "#f8fafc",
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.1), 0 40px 80px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
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
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#ef4444",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#f59e0b",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#10b981",
          }}
        />
        <div
          style={{
            marginLeft: "24px",
            background: "white",
            padding: "4px 160px",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#64748b",
            flex: 1,
            marginRight: "60px",
            textAlign: "center",
          }}
        >
          example.com
        </div>
      </div>
      {/* Browser Body */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

// --- Screenshot 1: Hero / Basic Capture ---
export const Screenshot1Hero: React.FC = () => {
  return (
    <ScreenshotLayout
      title="Capture any element flawlessly."
      subtitle="Pixel-perfect screenshots with a single click."
    >
      <BrowserMockup width="1100px" height="580px">
        <div style={{ padding: "60px", display: "flex", gap: "40px" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: "60%",
                height: "40px",
                background: "#cbd5e1",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            />
            <div
              style={{
                width: "100%",
                height: "20px",
                background: "#e2e8f0",
                borderRadius: "4px",
                marginBottom: "12px",
              }}
            />
            <div
              style={{
                width: "90%",
                height: "20px",
                background: "#e2e8f0",
                borderRadius: "4px",
                marginBottom: "12px",
              }}
            />
            <div
              style={{
                width: "95%",
                height: "20px",
                background: "#e2e8f0",
                borderRadius: "4px",
              }}
            />
          </div>

          {/* Target Element with Highlight */}
          <div style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                width: "100%",
                height: "360px",
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                padding: "24px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "140px",
                  background: "#3b82f6",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              />
              <div
                style={{
                  width: "80%",
                  height: "24px",
                  background: "#cbd5e1",
                  borderRadius: "6px",
                  marginBottom: "16px",
                }}
              />
              <div
                style={{
                  width: "100%",
                  height: "16px",
                  background: "#f1f5f9",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              />
              <div
                style={{
                  width: "60%",
                  height: "16px",
                  background: "#f1f5f9",
                  borderRadius: "4px",
                }}
              />
            </div>

            {/* Smart Highlight Wrapper */}
            <div
              style={{
                position: "absolute",
                top: "-4px",
                left: "-4px",
                right: "-4px",
                bottom: "-4px",
                border: "3px dashed #3b82f6", // Default Blue Highlight
                borderRadius: "20px",
                background: "rgba(59, 130, 246, 0.1)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: "-32px",
                  right: "12px",
                  background: "#3b82f6",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
              >
                480 × 360
              </div>
            </div>

            {/* Fake Cursor hovering over element */}
            <div
              style={{
                position: "absolute",
                top: "160px",
                left: "240px",
                zIndex: 10,
                filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.4))",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 4L11 22L14 15L21 12L4 4Z"
                  fill="black"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Extension Popup Open (Accurate to real UI) */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "24px",
            width: "340px",
            background: "#0f172a",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "24px",
            zIndex: 20,
            color: "#f8fafc",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              height: "32px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <svg
                width="22"
                height="22"
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
                  stroke="#f8fafc"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  opacity="0.4"
                />
                <path
                  d="M3 9V7C3 4.79086 4.79086 3 7 3H9"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M25 9V7C25 4.79086 23.2091 3 21 3H19"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 19V21C3 23.2091 4.79086 25 7 25H9"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M25 19V21C25 23.2091 23.2091 25 21 25H19"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="14" r="5" fill="#3b82f6" />
                <circle cx="14" cy="14" r="2" fill="#0f172a" />
              </svg>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                }}
              >
                Element Snapper
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: "11px",
                  fontWeight: 500,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    boxShadow: "0 0 8px rgba(59, 130, 246, 0.2)",
                  }}
                />
                Ready
              </div>
              <div style={{ color: "#94a3b8" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38228C17.7913 4.44105 19.5589 6.2087 18.6177 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6177 16.2478C19.5589 17.7913 17.7913 19.5589 16.2478 18.6177C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6177C6.2087 19.5589 4.44105 17.7913 5.38228 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99038 8.74926 5.38228 7.75219C4.44105 6.2087 6.2087 4.44105 7.75219 5.38228C8.74926 5.99038 10.0492 5.45193 10.3246 4.31731Z" />
                  <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Primary Capture Btn */}
            <div
              style={{
                width: "100%",
                height: "54px",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 600,
                fontSize: "16px",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)",
              }}
            >
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4 4H10V6H6V10H4V4ZM20 4V10H18V6H14V4H20ZM4 20V14H6V18H10V20H4ZM20 20H14V18H18V14H20V20ZM12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8Z" />
                </svg>
                <span>Select Element</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              {["Area", "Screen", "Page"].map((label) => (
                <div
                  key={label}
                  style={{
                    padding: "14px",
                    background: "#1e293b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Switch Row */}
            <div
              style={{
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span style={{ fontSize: "14px", fontWeight: 500 }}>
                  Clipboard
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Copy instead of download
                </span>
              </div>
              <div
                style={{
                  width: "44px",
                  height: "24px",
                  background: "#0f172a",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1px",
                    left: "1px",
                    width: "18px",
                    height: "18px",
                    background: "#94a3b8",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </BrowserMockup>
    </ScreenshotLayout>
  );
};

// --- Screenshot 2: Full Scroll ---
export const Screenshot2Scroll: React.FC = () => {
  return (
    <ScreenshotLayout
      title="Snap scrollable elements."
      subtitle="Multi-tile stitching creates perfectly full screenshots."
    >
      <BrowserMockup width="1100px" height="580px">
        <div
          style={{ display: "flex", padding: "40px", justifyContent: "center" }}
        >
          <div
            style={{
              width: "600px",
              position: "relative",
              marginTop: "-120px",
            }}
          >
            {" "}
            {/* Simulating scrolled down */}
            {/* The tall element */}
            <div
              style={{
                width: "100%",
                height: "1200px", // Way taller than viewport
                background: "white",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                padding: "32px",
              }}
            >
              <div
                style={{
                  width: "40%",
                  height: "32px",
                  background: "#cbd5e1",
                  borderRadius: "6px",
                  marginBottom: "32px",
                }}
              />
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    height: "140px",
                    background: "#f1f5f9",
                    borderRadius: "12px",
                    marginBottom: "20px",
                  }}
                />
              ))}
            </div>
            {/* Indigo Highlight for Full Element */}
            <div
              style={{
                position: "absolute",
                top: "-4px",
                left: "-4px",
                right: "-4px",
                bottom: "-4px",
                border: "4px dashed #6366f1", // Indigo
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.05)",
              }}
            >
              {/* Specialized Badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "160px", // Positioned to be visible in the mockup viewport
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#6366f1",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "24px",
                  fontWeight: 600,
                  fontSize: "14px",
                  boxShadow: "0 8px 20px rgba(99, 102, 241, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>↕ Full Element</span>
                <span style={{ opacity: 0.8 }}>600 × 1200</span>
              </div>
            </div>
          </div>
        </div>
      </BrowserMockup>
    </ScreenshotLayout>
  );
};

// --- Screenshot 3: Settings & Delay ---
export const Screenshot3Settings: React.FC = () => {
  return (
    <ScreenshotLayout
      title="Delay timers & format control."
      subtitle="Perfect for capturing hover states and popouts."
    >
      <BrowserMockup width="1100px" height="580px">
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#f1f5f9",
            position: "relative",
          }}
        >
          {/* Extension Settings View UI recreated accurately */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "340px",
              background: "#0f172a",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "24px",
              color: "#f8fafc",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
                height: "32px",
              }}
            >
              <div style={{ color: "#94a3b8", padding: "6px" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                }}
              >
                Settings
              </div>
            </div>

            {/* Content Container */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div style={{ marginTop: "4px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                  }}
                >
                  Format
                </div>
                <div
                  style={{
                    display: "flex",
                    background: "#1e293b",
                    padding: "4px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px",
                      background: "#3b82f6",
                      borderRadius: "4px",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    PNG
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px",
                      color: "#94a3b8",
                      fontSize: "13px",
                    }}
                  >
                    JPG
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    width: "60px",
                    flexShrink: 0,
                  }}
                >
                  Quality
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "#1e293b",
                    borderRadius: "3px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "95%",
                      background: "#3b82f6",
                      borderRadius: "3px",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "95%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "18px",
                      height: "18px",
                      background: "white",
                      borderRadius: "50%",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#3b82f6",
                    background: "rgba(59, 130, 246, 0.1)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    minWidth: "48px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  95%
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    width: "60px",
                    flexShrink: 0,
                  }}
                >
                  Delay
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "#1e293b",
                    borderRadius: "3px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "30%",
                      background: "#3b82f6",
                      borderRadius: "3px",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "30%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "18px",
                      height: "18px",
                      background: "white",
                      borderRadius: "50%",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#3b82f6",
                    background: "rgba(59, 130, 246, 0.1)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    minWidth: "48px",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  3s
                </div>
              </div>

              <div
                style={{
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    Scroll Element
                  </span>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Capture scrollable content
                  </span>
                </div>
                <div
                  style={{
                    width: "44px",
                    height: "24px",
                    background: "#3b82f6",
                    borderRadius: "20px",
                    border: "1px solid #3b82f6",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "1px",
                      left: "21px",
                      width: "18px",
                      height: "18px",
                      background: "white",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px",
                  background: "rgba(255, 221, 0, 0.05)",
                  border: "1px solid rgba(255, 221, 0, 0.2)",
                  borderRadius: "12px",
                  color: "#fbbf24",
                  fontWeight: 500,
                  fontSize: "13px",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 17H16C17.6569 17 19 15.6569 19 14V12H21V7H19V4H5V7H3V12H5V14C5 15.6569 6.34315 17 8 17ZM7 4H17V12H7V4ZM3 9H5V10H3V9ZM19 10V9H21V10H19ZM16 19H8V21H16V19Z"
                    fill="currentColor"
                  />
                </svg>
                <span>Buy me a coffee</span>
              </div>
            </div>
          </div>
        </div>
      </BrowserMockup>
    </ScreenshotLayout>
  );
};

// --- Screenshot 4: Direct to Clipboard ---
export const Screenshot4Clipboard: React.FC = () => {
  return (
    <ScreenshotLayout
      title="Copy directly to clipboard."
      subtitle="Skip the downloads folder. Paste instantly into your apps."
    >
      <BrowserMockup width="1100px" height="580px">
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            padding: "60px",
            gap: "40px",
          }}
        >
          {/* Background UI */}
          <div
            style={{
              width: "60%",
              height: "400px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          />

          {/* The Toast Notification */}
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#10b981", // Green
              color: "white",
              padding: "16px 24px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 20px 40px rgba(16, 185, 129, 0.4)",
              fontWeight: 600,
              fontSize: "16px",
              zIndex: 30,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Copied to clipboard!
          </div>

          {/* Example Pasting into Chat (Like Scene 3 of video) */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              width: "480px",
              height: "360px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 600,
              }}
            >
              Team Chat
            </div>
            {/* Chat Area */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: "16px",
                background: "#f8fafc",
              }}
            >
              {/* "Pasted" Screenshot */}
              <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                <div
                  style={{
                    background: "#2563eb",
                    padding: "4px",
                    borderRadius: "12px",
                    borderBottomRightRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      width: "240px",
                      height: "140px",
                      background: "#cbd5e1",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Input Line */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                background: "white",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: "36px",
                  background: "#f1f5f9",
                  borderRadius: "18px",
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "2px",
                    height: "20px",
                    background: "#2563eb",
                  }}
                />{" "}
                {/* Cursor blink */}
              </div>
            </div>
          </div>
        </div>
      </BrowserMockup>
    </ScreenshotLayout>
  );
};

// --- Chrome Store Promo Tile (440x280) ---
export const StorePromoTile: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/* Animated Logo Gimmick (Static here) */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "80px",
            height: "80px",
            background: "rgba(30, 41, 59, 0.5)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.5)",
          }}
        >
          <svg
            width="44"
            height="44"
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
            />
            <path
              d="M3 9V7C3 4.79086 4.79086 3 7 3H9"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M25 9V7C25 4.79086 23.2091 3 21 3H19"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M3 19V21C3 23.2091 4.79086 25 7 25H9"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M25 19V21C25 23.2091 23.2091 25 21 25H19"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="14" cy="14" r="5" fill="#3b82f6" />
          </svg>
        </div>
        <div
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          Element Snapper
        </div>
      </div>
    </AbsoluteFill>
  );
};
