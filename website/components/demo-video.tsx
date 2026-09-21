"use client";

import { useState } from "react";

/**
 * Fades the spinner out once the video has enough data to play. `onLoadedData`
 * / `onPlaying` cover both the cold and the cached case — React attaches the
 * handlers before the element can fire them, so no readyState poll is needed.
 */
export function DemoVideo() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="video-container glass-panel">
      <div className={loaded ? "video-loader is-hidden" : "video-loader"} aria-hidden={loaded}>
        <div className="spinner" />
        <p>Loading demo...</p>
      </div>
      <video
        src="/demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className={loaded ? "demo-video loaded" : "demo-video"}
        onLoadedData={() => setLoaded(true)}
        onPlaying={() => setLoaded(true)}
      />
    </div>
  );
}
