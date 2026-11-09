// Pulls the real panel's markup, styles and default shortcuts out of the extension,
// so the site shows the panel users get instead of a hand-made copy of it.
// Runs before `dev` and `build`; the output is git-ignored.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../../content/panel.js", import.meta.url), "utf8");

const template = (name) => {
  const text = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`))?.[1];
  if (!text) throw new Error(`content/panel.js: ${name} not found`);
  // The text is copied as written, so anything a JS template literal would evaluate must not be there.
  if (text.includes("${") || text.includes("\\")) throw new Error(`content/panel.js: ${name} has an interpolation or escape`);
  return text;
};

const css = template("PANEL_CSS");
const html = template("PANEL_HTML");
const defaults = src.match(/SC_DEFAULTS = isMac \? \{([\s\S]*?)\}/)?.[1];
const shortcuts = Object.fromEntries([...(defaults ?? "").matchAll(/(\w+):\s+'([^']+)'/g)].map((m) => m.slice(1)));

for (const [what, ok] of [
  ["panel styles", css.includes(".panel-root")],
  ["home and settings views", html.includes('id="homeView"') && html.includes('id="settingsView"')],
  ["default shortcuts", Object.keys(shortcuts).length === 5],
]) {
  if (!ok) throw new Error(`content/panel.js: ${what} not found, the panel changed shape`);
}

mkdirSync(new URL("../generated/", import.meta.url), { recursive: true });
writeFileSync(new URL("../generated/panel-ui.json", import.meta.url), JSON.stringify({ css, html, shortcuts }));
