// The editor screenshot for the website manual: the sample list with emails blurred, a box and an arrow,
// drawn with the real tools. Writes ../website/public/manual/editor.png (1280x720 at 2x).
// Run after grab2.mjs: CHROMIUM_PATH=... node grab-manual.mjs
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const repo = new URL('..', import.meta.url).pathname;
const ext = mkdtempSync(join(tmpdir(), 'snapper-ext-'));
for (const p of ['manifest.json', 'background', 'content', 'editor', 'icons']) cpSync(join(repo, p), join(ext, p), { recursive: true });
const layout = JSON.parse(readFileSync(join(here, 'assets/layout.json')));
const [fw, fh] = layout.full;

const ctx = await chromium.launchPersistentContext('', {
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  viewport: null,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--window-size=1280,807', '--force-device-scale-factor=2'],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
const b64 = readFileSync(join(here, 'assets/list-full.png')).toString('base64');
await sw.evaluate(async (b64) => chrome.storage.session.set({
  history: [{ id: 'list', timestamp: Date.now(), source: 'capture', mimeType: 'image/png', size: 1 }],
  'capture:list': `data:image/png;base64,${b64}`,
}), b64);
const editor = ctx.pages()[0] || (await ctx.newPage());
await editor.goto(`chrome-extension://${new URL(sw.url()).host}/editor/editor.html#capture=list`);
await editor.waitForSelector('body[data-ready]');
await editor.fill('#name', 'New customers');
await editor.locator('#name').press('Enter');

const bb = await editor.locator('#board').boundingBox();
const zoom = parseInt(await editor.textContent('#zoomLabel'), 10) / 100;
// The capture is 3x pixels; at 2x the editor reads it as 1.5 list px per CSS px.
const k = 1341 / 2 / fw;
const at = (u, v) => [bb.x + bb.width / 2 + (u - fw / 2) * k * zoom, bb.y + bb.height / 2 + (v - fh / 2) * k * zoom];
const drag = async (a, b) => {
  await editor.mouse.move(...at(...a)); await editor.mouse.down();
  await editor.mouse.move(...at(...b), { steps: 6 }); await editor.mouse.up();
};
await editor.click('[data-tool="blur"]');
for (const [x, y, w, h] of layout.emails) await drag([x - 4, y - 4], [x + w + 4, y + h + 4]);
await editor.click('[data-tool="box"]');
await editor.click('[data-color="#ef4444"]');
const [tx, ty, tw, th] = layout.trial;
await drag([tx - 9, ty - 8], [tx + tw + 9, ty + th + 8]);
await editor.click('[data-tool="arrow"]');
await drag([232, 214], [365, 138]);
await editor.mouse.move(5, 400);
await editor.waitForTimeout(800);
mkdirSync(join(repo, 'website/public/manual'), { recursive: true });
await editor.screenshot({ path: join(repo, 'website/public/manual/editor.png') });
await ctx.close();
