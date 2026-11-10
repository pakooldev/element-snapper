import type { ReactNode } from "react";
import {
  FadeInBlocks,
  InfiniteFeed,
  LateFixed,
  PressCounter,
  ShadowContent,
} from "@/components/playground-widgets";

/**
 * Cases that need a whole document to themselves: Page mode captures the
 * document, and scroll owners, snapping or fixed chrome would interfere with
 * every other test if they shared the main playground page.
 */
export type PlaygroundCase = {
  slug: string;
  group: string;
  title: string;
  mode: string;
  expected: string;
  render: (intro: ReactNode) => ReactNode;
};

const SCROLL_ELEMENT = "Element, with Scroll Element on (click the striped area, not a label)";

const SHADOW_BANNER = `
  <div style="position:fixed;left:24px;right:24px;bottom:24px;padding:16px;border-radius:12px;
              background:#f59e0b;color:#111;font:600 14px sans-serif;text-align:center">
    Cookie banner (fixed, inside a shadow root)
  </div>`;

const SHADOW_BUTTON = `
  <button style="width:260px;height:48px;font:600 14px sans-serif">Button inside a shadow root</button>`;

const TABLE_COLUMNS = ["Start", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "End"];

/** Striped column with labels at their true offset, so seams and repeats are easy to spot. */
function Ruler({ height, step = 500 }: { height: number; step?: number }) {
  const marks = [];
  for (let y = 0; y < height; y += step) marks.push(y);
  return (
    <div className="pg-ruler" style={{ height }}>
      {marks.map((y) => (
        <span key={y} className="pg-ruler-mark" style={{ top: y + 8 }}>
          {y}px
        </span>
      ))}
      <span className="pg-ruler-mark" style={{ bottom: 8 }}>
        End · {height}px
      </span>
    </div>
  );
}

export const CASES: PlaygroundCase[] = [
  {
    slug: "selection-targets",
    group: "Selecting",
    title: "Hard to select",
    mode: "Element, with Scroll Element off",
    expected:
      "Each control is captured exactly, at its own size. Nothing opens, takes focus or navigates, and the counter stays at 0.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-select-list">
          <PressCounter />
          <button id="disabled-btn" disabled>
            Disabled button
          </button>
          <input id="disabled-input" disabled defaultValue="Disabled input" aria-label="Disabled input" />
          <select id="native-select" aria-label="Native select" defaultValue="one">
            <option value="one">Native select</option>
            <option value="two">Second option</option>
          </select>
          <input id="text-input" defaultValue="Text input" aria-label="Text input" />
          <a id="plain-link" href="#followed">
            A link
          </a>
          <div id="shadow-host">
            <ShadowContent html={SHADOW_BUTTON} />
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "press-sensitive",
    group: "Selecting",
    title: "Page that reacts to the mouse",
    mode: "Area (drag across the squares)",
    expected: "The squares stay blue while you drag and in the image, and the counter stays at 0.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-select-list">
          <PressCounter />
        </div>
        <div className="pg-press-grid">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="pg-press-cell" />
          ))}
        </div>
      </div>
    ),
  },
  {
    slug: "filled-parent",
    group: "Selecting",
    title: "Parent filled by its child",
    mode: "Element. Hover the card, then press ↑ to step up to the parent and ↓ to step back",
    expected:
      "Pressing ↑ moves the highlight to the bordered card around the link, and clicking captures the whole card, border included.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <article className="pg-filled">
          <a href="#followed" className="pg-filled-link">
            A link that fills its card
          </a>
        </article>
      </div>
    ),
  },
  {
    slug: "app-shell",
    group: "Scroll owners",
    title: "App shell",
    mode: "Page",
    expected: "The whole main pane, 0px through End · 4000px, next to the sidebar. One screen is a fail.",
    render: (intro) => (
      <div className="pg-case pg-app-shell">
        <aside className="pg-shell-side">Sidebar</aside>
        <main className="pg-shell-main">
          {intro}
          <Ruler height={4000} />
        </main>
      </div>
    ),
  },
  {
    slug: "body-scroll",
    group: "Scroll owners",
    title: "Body is the scroller",
    mode: "Page",
    expected: "Every label from 0px through End · 4000px, once each and in order.",
    render: (intro) => (
      <div className="pg-case pg-body-scroll">
        {intro}
        <Ruler height={4000} />
      </div>
    ),
  },
  {
    slug: "scroll-snap",
    group: "Scroll owners",
    title: "Scroll snap",
    mode: "Page",
    expected: "Sections 1 through 8, once each and in order, with no cut or repeated section.",
    render: (intro) => (
      <div className="pg-case pg-snap">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <section key={n} className="pg-snap-section">
            {n === 1 && intro}
            <span className="pg-snap-label">Section {n}</span>
          </section>
        ))}
      </div>
    ),
  },
  {
    slug: "tall-in-scroller",
    group: "Scroll owners",
    title: "Tall element in a scrolling box",
    mode: SCROLL_ELEMENT,
    expected: "The striped column exactly, 0px through End · 1500px. Nothing from the page around the box.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-scroll-tall">
          <Ruler height={1500} />
        </div>
        <div className="pg-after">Page content below the box. It must not be in the image.</div>
        <div style={{ height: 1000 }} />
      </div>
    ),
  },
  {
    slug: "wide-table",
    group: "Scroll owners",
    title: "Wide table in a scrolling box",
    mode: "Element, with Scroll Element on (click a gap between cells, which selects the table)",
    expected: "Every column from Start through End, with no repeated column and nothing from the page beside it.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((row) => (
                <tr key={row}>
                  {TABLE_COLUMNS.map((column) => (
                    <td key={column}>
                      {column} · row {row}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ height: 1000 }} />
      </div>
    ),
  },
  {
    slug: "smooth-scroll",
    group: "Scroll owners",
    title: "Smooth-scrolling page",
    mode: SCROLL_ELEMENT,
    expected: "The striped column exactly, starting at 0px and ending at End · 3000px, with nothing above or below it.",
    render: (intro) => (
      <div className="pg-case pg-smooth">
        {intro}
        <Ruler height={3000} />
        <div className="pg-after">Page content below the column. It must not be in the image.</div>
        <div style={{ height: 1000 }} />
      </div>
    ),
  },
  {
    slug: "sticky-sections",
    group: "Fixed and sticky",
    title: "Sticky sidebar and section headings",
    mode: "Page",
    expected:
      "Headings A through D, each once at the top of its own section. The sidebar appears once, at the top of its column.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-sticky-layout">
          <aside className="pg-sticky-side">Sticky sidebar</aside>
          <div>
            {["A", "B", "C", "D"].map((letter) => (
              <section key={letter} className="pg-sticky-section">
                <h2 className="pg-sticky-heading">Heading {letter}</h2>
                <Ruler height={1500} />
              </section>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "tall-modal",
    group: "Fixed and sticky",
    title: "Modal taller than the screen",
    mode: SCROLL_ELEMENT,
    expected: "The modal's striped panel, 0px through End · 1800px. Blank or repeated parts are a fail.",
    render: (intro) => (
      <div className="pg-case">
        <Ruler height={2000} />
        <div className="pg-modal-backdrop">
          <div className="pg-modal" role="dialog" aria-label="Tall modal test">
            {intro}
            <Ruler height={1800} />
          </div>
        </div>
      </div>
    ),
  },
  {
    slug: "late-fixed",
    group: "Fixed and sticky",
    title: "Chrome that appears on scroll",
    mode: "Page",
    expected: "The header appears once. The back-to-top chip and the popup appear at most once. None repeat on every tile.",
    render: (intro) => (
      <div className="pg-case">
        <LateFixed />
        {intro}
        <Ruler height={5000} />
      </div>
    ),
  },
  {
    slug: "shadow-fixed",
    group: "Fixed and sticky",
    title: "Fixed element in a shadow root",
    mode: "Page",
    expected: "The cookie banner appears at most once. It must not repeat on every tile.",
    render: (intro) => (
      <div className="pg-case">
        <ShadowContent html={SHADOW_BANNER} />
        {intro}
        <Ruler height={4000} />
      </div>
    ),
  },
  {
    slug: "long-page",
    group: "Size limits",
    title: "Very long page",
    mode: "Page",
    expected:
      "The whole page, 0px through End · 12000px, even on a Retina screen where it passes the 16,384px canvas limit. A scaled-down image is fine. An error is a fail.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <Ruler height={12000} step={1000} />
      </div>
    ),
  },
  {
    slug: "fade-in",
    group: "Changing content",
    title: "Content that fades in on scroll",
    mode: "Page",
    expected: "All five amber blocks fully shown. A faded or missing block is a fail.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <FadeInBlocks count={5} gap={1000} />
        <div style={{ height: 600 }} />
      </div>
    ),
  },
  {
    slug: "lazy-images",
    group: "Changing content",
    title: "Slow lazy-loaded images",
    mode: "Page",
    expected: "All five amber squares. An empty square is a fail. (Here they load fast; the check serves them slowly.)",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        {[1, 2, 3, 4, 5].map((n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} className="pg-lazy" loading="lazy" src={`/playground/amber.svg?slow=2500&n=${n}`} width={200} height={200} alt={`Lazy image ${n}`} />
        ))}
        <div style={{ height: 600 }} />
      </div>
    ),
  },
  {
    slug: "looping-animation",
    group: "Changing content",
    title: "Animation that never stops",
    mode: "Page",
    expected: "The tall bar is one color from top to bottom. Red and amber bands mixed together are a fail.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <div className="pg-loop" />
      </div>
    ),
  },
  {
    slug: "infinite-scroll",
    group: "Changing content",
    title: "Infinite scroll",
    mode: "Page",
    expected:
      "The page as it was when the capture started, 0px through End · 3000px. Posts that load while it scrolls are left out, so it always ends.",
    render: (intro) => (
      <div className="pg-case">
        {intro}
        <Ruler height={3000} />
        <InfiniteFeed />
      </div>
    ),
  },
];
