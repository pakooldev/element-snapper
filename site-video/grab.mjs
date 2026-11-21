// Real screenshots of the extension for the site video: the panel on a sample page,
// the hover highlight, the preview, the editor with marks, and My edits.
// Run: CHROMIUM_PATH=... node grab.mjs   (writes ref/*.png)
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const repo = new URL('..', import.meta.url).pathname;
const ext = mkdtempSync(join(tmpdir(), 'snapper-ext-'));
for (const p of ['manifest.json', 'background', 'content', 'editor', 'icons']) cpSync(join(repo, p), join(ext, p), { recursive: true });
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json')));
writeFileSync(join(ext, 'manifest.json'), JSON.stringify({ ...manifest, host_permissions: ['<all_urls>'] }));
const FILES = ['content/utils.js', 'content/element_selector.js', 'content/region_selector.js', 'content/content-main.js', 'content/preview.js', 'content/panel.js'];

const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const file = join(here, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(file) || !extname(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = `http://localhost:${server.address().port}`;

const ctx = await chromium.launchPersistentContext('', {
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  viewport: null,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--window-size=1440,900', '--force-device-scale-factor=2'],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
await sw.evaluate(() => {
  downloadImage = async () => {}; // keep the file off the disk
  return chrome.storage.local.set({ outputMode: 'download', showPreview: true, format: 'png', delay: 0 });
});
const shot = (p, name, opts = {}) => p.screenshot({ path: join(here, 'ref', `${name}.png`), ...opts });

const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(`${ORIGIN}/scene/page.html`);
await page.waitForTimeout(500);
await shot(page, 'page');
await sw.evaluate(async ({ url, files }) => {
  const [tab] = await chrome.tabs.query({ url });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
}, { url: page.url(), files: FILES });
await page.waitForTimeout(800);
await shot(page, 'panel');

// Element mode: hover the gap between the two cards, which is the grid itself.
await page.click('text=Select Element');
await page.waitForTimeout(400);
const grid = await page.locator('.grid').boundingBox();
const rev = await page.locator('#revenue').boundingBox();
const gapX = rev.x + rev.width + 10;
await page.mouse.move(rev.x + 200, rev.y + 120, { steps: 5 });
await page.waitForTimeout(300);
await shot(page, 'hover-card');
await page.mouse.move(gapX, grid.y + 60, { steps: 5 });
await page.waitForTimeout(300);
await shot(page, 'hover-grid');
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(2500);
await shot(page, 'preview');

// Where the marks go, in the capture's CSS px.
const rel = async (sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return { x: b.x - grid.x, y: b.y - grid.y, w: b.width, h: b.height };
};
const big = await rel('#revenue .big');
const bars = await rel('.chart span:last-child');
const emails = await rel('#customers');

const [{ id }] = (await sw.evaluate(() => chrome.storage.session.get('history'))).history.slice(-1);
const editorUrl = `chrome-extension://${new URL(sw.url()).host}/editor`;
const editor = await ctx.newPage();
editor.on('dialog', (d) => d.accept());
await editor.goto(`${editorUrl}/editor.html#capture=${id}`);
await editor.waitForSelector('body[data-ready]');
const board = await editor.locator('#board').boundingBox();
// Opened to fit, centered: read the scale off the zoom label.
const zoom = parseInt(await editor.textContent('#zoomLabel'), 10) / 100;
const at = (x, y) => ({ x: board.x + board.width / 2 + (x - grid.width / 2) * zoom, y: board.y + board.height / 2 + (y - grid.height / 2) * zoom });
const drag = async (a, b) => {
  const p = at(...a), q = at(...b);
  await editor.mouse.move(p.x, p.y); await editor.mouse.down();
  await editor.mouse.move(q.x, q.y, { steps: 6 }); await editor.mouse.up();
};
await editor.click('[data-tool="box"]');
await editor.click('[data-color="#22c55e"]');
await drag([big.x - 10, big.y - 8], [big.x + big.w + 110, big.y + big.h + 8]);
await editor.click('[data-tool="arrow"]');
await editor.click('[data-color="#ef4444"]');
await drag([bars.x - 160, bars.y + 90], [bars.x - 8, bars.y + 10]);
await editor.click('[data-tool="blur"]');
const e1 = emails.y + 40;
await drag([emails.x + 20, e1 + 22], [emails.x + 200, emails.y + emails.h - 14]);
await editor.keyboard.press('v');
await editor.mouse.move(board.x + 10, board.y + 10);
await editor.waitForTimeout(900);
await shot(editor, 'editor');

// Two more edits so My edits looks like real use.
for (const [sel, color, tool] of [['#revenue', '#3b82f6', 'box'], ['.three', '#a855f7', 'arrow']]) {
  const png = await page.locator(sel).screenshot();
  const cid = `extra-${sel.replace(/\W/g, '')}`;
  await sw.evaluate(async ({ cid, b64 }) => {
    const { history = [] } = await chrome.storage.session.get('history');
    await chrome.storage.session.set({ history: [...history, { id: cid, timestamp: Date.now(), source: 'capture', mimeType: 'image/png', size: 1 }], [`capture:${cid}`]: `data:image/png;base64,${b64}` });
  }, { cid, b64: png.toString('base64') });
  await editor.goto(`${editorUrl}/editor.html#capture=${cid}`);
  await editor.reload();
  await editor.waitForSelector('body[data-ready]');
  const bb = await editor.locator('#board').boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await editor.click(`[data-tool="${tool}"]`);
  await editor.click(`[data-color="${color}"]`);
  await editor.mouse.move(cx - 120, cy - 40); await editor.mouse.down();
  await editor.mouse.move(cx + 60, cy + 30, { steps: 6 }); await editor.mouse.up();
  await editor.waitForTimeout(900);
}
await editor.goto(`${editorUrl}/home.html`);
await editor.waitForSelector('body[data-ready]');
await editor.waitForTimeout(500);
await shot(editor, 'my-edits');

await ctx.close();
server.close();
