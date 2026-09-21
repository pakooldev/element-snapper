"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PopupLogo } from "./logo";

const OUTPUT_MODES = ["Download", "Copy Image", "Copy as Prompt"] as const;
const RESTING_TRANSFORM = "rotateY(-5deg) rotateX(5deg)";

/**
 * The hero's playable extension mockup: clicking the popup's buttons/toggles
 * actually reacts, so it reads like the real panel.
 *
 * The parallax tilt is written straight to the node via a ref — it fires on
 * every mousemove and must never trigger a React render.
 */
export function HeroMockup() {
  const browserRef = useRef<HTMLDivElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [output, setOutput] = useState<string>("Copy Image");
  const [captured, setCaptured] = useState(false);

  useEffect(() => () => {
    if (successTimer.current) clearTimeout(successTimer.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const browser = browserRef.current;
    if (!browser) return;

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const xRotation = -((e.clientY - top - height / 2) / height) * 10;
    const yRotation = ((e.clientX - left - width / 2) / width) * 10;

    browser.style.transition = "none";
    browser.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const browser = browserRef.current;
    if (!browser) return;
    browser.style.transition = "transform 0.5s ease";
    browser.style.transform = RESTING_TRANSFORM;
  }, []);

  const simulateCapture = useCallback(() => {
    setCaptured(true);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setCaptured(false), 1200);
  }, []);

  return (
    <div className="hero-visual" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="mockup-browser" ref={browserRef}>
        <div className="browser-header">
          <div className="browser-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="browser-url">element-snapper.com</div>
          <div className="browser-extension-icon active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
              <rect x="8" y="8" width="8" height="8" fill="white" />
            </svg>
          </div>
        </div>
        <div className="browser-body">
          {/* Embedded extension popup UI */}
          <div className="extension-popup glass-panel">
            <div className="mp-header">
              <div className="mp-brand">
                {PopupLogo}
                <span className="mp-title">Element Snapper</span>
              </div>
              <div className="mp-header-right">
                <div className="mp-status">
                  <span className={captured ? "mp-dot is-success" : "mp-dot"} />
                </div>
                <div className="mp-settings-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M10.3246 4.31731C10.751 2.5609 13.249 2.5609 13.6754 4.31731C13.9508 5.45193 15.2507 5.99038 16.2478 5.38228C17.7913 4.44105 19.5589 6.2087 18.6177 7.75218C18.0096 8.74925 18.5481 10.0492 19.6827 10.3246C21.4391 10.751 21.4391 13.249 19.6827 13.6754C18.5481 13.9508 18.0096 15.2507 18.6177 16.2478C19.5589 17.7913 17.7913 19.5589 16.2478 18.6177C15.2507 18.0096 13.9508 18.5481 13.6754 19.6827C13.249 21.4391 10.751 21.4391 10.3246 19.6827C10.0492 18.5481 8.74926 18.0096 7.75219 18.6177C6.2087 19.5589 4.44105 17.7913 5.38228 16.2478C5.99038 15.2507 5.45193 13.9508 4.31731 13.6754C2.5609 13.249 2.5609 10.751 4.31731 10.3246C5.45193 10.0492 5.99038 8.74926 5.38228 7.75219C4.44105 6.2087 6.2087 4.44105 7.75219 5.38228C8.74926 5.99038 10.0492 5.45193 10.3246 4.31731Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div className="mp-close-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="mp-main-btn" onClick={simulateCapture}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 4H10V6H6V10H4V4ZM20 4V10H18V6H14V4H20ZM4 20V14H6V18H10V20H4ZM20 20H14V18H18V14H20V20ZM12 8C14.2 8 16 9.8 16 12C16 14.2 14.2 16 12 16C9.8 16 8 14.2 8 12C8 9.8 9.8 8 12 8Z"
                  fill="currentColor"
                />
              </svg>
              <span>Select Element</span>
            </div>
            <div className="mp-actions">
              {["Area", "Screen", "Page"].map((label) => (
                <div key={label} className="mp-action-btn" onClick={simulateCapture}>
                  {label}
                </div>
              ))}
            </div>
            <div className="mp-setting-group">
              <label className="mp-setting-label">Output</label>
              <div className="mp-toggle-group mp-toggle-group-3">
                {OUTPUT_MODES.map((mode) => (
                  <span
                    key={mode}
                    className={mode === output ? "mp-toggle-opt active" : "mp-toggle-opt"}
                    onClick={() => setOutput(mode)}
                  >
                    {mode}
                  </span>
                ))}
              </div>
            </div>
            <div className="mp-link-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>View history</span>
            </div>
          </div>

          {/* Page content mock background */}
          <div className="mock-page-content">
            <div className="mock-skeleton title" />
            <div className="mock-skeleton text" />
            <div className="mock-skeleton text" />
            <div className="mock-skeleton text short" />

            <div className={captured ? "mock-highlight-box is-success" : "mock-highlight-box"}>
              <span className="mock-dimensions">720 × 480</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
