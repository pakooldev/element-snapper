import { DemoVideo } from "element-snapper-website";

// DemoVideo hardcodes src="/demo.mp4" — an app-absolute path that only
// resolves when the site itself is serving. Outside it (this card, and any
// design built with the component) the request 404s and the component sits in
// its loading state: spinner over the glass-panel frame, video faded to
// opacity 0 until `loadeddata` fires.
//
// That is a real state of the real component, not a broken render, so the card
// shows it honestly rather than faking a poster frame. A design that needs the
// playing state has to serve a video at that path — worth knowing before
// reaching for this component.

export function Loading() {
  return <DemoVideo />;
}

export function InSection() {
  return (
    <section className="video-section" style={{ padding: "8px 0" }}>
      <div className="container">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          See it in Action
        </h2>
        <p className="section-subtitle">
          Watch how Element Snapper smoothly auto-scrolls and intelligently
          stitches elements perfectly.
        </p>
        <DemoVideo />
      </div>
    </section>
  );
}
