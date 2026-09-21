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
            The navbar is sticky with a 16px top offset, so it floats over the
            content it scrolls past rather than sitting flush against it.
          </p>
        </div>
      </header>
    </>
  );
}
