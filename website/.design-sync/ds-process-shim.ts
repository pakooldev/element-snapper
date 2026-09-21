// Browser shim for Node's `process` global.
//
// Next.js internals (next/link, next/navigation) read feature flags off
// `process.env.__NEXT_*` — __NEXT_ROUTER_BASEPATH, __NEXT_TRAILING_SLASH,
// __NEXT_LINK_NO_TOUCH_START and friends — plus process.cwd/nextTick. The
// converter's esbuild pass only substitutes the exact expression
// `process.env.NODE_ENV`, so every other reference survives into the bundle
// and throws "process is not defined" the moment a component initializes,
// which leaves window.ElementSnapper unpopulated.
//
// An empty env is the correct shim, not a lazy one: these are all opt-in
// feature flags, so reading them as undefined selects Next's default
// behaviour — the same behaviour the site itself gets, since it sets none
// of them.
//
// This must stay the FIRST import in ds-entry.tsx. ES module imports are
// evaluated in order, so a bare assignment in the barrel's body would run
// only after the Next-importing components had already initialized.

const shim = {
  env: {} as Record<string, string | undefined>,
  cwd: () => "/",
  nextTick: (fn: () => void) => queueMicrotask(fn),
  platform: "browser",
  version: "",
  versions: {} as Record<string, string>,
};

// Cast through `unknown`: @types/node declares globalThis.process as the full
// Node `Process`, and this shim deliberately implements only the handful of
// members Next actually touches in the browser.
const g = globalThis as unknown as { process?: unknown };
g.process ??= shim;

export {};
