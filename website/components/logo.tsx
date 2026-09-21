// Static SVGs, hoisted to module scope so they are allocated once (see
// `rendering-hoist-jsx`). Both are pure markup — no props, no state.

export const Logo = (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="animated-logo"
    aria-hidden="true"
  >
    {/* Outer dashed bounding box */}
    <rect
      x="3"
      y="3"
      width="22"
      height="22"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="4 2"
      className="logo-dash"
    />
    {/* Corner crop marks */}
    <path d="M3 9V7C3 4.79086 4.79086 3 7 3H9" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 9V7C25 4.79086 23.2091 3 21 3H19" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 19V21C3 23.2091 4.79086 25 7 25H9" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 19V21C25 23.2091 23.2091 25 21 25H19" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
    {/* Inner camera lens */}
    <circle cx="14" cy="14" r="5" fill="var(--accent-primary)" />
    <circle cx="14" cy="14" r="2" fill="var(--bg-dark)" />
  </svg>
);

/** The same mark at popup-mockup size, with the accent colours baked in. */
export const PopupLogo = (
  <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" opacity="0.4" />
    <path d="M3 9V7C3 4.79086 4.79086 3 7 3H9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 9V7C25 4.79086 23.2091 3 21 3H19" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 19V21C3 23.2091 4.79086 25 7 25H9" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 19V21C25 23.2091 23.2091 25 21 25H19" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <circle cx="14" cy="14" r="5" fill="#3b82f6" />
    <circle cx="14" cy="14" r="2" fill="#0f172a" />
  </svg>
);

export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/lemgfajngedincmoifojlnendglikdpj";
