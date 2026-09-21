import type { ReactNode } from "react";

/**
 * Preview backdrop — wired as `provider` in config.json, so every preview card
 * renders inside it.
 *
 * Element Snapper is a dark design system: `globals.css` puts every surface on
 * `body { background-color: var(--bg-dark) }`, and the components are built to
 * sit on it (light text, translucent `.glass-panel` fills, glow shadows). The
 * preview card template hardcodes `body{background:#fff}` *after* its
 * stylesheet links, so that body rule always loses and the components render
 * light-on-white — technically "rendering", visually meaningless.
 *
 * This restores the surface the components were designed against rather than
 * changing them. The negative margin cancels the card's own 24px padding so
 * the dark field reaches the card edges the way a real page does.
 *
 * Not listed in componentSrcMap, so it ships in the bundle as the provider
 * without becoming a component card of its own.
 */
export function DsBackdrop({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        margin: -24,
        padding: 24,
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "var(--bg-dark)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}
