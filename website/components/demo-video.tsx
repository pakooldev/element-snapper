"use client";

import { useEffect, useRef } from "react";

/**
 * The product loop (made in `site-video/`: 30s, 1600x900 H.264, about 2.5 MB).
 * Nothing is downloaded until the section is about to scroll into view, and it
 * plays only while visible. The poster is the loop's first frame, so starting
 * doesn't jump. With reduced motion it waits for the play button instead.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.controls = true;
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="video-container glass-panel">
      <video
        ref={ref}
        className="demo-video"
        src="/demo-loop.mp4"
        poster="/demo-loop-poster.jpg"
        width={1600}
        height={900}
        loop
        muted
        playsInline
        preload="none"
        aria-label="Element Snapper: pick an element, capture the part that scrolls, save, copy or copy as a prompt, mark it up, and find it again in My edits"
      />
    </div>
  );
}
