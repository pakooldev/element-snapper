import { DemoVideo } from "@/components/demo-video";
import { HeroMockup } from "@/components/hero-mockup";
import { CHROME_STORE_URL } from "@/components/logo";

const FEATURES = [
  {
    icon: "mb-blue",
    title: "DPR-Aware Cropping",
    body: "Handles Retina and 4K displays flawlessly. Coordinates are converted to physical pixels so your captures are never blurry.",
    path: (
      <>
        <path d="M3 3h18v18H3z" />
        <path d="M8 12l3 3 5-5" />
      </>
    ),
  },
  {
    icon: "mb-green",
    title: "Multi-Tile Stitching",
    body: "Capturing an element larger than the viewport? No problem. The advanced stitching algorithm smoothly auto-scrolls and combines tiles perfectly.",
    path: <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />,
  },
  {
    icon: "mb-yellow",
    title: "Capture Delay",
    body: "Set a countdown timer (0-10s) to easily capture hover states, dropdown menus, and dynamic UI elements before clipping.",
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <header className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="badge">Version 1.5.1 is out! ✨</div>
            <h1 className="hero-title">
              Pixel-Perfect <br />
              <span className="text-gradient">Element Capture</span>
            </h1>
            <p className="hero-subtitle">
              A professional Chrome extension that captures flawless, high-DPR screenshots of any
              webpage element. No blur. Perfect crops. Even handles scrollable elements and
              full-page captures via seamless tile stitching.
            </p>
            <div className="hero-actions">
              <a href={CHROME_STORE_URL} target="_blank" rel="noopener" className="btn btn-primary">
                Add to Chrome — It&apos;s Free
              </a>
              <a
                href="https://buymeacoffee.com/panat.siriwong"
                target="_blank"
                rel="noopener"
                className="btn btn-bmc"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M8 17H16C17.6569 17 19 15.6569 19 14V12H21V7H19V4H5V7H3V12H5V14C5 15.6569 6.34315 17 8 17ZM7 4H17V12H7V4ZM3 9H5V10H3V9ZM19 10V9H21V10H19ZM16 19H8V21H16V19Z"
                    fill="currentColor"
                  />
                </svg>
                Support Project
              </a>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="check">✓</span> Lossless PNG / JPG
              </div>
              <div className="stat">
                <span className="check">✓</span> Multi-tile Stitching
              </div>
              <div className="stat">
                <span className="check">✓</span> Zero Data Collection
              </div>
            </div>
          </div>

          <HeroMockup />
        </div>
      </header>

      {/* Demo Video Section */}
      <section id="how-it-works" className="video-section">
        <div className="container">
          <h2 className="section-title">See it in Action</h2>
          <p className="section-subtitle">
            Watch how Element Snapper smoothly auto-scrolls and intelligently stitches elements
            perfectly.
          </p>
          <DemoVideo />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Why Element Snapper?</h2>
          <p className="section-subtitle">
            Engineered for developers, designers, and QA engineers who need precision.
          </p>

          <div className="features-grid">
            {FEATURES.map(({ icon, title, body, path }) => (
              <div key={title} className="feature-card glass-panel">
                <div className={`feature-icon ${icon}`}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    {path}
                  </svg>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
