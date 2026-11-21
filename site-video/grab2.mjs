// Textures and measurements for ad.html (writes assets/*.png and assets/layout.json).
// Run: CHROMIUM_PATH=... node grab2.mjs
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const repo = new URL('..', import.meta.url).pathname;
const ext = mkdtempSync(join(tmpdir(), 'snapper-ext-'));
for (const p of ['manifest.json', 'background', 'content', 'editor', 'icons']) cpSync(join(repo, p), join(ext, p), { recursive: true });

const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const file = join(here, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(file) || !extname(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const PAGE = `http://localhost:${server.address().port}/scene/page.html`;
const out = (name) => join(here, 'assets', name);
const layout = {};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
// The page the camera flies over, at 2x like a Retina screen.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(PAGE);
await page.waitForTimeout(400);
await page.screenshot({ path: out('page.png') });
const box = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return [b.x, b.y, b.width, b.height].map(Math.round); };
layout.page = [1440, 900];
layout.revenue = await box('#revenue');
layout.users = await box('.three .card');
layout.customers = await box('#customers');
layout.list = await box('#customers .list');

// The list on its own, sharp enough to fill the frame: as it scrolls (3 rows) and unrolled (all 8).
const big = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 3 });
await big.goto(PAGE);
await big.waitForTimeout(300);
await big.locator('#customers').screenshot({ path: out('list-top.png') });
await big.evaluate(() => document.getElementById('customers').classList.add('expanded'));
await big.locator('#customers').screenshot({ path: out('list-full.png') });
const card = await big.locator('#customers').boundingBox();
const inCard = async (sel) => Promise.all((await big.locator(sel).all()).map(async (l) => {
  const b = await l.boundingBox();
  return [b.x - card.x, b.y - card.y, b.width, b.height].map(Math.round);
}));
layout.full = [Math.round(card.width), Math.round(card.height)];
layout.rows = await inCard('#customers .row');
layout.emails = await inCard('#customers .email');
layout.trial = (await inCard('#customers .pill.amber'))[0];
// Thumbnails for the My edits grid.
await big.evaluate(() => document.getElementById('customers').classList.remove('expanded'));
await big.locator('#revenue').screenshot({ path: out('thumb-revenue.png') });
await big.locator('.three').screenshot({ path: out('thumb-stats.png') });
await browser.close();

// The real editor, holding the unrolled list, filling a 4K frame (1280 x 720 at 3x).
const ctx = await chromium.launchPersistentContext('', {
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  viewport: null,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--window-size=1280,807', '--force-device-scale-factor=3'],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
const b64 = readFileSync(out('list-full.png')).toString('base64');
await sw.evaluate(async (b64) => chrome.storage.session.set({
  history: [{ id: 'list', timestamp: Date.now(), source: 'capture', mimeType: 'image/png', size: 1 }],
  'capture:list': `data:image/png;base64,${b64}`,
}), b64);
const editor = ctx.pages()[0] || (await ctx.newPage());
await editor.goto(`chrome-extension://${new URL(sw.url()).host}/editor/editor.html#capture=list`);
await editor.waitForSelector('body[data-ready]');
await editor.fill('#name', 'New customers');
await editor.locator('#name').press('Enter');
await editor.mouse.move(5, 300);
await editor.waitForTimeout(500);
const vp = await editor.evaluate(() => [innerWidth, innerHeight]);
await editor.screenshot({ path: out('editor-clean.png') });
// The two bars with each drawing tool picked (the tool's name slides open next to its icon).
for (const tool of ['blur', 'box', 'arrow']) {
  await editor.click(`[data-tool="${tool}"]`);
  await editor.mouse.move(5, 300);
  await editor.waitForTimeout(600);
  await editor.screenshot({ path: out(`editor-bar-${tool}.png`), clip: { x: 0, y: 0, width: 1280, height: 104 } });
}
await editor.click('[data-tool="select"]');
const bb = await editor.locator('#board').boundingBox();
const zoom = parseInt(await editor.textContent('#zoomLabel'), 10) / 100;
const [fw, fh] = layout.full;
layout.editor = { viewport: vp, zoom, frame: [bb.x + bb.width / 2 - (fw * zoom) / 2, bb.y + bb.height / 2 - (fh * zoom) / 2, fw * zoom, fh * zoom] };
await ctx.close();
server.close();

writeFileSync(out('layout.json'), JSON.stringify(layout, null, 1));
console.log(JSON.stringify(layout));
