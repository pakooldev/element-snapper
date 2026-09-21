import type { Metadata } from "next";
import releases from "@/data/releases.json";

export const metadata: Metadata = {
  title: "Release Notes",
  description: "Release notes and updates for the Element Snapper Chrome Extension.",
};

// The changelog is bundled at build time, so the page ships as finished HTML —
// no client fetch, no loading state, no layout shift. To add a release, append
// an entry to data/releases.json.
export default function Releases() {
  return (
    <>
      <header className="releases-header" style={{ padding: "60px 0 40px", textAlign: "center" }}>
        <div className="container">
          <h1 className="hero-title" style={{ fontSize: "3rem", marginBottom: 16 }}>
            Release <span className="text-gradient">Notes</span>
          </h1>
          <p className="hero-subtitle" style={{ margin: "0 auto", maxWidth: 600 }}>
            Stay up to date with the latest features, improvements, and bug fixes for Element
            Snapper.
          </p>
        </div>
      </header>

      <section className="releases-section" style={{ padding: "40px 0 100px" }}>
        <div className="container">
          <div className="releases-container">
            {releases.map((release) => (
              <div key={release.version} className="release-card glass-panel">
                <div className="release-header">
                  <h2 className="release-version">{release.version}</h2>
                  <span className="release-date">{release.date}</span>
                </div>
                <p className="release-summary">{release.summary}</p>
                <div className="release-highlights">
                  <h3>Highlights</h3>
                  <ul>
                    {release.highlights.map((highlight) => (
                      <li key={highlight}>
                        <span style={{ color: "var(--accent-primary)", marginRight: 8 }}>✨</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
