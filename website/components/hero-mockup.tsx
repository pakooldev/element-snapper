"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealPanel } from "./real-panel";

const RESTING_TRANSFORM = "rotateY(-5deg) rotateX(5deg)";

/**
 * The hero's playable mockup: the real panel in a fake browser, with its buttons
 * wired to a simulated capture.
 *
 * The parallax tilt is written straight to the node via a ref — it fires on
 * every mousemove and must never trigger a React render.
 */
export function HeroMockup() {
  const browserRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    const root = panelRef.current?.querySelector(".real-panel")?.shadowRoot;
    if (!root) return;

    const controller = new AbortController();
    const { signal } = controller;
    const status = root.getElementById("statusPill")!;
    const modeButtons = root.querySelectorAll<HTMLButtonElement>(".action-btn");

    const simulateCapture = () => {
      setCaptured(true);
      status.className = "status-pill success";
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => {
        setCaptured(false);
        status.className = "status-pill idle";
      }, 1200);
    };

    for (const button of [root.getElementById("captureBtn")!, ...modeButtons]) {
      button.addEventListener("click", simulateCapture, { signal });
    }

    // As in the panel: Copy as Prompt only works on a selected element.
    for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="outputMode"]')) {
      radio.addEventListener(
        "change",
        () => modeButtons.forEach((button) => (button.disabled = radio.value === "copyPrompt")),
        { signal },
      );
    }

    return () => controller.abort();
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
          {/* The real extension panel */}
          <div className="extension-popup" ref={panelRef}>
            <RealPanel />
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
