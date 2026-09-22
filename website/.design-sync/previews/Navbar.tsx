import { Navbar } from "element-snapper-website";

// Navbar takes no props — its only variable is which nav link reads as active,
// and that comes from the current route, not an prop. So the honest story set
// is "on its own" and "in the page context it was designed for" rather than an
// invented variant sweep.

export function Default() {
  return <Navbar />;
}

export function OverPageContent() {
  return (
    <>
      <Navbar />
      <header className="hero">
        <div className="container">
          <div className="badge">Version 1.5.0 is out! ✨</div>
          <h1 className="hero-title" style={{ fontSize: "2.4rem" }}>
            Pixel-Perfect <span className="text-gradient">Element Capture</span>
          </h1>
          <p className="hero-subtitle" style={{ maxWidth: 520 }}>
            At rest the bar is flush with the page — transparent and square.
            Once you scroll past 8px it lifts into a floating blurred pill.
          </p>
        </div>
      </header>
    </>
  );
}
