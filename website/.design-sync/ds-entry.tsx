// Entry barrel for the design-system bundle.
//
// This app has no library build — `package.json` has no main/module/exports,
// because nothing ever imports it as a package. The converter needs *some*
// entry to bundle from, and it also uses the entry's location to find the
// owning package.json (it walks up until it finds one with a name), so this
// file sitting under .design-sync/ resolves the package to the website root.
//
// Committed on purpose: it's a sync input, so re-syncs on any machine build
// the same bundle. Add a line here when a new shared component should become
// part of the design system, and pin its src path in config.json's
// componentSrcMap (the .d.ts scan finds nothing without a real dist, so that
// map is what tells the converter the component exists).
//
// Deliberately NOT exported: logo.tsx's `Logo`/`PopupLogo` are JSX element
// constants rather than components, so `<Logo />` would be invalid.

// MUST stay first: installs the `process` shim Next's internals read before
// any component module is evaluated. See ds-process-shim.ts.
import "./ds-process-shim";

// Preview wrapper, referenced by config.json's `provider`. Exported here (and
// deliberately absent from componentSrcMap) so it reaches the bundle without
// becoming a component card.
export { DsBackdrop } from "./ds-backdrop";

export { Navbar } from "../components/navbar";
export { Footer } from "../components/footer";
export { HeroMockup } from "../components/hero-mockup";
export { DemoVideo } from "../components/demo-video";
export { FloatingAd } from "../components/floating-ad";
export { GlowCursor } from "../components/glow-cursor";
