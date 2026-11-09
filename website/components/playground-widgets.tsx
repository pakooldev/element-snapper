"use client";

import { useEffect, useRef, useState } from "react";

/** Chrome that only turns fixed or appears once the page has been scrolled. */
export function LateFixed() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setStage(y > 1200 ? 3 : y > 600 ? 2 : y > 200 ? 1 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* The wrapper keeps the header's height so the page doesn't jump when it turns fixed. */}
      <div className="pg-late-slot">
        <div className={stage >= 1 ? "pg-late-header is-fixed" : "pg-late-header"}>
          Header (fixed after 200px)
        </div>
      </div>
      {stage >= 2 && <div className="pg-late-chip pg-late-top">Back to top (after 600px)</div>}
      {stage >= 3 && <div className="pg-late-chip pg-late-popup">Subscribe popup (after 1200px)</div>}
    </>
  );
}

/** A fixed banner inside a shadow root, out of reach of document.querySelectorAll. */
export function ShadowBanner() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current || host.current.shadowRoot) return;
    host.current.attachShadow({ mode: "open" }).innerHTML = `
      <div style="position:fixed;left:24px;right:24px;bottom:24px;padding:16px;border-radius:12px;
                  background:#f59e0b;color:#111;font:600 14px sans-serif;text-align:center">
        Cookie banner (fixed, inside a shadow root)
      </div>`;
  }, []);

  return <div ref={host} />;
}
