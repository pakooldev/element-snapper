"use client";

import { useState } from "react";

/** Fake fixed-position ad, so Page capture can be tested against sticky chrome. */
export function FloatingAd() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="pg-floating-ad">
      <button className="pg-floating-ad-close" aria-label="Close ad" onClick={() => setDismissed(true)}>
        ×
      </button>
      <div className="pg-floating-ad-label">Advertisement</div>
      <div className="pg-floating-ad-body">Limited offer — try selecting me!</div>
    </div>
  );
}
