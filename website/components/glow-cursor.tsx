"use client";

import { useEffect } from "react";

/** Nudges the background glow toward the cursor. Purely decorative. */
export function GlowCursor() {
  useEffect(() => {
    const glow = document.querySelector<HTMLElement>(".glow-2");
    if (!glow) return;

    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      glow.style.transform = `translate(${x}px, ${y}px)`;
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return null;
}
