import { FloatingAd } from "element-snapper-website";

// FloatingAd is `position: fixed` (bottom-right, 240px wide) — it's the
// playground's stand-in for the sticky chrome a real page accumulates: ad
// slots, cookie banners, chat widgets. Dropped straight into a preview card it
// pins to the browser viewport and escapes the card entirely.
//
// The wrapper fixes that without touching the component: any ancestor with a
// `transform` becomes the containing block for fixed-position descendants, so
// the ad anchors to this box instead of the viewport. That's also the honest
// way to demo it — it shows the component parked in the corner of a surface,
// which is exactly how it behaves on a real page.
//
// It is dismissable: the × unmounts it via internal state.

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        transform: "translateZ(0)",
        minHeight: 260,
        borderRadius: 12,
        border: "1px dashed var(--border-light)",
        background: "rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export function Default() {
  return (
    <Stage>
      <FloatingAd />
    </Stage>
  );
}

export function OverPageContent() {
  return (
    <Stage>
      <div style={{ padding: 24, maxWidth: 420 }}>
        <h3 className="test-heading" style={{ fontSize: "1.1rem" }}>
          Scrollable page content
        </h3>
        <p className="step-desc">
          The ad stays pinned to the corner of its containing block while the
          content behind it scrolls — the case Page capture has to handle
          without stamping a copy onto every stitched tile.
        </p>
      </div>
      <FloatingAd />
    </Stage>
  );
}
