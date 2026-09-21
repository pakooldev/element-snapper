import { GlowCursor } from "element-snapper-website";

// GlowCursor renders null by design — it's a behaviour component. On mount it
// attaches a passive mousemove listener and nudges the page's `.glow-2`
// ambient blob toward the cursor (±20px), cleaning the listener up on unmount.
//
// So there is nothing to screenshot, and the render check flags it blank. The
// real component is still mounted below: the caption is what makes the card
// legible to someone browsing the library, and it tells the design agent the
// one thing that matters — this belongs in a layout that already has the
// .bg-glow / .glow-2 markup, and it contributes no markup of its own.

export function BehaviourOnly() {
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 460 }}>
      {/* The ambient blobs GlowCursor actually steers, as the page provides them. */}
      <div className="bg-glow" aria-hidden="true">
        <div className="glow glow-1" />
        <div className="glow glow-2" />
      </div>

      <GlowCursor />

      <div
        style={{
          border: "1px dashed var(--border-light)",
          borderRadius: 12,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Renders no markup
        </div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>GlowCursor</div>
        <p
          style={{
            marginTop: 10,
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          Mounts a passive <code>mousemove</code> listener that drifts the
          page&apos;s <code>.glow-2</code> blob toward the pointer. Drop it into
          a layout that already renders <code>.bg-glow</code>; it returns{" "}
          <code>null</code> and adds nothing to the DOM.
        </p>
      </div>
    </div>
  );
}
