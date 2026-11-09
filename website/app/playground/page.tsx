import type { Metadata } from "next";
import Link from "next/link";
import { FloatingAd } from "@/components/floating-ad";
import { CASES } from "./cases";
import "./playground.css";

const GROUPS = [...new Set(CASES.map((c) => c.group))];

export const metadata: Metadata = {
  title: "Playground",
  description:
    "A live test page for trying out Element Snapper's capture modes: single element, scrollable element, full page, region, and viewport.",
};

const CHECKLIST = [
  [
    "🖱️",
    "Element Mode",
    "Hover each box above — the highlight should turn indigo/dashed when it exceeds the viewport.",
  ],
  ["▭", "Area Mode", "Drag a rectangle spanning two boxes and confirm the crop lines up pixel-for-pixel."],
  ["🖥️", "Screen Mode", "Scroll partway down the page first — only the visible viewport should be captured."],
  [
    "📜",
    "Page Mode",
    "Captures top to bottom of this whole page — check every marker above appears once, undistorted.",
  ],
] as const;

export default function Playground() {
  return (
    <>
      {/* Floating ad — position: fixed, stays put across scroll */}
      <FloatingAd />

      <section className="manual-section">
        <div className="container">
          <div className="manual-header">
            <h1 className="manual-title">
              Test <span className="text-gradient">Playground</span>
            </h1>
          </div>

          <div className="manual-step glass-panel">
            <h2 className="step-title" style={{ marginTop: 0 }}>
              How to use this page
            </h2>
            <p className="step-desc">
              Open the popup (or the in-page panel via the toolbar icon) and try each mode against
              the boxes below. <strong>Element</strong> — click &quot;Select Element&quot; and hover
              any box. <strong>Area</strong> — drag a rectangle anywhere on the page.{" "}
              <strong>Screen</strong> — captures just what&apos;s visible right now.{" "}
              <strong>Page</strong> — captures this entire scrollable page, stitched together.
            </p>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              1. Small Element <span className="test-tag">control</span>
            </h2>
            <p className="step-desc">
              Fits entirely in the viewport — should always be a single capture, no stitching.
            </p>
            <div className="pg-box pg-small">
              Small Element
              <br />
              300 × 200
            </div>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              2. Tall Element <span className="test-tag">vertical stitch</span>
            </h2>
            <p className="step-desc">
              Taller than the viewport. With &quot;Scroll Element&quot; enabled in Settings, capture
              should scroll down and stitch tiles so every marker below appears in the result, and
              the site&apos;s sticky header must not cover the top of the box.
            </p>
            <div className="pg-box pg-tall">
              <h3>600 × 2000</h3>
              {["100px", "500px", "900px", "1300px", "1700px", "1900px"].map((at) => (
                <div key={at} className="pg-marker pg-marker-h" style={{ left: 20, top: at }}>
                  Marker · {at}
                </div>
              ))}
            </div>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              3. Wide Element <span className="test-tag">horizontal stitch</span>
            </h2>
            <p className="step-desc">Wider than the viewport — exercises horizontal scroll + stitch.</p>
            <div className="pg-box pg-wide">
              <h3>2000 × 400</h3>
              {(
                [
                  [20, "Start"],
                  [620, "600px"],
                  [1220, "1200px"],
                  [1820, "End"],
                ] as const
              ).map(([left, label]) => (
                <div key={label} className="pg-marker pg-marker-h" style={{ left }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              4. Large 2D Element <span className="test-tag">grid stitch</span>
            </h2>
            <p className="step-desc">
              Exceeds the viewport in both directions — verify all four corners and the center land
              in the final image.
            </p>
            <div className="pg-box pg-grid">
              <h3>1800 × 1500</h3>
              <span className="pg-corner pg-tl">Top Left</span>
              <span className="pg-corner pg-tr">Top Right</span>
              <span className="pg-corner pg-bl">Bottom Left</span>
              <span className="pg-corner pg-br">Bottom Right</span>
              <span className="pg-corner pg-center">Center</span>
            </div>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              5. Internally Scrollable Element <span className="test-tag">own scroll container</span>
            </h2>
            <p className="step-desc">
              This box has its own <code>overflow: auto</code> — its content is taller than the box
              itself, separate from the page&apos;s scroll. With &quot;Scroll Element&quot; on,
              clicking inside the box should capture all four markers. With it off, only what&apos;s
              visible.
            </p>
            <div className="pg-box pg-scroll">
              <div className="pg-scroll-inner">
                {["top", "400px", "800px", "bottom"].map((at) => (
                  <div key={at} className="pg-marker">
                    Inner marker · {at}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="test-section">
            <h2 className="test-heading">
              6. Floating Ad <span className="test-tag">fixed position</span>
            </h2>
            <p className="step-desc">
              Stays pinned to the corner of the viewport while you scroll — like a real ad, cookie
              banner, or chat widget. Try selecting it at different scroll positions, and confirm
              Page capture doesn&apos;t pick up a duplicate of it on every stitched tile.
            </p>
          </div>

          <div className="test-section" id="page-cases">
            <h2 className="test-heading">
              Page-level cases <span className="test-tag">one page each</span>
            </h2>
            <p className="step-desc">
              These need a whole page to themselves. Each one states the mode to use and the result
              to expect at the top of the page, so it also appears in your capture.
            </p>
            {GROUPS.map((group) => (
              <div key={group} className="pg-case-group">
                <h3>{group}</h3>
                <div className="pg-case-list">
                  {CASES.filter((c) => c.group === group).map((c) => (
                    <Link key={c.slug} href={`/playground/${c.slug}`} className="btn btn-outline">
                      {c.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div className="manual-tips">
            <h2 className="section-title" style={{ fontSize: "1.8rem" }}>
              Checklist
            </h2>
            <div className="tips-grid">
              {CHECKLIST.map(([icon, title, body]) => (
                <div key={title} className="tip-card glass-panel">
                  <div className="tip-icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
