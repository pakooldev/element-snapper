import { HeroMockup } from "element-snapper-website";

// HeroMockup is the landing page's centrepiece: a 3D-tilted browser frame
// containing a working replica of the extension popup. It's interactive —
// clicking "Select Element" flashes the capture-success state, and the Output
// segmented control switches — but those need a pointer, so the card shows its
// resting state. It takes no props and manages its own state internally.
//
// It renders inside `perspective: 1000px` and is sized for a hero column, so
// it's given cardMode "column" in config.json to get the full card width.

export function Default() {
  return <HeroMockup />;
}

export function InHeroLayout() {
  return (
    <div className="container hero-container" style={{ paddingTop: 0 }}>
      <div className="hero-content">
        <h1 className="hero-title" style={{ fontSize: "2.2rem" }}>
          Pixel-Perfect <span className="text-gradient">Element Capture</span>
        </h1>
        <p className="hero-subtitle">
          The mockup is the right-hand half of the hero's two-column grid; it
          collapses under the copy below 992px.
        </p>
      </div>
      <HeroMockup />
    </div>
  );
}
