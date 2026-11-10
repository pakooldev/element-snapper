// Drives the real extension against the built playground and checks the images pixel by pixel.
//
//   (cd website && npm run build) && cd tests && npm install && npm run check [case,case...]
//
// Set CHROMIUM_PATH to use an existing Chromium instead of Playwright's own, SHOTS_DIR to keep
// the images, and DPR to try another screen scale (browser zoom changes it the same way, e.g. 1.25). It loads a temp copy of the extension with host_permissions <all_urls>,
// standing in for the activeTab grant of a toolbar click, and starts captures through the same
// messages the panel sends.
import { chromium } from 'playwright';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const repo = new URL('..', import.meta.url).pathname;
const site = join(repo, 'website/out');
if (!existsSync(site)) throw new Error('Build the site first: cd website && npm run build');

const ext = mkdtempSync(join(tmpdir(), 'snapper-ext-'));
for (const p of ['manifest.json', 'background', 'content', 'editor', 'icons']) cpSync(join(repo, p), join(ext, p), { recursive: true });
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json')));
writeFileSync(join(ext, 'manifest.json'), JSON.stringify({ ...manifest, host_permissions: ['<all_urls>'] }));
const CONTENT_FILES = manifest.content_scripts?.[0]?.js ??
  readFileSync(join(repo, 'background/service_worker.js'), 'utf8').match(/files: \[([^\]]*content\/utils\.js[^\]]*)\]/)[1].match(/content\/[\w-]+\.js/g).filter((f) => f !== 'content/panel.js');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  // ?slow=ms stands in for a slow network, for the lazy image case.
  const slow = Number(new URL(req.url, 'http://x').searchParams.get('slow'));
  if (slow) await new Promise((r) => setTimeout(r, slow));
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = [join(site, path), join(site, path + '.html'), join(site, path, 'index.html')].find((f) => existsSync(f) && extname(f));
  if (!file) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const ORIGIN = `http://localhost:${server.address().port}`;
// Any http:// host but localhost is not a secure context, so it has no navigator.clipboard.
const INSECURE_ORIGIN = `http://snapper.test:${server.address().port}`;

const DPR = Number(process.env.DPR || 2);
const ctx = await chromium.launchPersistentContext('', {
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chromium' }),
  headless: true,
  viewport: null,
  // Real scrollbars, as on Windows: headless hides them by default.
  ignoreDefaultArgs: ['--hide-scrollbars'],
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--window-size=1280,860', `--force-device-scale-factor=${DPR}`, '--host-resolver-rules=MAP snapper.test 127.0.0.1'],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
await sw.evaluate(() => {
  self.__result = null;
  // Keep the bytes instead of really downloading.
  downloadImage = async (blob, _filename, dataUrl) => { self.__result = { dataUrl: dataUrl || (await blobToDataURL(blob)) }; };
  chrome.runtime.onMessage.addListener((m) => {
    if (m.action === 'captureError') self.__result = { error: m.error };
    if (m.action === 'captureSuccess' && m.message) self.__result = { message: m.message };
  });
  return chrome.storage.local.set({ outputMode: 'download', showPreview: false, format: 'png', delay: 0 });
});

const page = ctx.pages()[0] || (await ctx.newPage());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

// The pixels are read in a blank tab, which can decode an image of any size.
const pixels = await ctx.newPage();
await pixels.goto(`${ORIGIN}/favicon.png`);
await page.bringToFront();

const send = (msg) => sw.evaluate(async ({ url, msg, files }) => {
  const [tab] = await chrome.tabs.query({ url });
  if (!tab.__injected) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
  self.__result = null;
  chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
}, { url: page.url().split('#')[0], msg, files: CONTENT_FILES });

async function waitForImage() {
  for (let i = 0; i < 240; i++) {
    const r = await sw.evaluate(() => self.__result && (self.__result.error ? { error: self.__result.error } : { ready: true }));
    if (r?.error) throw new Error(`capture error: ${r.error}`);
    if (r) break;
    if (i === 239) throw new Error('no image after 120s');
    await page.waitForTimeout(500);
  }
  const dataUrl = await sw.evaluate(() => self.__result.dataUrl);
  const name = currentCase;
  if (process.env.SHOTS_DIR) {
    mkdirSync(process.env.SHOTS_DIR, { recursive: true });
    writeFileSync(join(process.env.SHOTS_DIR, `${name}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  return readImage(dataUrl);
}

/** Decodes an image so its pixels can be read. */
async function readImage(dataUrl) {
  const size = await pixels.evaluate(async (url) => {
    window.bitmap?.close();
    window.bitmap = await createImageBitmap(await (await fetch(url)).blob());
    window.canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    window.ctx2d = canvas.getContext('2d', { willReadFrequently: true });
    ctx2d.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height };
  }, dataUrl);
  return {
    ...size,
    /** RGB of every pixel in a column, top to bottom. */
    column: (x) => pixels.evaluate((x) => Array.from(ctx2d.getImageData(x, 0, 1, canvas.height).data), Math.round(x)).then(chunk),
    /** RGB of every pixel in a row, left to right. */
    row: (y) => pixels.evaluate((y) => Array.from(ctx2d.getImageData(0, y, canvas.width, 1).data), Math.round(y)).then(chunk),
  };
}
const chunk = (data) => { const out = []; for (let i = 0; i < data.length; i += 4) out.push([data[i], data[i + 1], data[i + 2]]); return out; };

const near = (a, b, tolerance = 14) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
const bands = (line, color) => {
  const found = [];
  let start = -1;
  line.forEach((px, i) => {
    const on = near(px, color);
    if (on && start < 0) start = i;
    if (!on && start >= 0) { found.push([start, i - start]); start = -1; }
  });
  if (start >= 0) found.push([start, line.length - start]);
  return found;
};

// The two ruler stripes over the page background.
const STRIPE_A = [27, 53, 99];
const STRIPE_B = [32, 33, 70];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];

/** Stripes in a column: any repeat, seam, gap or stretch shows as a wrong run length or order. */
function checkRuler(line, cssHeight, scale = DPR, label = 'ruler') {
  const runs = [];
  line.forEach((px) => {
    const kind = near(px, STRIPE_A) ? 'A' : near(px, STRIPE_B) ? 'B' : null;
    if (!kind) return void (runs.length && runs[runs.length - 1].kind !== '-' && runs.push({ kind: '-', n: 0 }));
    const last = runs[runs.length - 1];
    if (last?.kind === kind) last.n++;
    else if (last?.kind === '-') { last.kind = kind; last.n = 1; }
    else runs.push({ kind, n: 1 });
  });
  while (runs.length && runs[runs.length - 1].kind === '-') runs.pop();
  const stripes = runs.filter((r) => r.kind !== '-');
  const expected = Math.round(cssHeight / 100);
  if (stripes.length !== expected) throw new Error(`${label}: ${stripes.length} stripes, expected ${expected}`);
  const size = 100 * scale;
  const worst = stripes.reduce((m, r) => Math.max(m, Math.abs(r.n - size)), 0);
  if (worst > 3) throw new Error(`${label}: a stripe is off by ${worst}px (expected ${size}px each)`);
  for (let i = 1; i < stripes.length; i++) {
    if (stripes[i].kind === stripes[i - 1].kind) throw new Error(`${label}: stripes ${i - 1} and ${i} repeat`);
  }
}
const ok = (cond, message) => { if (!cond) throw new Error(message); };
const closeTo = (a, b, what, tolerance = 4) => ok(Math.abs(a - b) <= tolerance, `${what}: ${a}, expected ${b}`);

async function open(path, origin = ORIGIN) {
  await page.goto(origin + path, { waitUntil: 'load' });
  await page.waitForTimeout(300);
}

const capturePage = async () => { await send({ action: 'captureFullPage' }); return waitForImage(); };

/**
 * Clicks a point through the real selection flow. `locate` runs in the page and returns a rect.
 * `keys` are pressed while hovering, before the click.
 */
async function captureElement(locate, { scrollElement = true, arg, keys = [] } = {}) {
  await sw.evaluate((v) => chrome.storage.local.set({ fullCapture: v }), scrollElement);
  await send({ action: 'startSelection' });
  await page.waitForTimeout(250);
  const r = await page.evaluate(locate, arg);
  const x = r.x, y = r.y;
  await page.mouse.move(x - 2, y);
  await page.mouse.move(x, y);
  await page.waitForTimeout(100);
  for (const key of keys) await page.keyboard.press(key);
  await page.mouse.click(x, y);
  return waitForImage();
}
const boxOf = (selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, selector);
const setOutput = (outputMode) => sw.evaluate((outputMode) => chrome.storage.local.set({ outputMode }), outputMode);
const stripedPoint = (selector) => {
  const r = document.querySelector(selector).getBoundingClientRect();
  return { x: Math.min(r.right, innerWidth) - 40, y: Math.min(Math.max(r.top, 0) + 150, innerHeight - 20) };
};

const presses = () => page.evaluate(() => Number(document.querySelector('[data-presses]')?.dataset.presses ?? 0));

const selectable = (id, css) => async () => {
  await open('/playground/selection-targets');
  const expected = await page.evaluate((id) => {
    const el = id === 'shadow-btn' ? document.querySelector('#shadow-host > div').shadowRoot.querySelector('button') : document.getElementById(id);
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, x: r.left + 10, y: r.top + r.height / 2 };
  }, id);
  const img = await captureElement((p) => p, { scrollElement: false, arg: expected });
  closeTo(img.w, expected.w * DPR, `${css} width`);
  closeTo(img.h, expected.h * DPR, `${css} height`);
  ok((await presses()) === 0, `the page saw ${await presses()} presses`);
  ok(new URL(page.url()).hash === '', 'the link navigated');
  ok(await page.evaluate(() => document.activeElement === document.body), 'something took focus');
};

const CASES = {
  'select disabled button': selectable('disabled-btn', 'disabled button'),
  'select disabled input': selectable('disabled-input', 'disabled input'),
  'select <select> without opening it': selectable('native-select', '<select>'),
  'select text input without focusing it': selectable('text-input', 'text input'),
  'select link without following it': selectable('plain-link', 'link'),
  'select inside a shadow root': selectable('shadow-btn', 'shadow button'),

  async 'area ignores page hover and press'() {
    await open('/playground/press-sensitive');
    await sw.evaluate(() => chrome.storage.local.set({ fullCapture: false }));
    await send({ action: 'startRegionSelection' });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => { const b = document.querySelector('.pg-press-grid').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    await page.mouse.move(r.x + 20, r.y + 20);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.mouse.move(r.x + r.w - 20, r.y + r.h - 20, { steps: 6 });
    await page.mouse.up();
    const img = await waitForImage();
    closeTo(img.w, (r.w - 40) * DPR, 'width');
    closeTo(img.h, (r.h - 40) * DPR, 'height');
    const reds = (await img.row(img.h - 6)).filter((px) => near(px, RED)).length + (await img.column(img.w - 6)).filter((px) => near(px, RED)).length;
    ok(reds === 0, 'a hover style is in the image');
    ok((await presses()) === 0, `the page saw ${await presses()} presses`);
  },

  async 'filled parent: arrow up selects the parent'() {
    await open('/playground/filled-parent');
    const card = await boxOf('.pg-filled');
    const img = await captureElement(() => { const r = document.querySelector('.pg-filled-link').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 40 }; }, { scrollElement: false, keys: ['ArrowUp'] });
    closeTo(img.w, card.w * DPR, 'width');
    closeTo(img.h, card.h * DPR, 'height');
    ok(near((await img.row(img.h / 2))[2], AMBER), 'the card border is missing');
    ok(new URL(page.url()).hash === '', 'the link navigated');
  },
  async 'filled parent: arrow down goes back to the child'() {
    await open('/playground/filled-parent');
    const link = await boxOf('.pg-filled-link');
    const img = await captureElement(() => { const r = document.querySelector('.pg-filled-link').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 40 }; }, { scrollElement: false, keys: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'] });
    closeTo(img.w, link.w * DPR, 'width');
    closeTo(img.h, link.h * DPR, 'height');
  },
  async 'top layer: highlight shows over a modal dialog'() {
    await open('/playground/top-layer');
    const box = await boxOf('#dialog-box');
    await sw.evaluate(() => chrome.storage.local.set({ fullCapture: false }));
    await send({ action: 'startSelection' });
    await page.waitForTimeout(250);
    const strip = { x: box.x - 4, y: box.y - 4, width: box.w + 8, height: 8 };
    const before = await page.screenshot({ clip: strip });
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.waitForTimeout(200);
    const after = await page.screenshot({ clip: strip });
    await page.keyboard.press('Escape');
    ok(!before.equals(after), 'nothing drawn over the dialog: the highlight is behind it');
  },
  async 'top layer: capture a box in a modal dialog'() {
    await open('/playground/top-layer');
    const box = await boxOf('#dialog-box');
    const img = await captureElement(() => { const r = document.querySelector('#dialog-box').getBoundingClientRect(); return { x: r.left + 30, y: r.top + 30 }; }, { scrollElement: false });
    closeTo(img.w, box.w * DPR, 'width');
    closeTo(img.h, box.h * DPR, 'height');
    ok(near((await img.row(img.h - 6))[img.w - 6], AMBER), 'the box is not in the image');
  },
  async 'top layer: area selection over a modal dialog'() {
    await open('/playground/top-layer');
    const box = await boxOf('#dialog-box');
    const strip = { x: box.x + 10, y: box.y + 16, width: box.w - 20, height: 8 }; // Across the selection's top edge
    const before = await page.screenshot({ clip: strip });
    await send({ action: 'startRegionSelection' });
    await page.waitForTimeout(250);
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w - 20, box.y + box.h - 20, { steps: 6 });
    const during = await page.screenshot({ clip: strip });
    await page.mouse.up();
    ok(!before.equals(during), 'nothing drawn over the dialog: the selection is behind it');
    const img = await waitForImage();
    closeTo(img.w, (box.w - 40) * DPR, 'width');
    closeTo(img.h, (box.h - 40) * DPR, 'height');
    ok(near((await img.row(img.h / 2))[img.w / 2], AMBER), 'the box is not in the image');
  },
  async 'top layer: the panel works while a modal dialog is open'() {
    await open('/playground/top-layer');
    await sw.evaluate(async ({ url, files }) => {
      const [tab] = await chrome.tabs.query({ url });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [...files, 'content/panel.js'] });
      self.__result = null;
    }, { url: page.url(), files: CONTENT_FILES });
    await page.waitForTimeout(400);
    const button = await page.evaluate(() => {
      const r = document.getElementById('__element-snapper-panel-host__').shadowRoot.getElementById('captureViewportBtn').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.click(button.x, button.y);
    const img = await waitForImage();
    ok(img.w > 0, 'no image');
  },

  async 'fade-in'() {
    await open('/playground/fade-in');
    const img = await capturePage();
    const blocks = bands(await img.column(img.w - 80), AMBER);
    ok(blocks.length === 5, `${blocks.length} fully shown blocks, expected 5`);
    for (const [, h] of blocks) closeTo(h, 300 * DPR, 'block height', 6);
  },
  async 'lazy-images'() {
    await open('/playground/lazy-images');
    const x = (await boxOf('.pg-lazy')).x + 100;
    const img = await capturePage();
    const squares = bands(await img.column(x * DPR), AMBER);
    ok(squares.length === 5, `${squares.length} loaded images, expected 5`);
  },
  async 'looping-animation'() {
    await open('/playground/looping-animation');
    const img = await capturePage();
    const line = await img.column(img.w - 80);
    const red = line.filter((px) => near(px, RED)).length;
    const amber = line.filter((px) => near(px, AMBER)).length;
    ok(red === 0 || amber === 0, `${bands(line, RED).length} red and ${bands(line, AMBER).length} amber bands, expected one color`);
  },
  async 'infinite-scroll'() {
    await open('/playground/infinite-scroll');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const img = await capturePage();
    closeTo(img.h, height * DPR, 'height');
    checkRuler(await img.column(img.w - 80), 3000);
  },
  async 'rtl-table'() {
    await open('/playground/rtl-table');
    const expected = await page.evaluate(() => { const r = document.querySelector('.pg-table').getBoundingClientRect(); const th = document.querySelector('.pg-table th').getBoundingClientRect(); return { w: r.width, h: r.height, thY: th.top - r.top + th.height / 2 }; });
    const img = await captureElement(() => { const r = document.querySelector('.pg-table-wrap').getBoundingClientRect(); return { x: r.right - 5, y: r.top + 5 }; });
    closeTo(img.w, expected.w * DPR, 'width');
    closeTo(img.h, expected.h * DPR, 'height');
    const cells = bands(await img.row(expected.thY * DPR - 16), [30, 41, 59]);
    ok(cells.length === 12, `${cells.length} columns, expected 12`);
    const widths = cells.map((c) => c[1]);
    ok(Math.max(...widths) / Math.min(...widths) < 1.4, `column widths differ too much: ${widths}`);
  },
  async 'classic scrollbars: element'() {
    await open('/playground/classic-scrollbars');
    const box = await boxOf('#edge-box');
    const img = await captureElement(() => { const r = document.querySelector('#edge-box').getBoundingClientRect(); return { x: r.left + 60, y: r.top + 60 }; }, { scrollElement: false });
    closeTo(img.w, box.w * DPR, 'width');
    const row = await img.row(img.h / 2);
    ok(near(row[1], RED) && near(row[row.length - 2], RED), `edges are ${row[1]} and ${row[row.length - 2]}, expected red`);
  },
  async 'classic scrollbars: page'() {
    await open('/playground/classic-scrollbars');
    const img = await capturePage();
    checkRuler(await img.column(img.w / 2), 3000); // Clear of the red-edged box
  },
  async 'graphics'() {
    await open('/playground/graphics');
    const y = (await boxOf('.pg-graphics')).y + 80;
    const img = await capturePage();
    const row = await img.row(y * DPR);
    for (const [name, color] of [['canvas', RED], ['WebGL', [59, 130, 246]], ['SVG', [16, 185, 129]]]) {
      ok(bands(row, color).some(([, w]) => Math.abs(w - 240 * DPR) <= 4), `the ${name} block is missing`);
    }
  },
  async 'image opened directly'() {
    await open('/playground/amber.png');
    const img = await capturePage();
    // Chrome centers an image opened on its own.
    ok(near((await img.row(img.h / 2))[img.w / 2], AMBER), 'the image is not in the capture');
  },
  async 'copy image on an http page'() {
    await open('/playground/graphics', INSECURE_ORIGIN);
    await setOutput('copyImage');
    try {
      await send({ action: 'captureViewport' });
      const img = await waitForImage();
      ok(img.w > 0, 'no image');
      await page.waitForTimeout(300);
      const note = await page.evaluate(() => document.getElementById('element-screenshot-notification')?.textContent.trim());
      ok(/Saved to Downloads instead/.test(note || ''), `notice: ${note}`);
    } finally {
      await setOutput('download');
    }
  },
  async 'copy as prompt on an http page'() {
    await open('/playground/filled-parent', INSECURE_ORIGIN);
    await setOutput('copyPrompt');
    try {
      await send({ action: 'startSelection' });
      await page.waitForTimeout(250);
      const link = await boxOf('.pg-filled-link');
      await page.mouse.move(link.x + 40, link.y + 40);
      await page.mouse.click(link.x + 40, link.y + 40);
      let result;
      for (let i = 0; i < 20 && !result; i++) { await page.waitForTimeout(100); result = await sw.evaluate(() => self.__result); }
      ok(result && !result.error, `copy failed: ${result?.error || 'no answer'}`);
      // Read it back from a secure page.
      await ctx.grantPermissions(['clipboard-read'], { origin: ORIGIN });
      await pixels.bringToFront();
      const text = await pixels.evaluate(() => navigator.clipboard.readText());
      await page.bringToFront();
      ok(text.includes('pg-filled-link'), `clipboard holds: ${text.slice(0, 80)}`);
    } finally {
      await setOutput('download');
    }
  },

  async 'editor: each tool then undo and download'() {
    // A 400 × 300 CSS px capture, amber on the left half and blue on the right.
    await sw.evaluate(async (dpr) => {
      const canvas = new OffscreenCanvas(400 * dpr, 300 * dpr);
      const c = canvas.getContext('2d');
      c.fillStyle = '#f59e0b';
      c.fillRect(0, 0, 200 * dpr, 300 * dpr);
      c.fillStyle = '#3b82f6';
      c.fillRect(200 * dpr, 0, 200 * dpr, 300 * dpr);
      await chrome.storage.session.set({ 'capture:edit-check': await blobToDataURL(await canvas.convertToBlob({ type: 'image/png' })) });
    }, DPR);
    const editor = await ctx.newPage();
    try {
      await editor.goto(`chrome-extension://${new URL(sw.url()).host}/editor/editor.html#edit-check`);
      await editor.waitForSelector('#frame:not([hidden])');
      const at = await editor.locator('#sketch').boundingBox();
      ok(Math.abs(at.width - 400) < 1, `shown ${at.width}px wide, expected 400`);
      const dragOn = async (tool, x1, y1, x2, y2) => {
        await editor.click(`[data-tool="${tool}"]`);
        await editor.mouse.move(at.x + x1, at.y + y1);
        await editor.mouse.down();
        await editor.mouse.move(at.x + x2, at.y + y2, { steps: 4 });
        await editor.mouse.up();
      };
      await dragOn('redact', 20, 20, 80, 80);
      await dragOn('blur', 170, 150, 230, 210);
      await dragOn('box', 260, 40, 340, 120);
      await dragOn('arrow', 300, 250, 360, 200);
      await editor.click('[data-tool="text"]');
      await editor.mouse.click(at.x + 30, at.y + 230);
      await editor.keyboard.type('Hello');
      await editor.keyboard.press('Enter');
      if (process.env.SHOTS_DIR) await editor.screenshot({ path: join(process.env.SHOTS_DIR, 'editor-before-undo.png') });
      ok(await editor.evaluate(() => !document.querySelector('.text-input')), 'the text field stayed open');
      await editor.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); // Takes the text away again
      await dragOn('crop', 10, 10, 390, 290);
      if (process.env.SHOTS_DIR) await editor.screenshot({ path: join(process.env.SHOTS_DIR, 'editor-page.png') });
      const [download] = await Promise.all([editor.waitForEvent('download'), editor.click('#download')]);
      if (process.env.SHOTS_DIR) await download.saveAs(join(process.env.SHOTS_DIR, 'editor-download.png'));
      const img = await readImage(`data:image/png;base64,${readFileSync(await download.path()).toString('base64')}`);
      const px = async (x, y) => (await img.row((y - 10) * DPR))[Math.round((x - 10) * DPR)];
      closeTo(img.w, 380 * DPR, 'cropped width');
      closeTo(img.h, 280 * DPR, 'cropped height');
      ok(near(await px(50, 50), [0, 0, 0]), `redacted area is ${await px(50, 50)}`);
      const mixed = await px(200, 180);
      ok(!near(mixed, AMBER, 30) && !near(mixed, [59, 130, 246], 30), `blurred edge is ${mixed}, not blended`);
      ok(near(await px(260, 80), RED, 30), `box edge is ${await px(260, 80)}`);
      ok(near(await px(32, 240), AMBER), 'the undone text is still there');
      ok(near(await px(120, 150), AMBER) && near(await px(320, 150), [59, 130, 246]), 'the image around the edits changed');
    } finally {
      await editor.close();
      await page.bringToFront();
    }
  },

  async 'main page, page mode'() {
    await open('/playground');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const img = await capturePage();
    closeTo(img.h, height * DPR, 'height');
  },
  async 'section 2, sticky header stays off the element'() {
    await open('/playground');
    await page.evaluate(() => document.querySelector('.pg-tall').scrollIntoView({ behavior: 'instant', block: 'start' }));
    const img = await captureElement(stripedPoint, { arg: '.pg-tall' });
    closeTo(img.h, 2000 * DPR, 'height');
    const line = await img.column(img.w - 40);
    const dark = line.filter(([r]) => r < 180).length;
    ok(dark === 0, `${dark} rows of something dark over the box`);
  },
  async 'section 5, content of a scrolling box'() {
    await open('/playground');
    await page.evaluate(() => document.querySelector('.pg-scroll').scrollIntoView({ behavior: 'instant', block: 'center' }));
    const img = await captureElement(stripedPoint, { arg: '.pg-scroll' });
    closeTo(img.h, 900 * DPR, 'height');
    const colors = new Set((await img.column(img.w - 40)).map((px) => px.join()));
    ok(colors.size <= 3, `${colors.size} colors where only the box background should be`);
  },
  async 'app-shell'() {
    await open('/playground/app-shell');
    const m = await page.evaluate(() => { const s = document.querySelector('.pg-shell-main'); return { extra: s.scrollHeight - s.clientHeight, top: document.querySelector('.pg-ruler').getBoundingClientRect().top, x: s.getBoundingClientRect().right, side: document.querySelector('.pg-shell-side').getBoundingClientRect().width }; });
    const img = await capturePage();
    closeTo(img.h, (innerHeightCss + m.extra) * DPR, 'height');
    checkRuler(await img.column((m.x - 40) * DPR), 4000);
    ok(near((await img.column(20))[20], [30, 41, 59]), 'the sidebar is missing');
  },
  async 'body-scroll'() {
    await open('/playground/body-scroll');
    const img = await capturePage();
    checkRuler(await img.column(img.w - 80), 4000);
  },
  async 'scroll-snap'() {
    await open('/playground/scroll-snap');
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, s: document.querySelectorAll('.pg-snap-section')[3].getBoundingClientRect().height }));
    const img = await capturePage();
    closeTo(img.h, m.h * DPR, 'height');
    const lines = bands(await img.column(img.w - 80), [59, 130, 246]);
    ok(lines.length === 8, `${lines.length} section borders, expected 8`);
    for (let i = 2; i < lines.length; i++) closeTo(lines[i][0] - lines[i - 1][0], m.s * DPR, `section ${i + 1} height`);
  },
  async 'tall-in-scroller'() {
    await open('/playground/tall-in-scroller');
    const img = await captureElement(stripedPoint, { arg: '.pg-scroll-tall .pg-ruler' });
    closeTo(img.h, 1500 * DPR, 'height');
    checkRuler(await img.column(img.w - 40), 1500);
  },
  async 'wide-table'() {
    await open('/playground/wide-table');
    const expected = await page.evaluate(() => { const r = document.querySelector('.pg-table').getBoundingClientRect(); const th = document.querySelector('.pg-table th').getBoundingClientRect(); return { w: r.width, h: r.height, thY: th.top - r.top + th.height / 2 }; });
    const img = await captureElement(() => { const r = document.querySelector('.pg-table').getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; });
    closeTo(img.w, expected.w * DPR, 'width');
    closeTo(img.h, expected.h * DPR, 'height');
    const cells = bands(await img.row(expected.thY * DPR - 16), [30, 41, 59]);
    ok(cells.length === 12, `${cells.length} columns, expected 12`);
    const widths = cells.map((c) => c[1]);
    ok(Math.max(...widths) / Math.min(...widths) < 1.4, `column widths differ too much: ${widths}`);
  },
  async 'smooth-scroll'() {
    await open('/playground/smooth-scroll');
    const img = await captureElement(stripedPoint, { arg: '.pg-ruler' });
    closeTo(img.h, 3000 * DPR, 'height');
    checkRuler(await img.column(img.w - 40), 3000);
  },
  async 'sticky-sections'() {
    await open('/playground/sticky-sections');
    const m = await page.evaluate(() => { const side = document.querySelector('.pg-sticky-side').getBoundingClientRect(); return { x: side.left + 6 }; }); // Left of the sidebar's text
    const img = await capturePage();
    const main = await img.column(img.w - 80);
    const headings = bands(main, AMBER);
    ok(headings.length === 4, `${headings.length} section headings, expected 4`);
    for (let i = 1; i < 4; i++) closeTo(headings[i][0] - headings[i - 1][0], (1500 + headings[0][1] / DPR) * DPR, `heading ${i + 1} position`, 8);
    const side = bands(await img.column(m.x * DPR), [30, 41, 59]);
    ok(side.length === 1, `${side.length} sidebars, expected 1`);
  },
  async 'tall-modal'() {
    await open('/playground/tall-modal');
    const img = await captureElement(stripedPoint, { arg: '.pg-modal .pg-ruler' });
    closeTo(img.h, 1800 * DPR, 'height');
    checkRuler(await img.column(img.w - 40), 1800);
  },
  async 'late-fixed'() {
    await open('/playground/late-fixed');
    const img = await capturePage();
    ok(bands(await img.column(20), AMBER).length === 1, 'the header repeats');
    const chips = await img.column(img.w - 90);
    ok(bands(chips, RED).length <= 2, `${bands(chips, RED).length} chip bands, expected at most 2`);
    checkRuler(await img.column(img.w - 900), 5000);
  },
  async 'shadow-fixed'() {
    await open('/playground/shadow-fixed');
    const img = await capturePage();
    // Clear of the labels and the banner's text, anything that isn't a stripe is the intro or a banner.
    const others = [];
    (await img.column(img.w - 150)).forEach((px, y, line) => {
      const stripe = (p) => near(p, STRIPE_A) || near(p, STRIPE_B);
      if (!stripe(px) && (y === 0 || stripe(line[y - 1]))) others.push(y);
    });
    ok(others.length <= 2, `${others.length - 1} banners, expected at most 1`);
  },
  async 'long-page'() {
    await open('/playground/long-page');
    const img = await capturePage();
    ok(img.h <= 16384, `image is ${img.h}px tall`);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const scale = Math.min(DPR, 16384 / height); // Scaled down only past the canvas limit
    closeTo(img.h, Math.round(height * scale), 'height');
    checkRuler(await img.column(img.w - 80), 12000, scale, 'ruler');
  },
  async 'page mode starting from the bottom of the page'() {
    await open('/playground/sticky-sections');
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const img = await capturePage();
    closeTo(img.h, height * DPR, 'height');
    ok(bands(await img.column(img.w - 80), AMBER).length === 4, 'section headings are missing');
  },
  async 'element cut off by its parent, Scroll Element off'() {
    await open('/playground/tall-in-scroller');
    const box = await page.evaluate(() => { const r = document.querySelector('.pg-scroll-tall').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const img = await captureElement(stripedPoint, { arg: '.pg-scroll-tall .pg-ruler', scrollElement: false });
    closeTo(img.h, box.h * DPR, 'height');
    closeTo(img.w, box.w * DPR, 'width');
    const red = (await img.column(img.w - 40)).filter((px) => near(px, RED)).length;
    ok(red === 0, 'the page below the box is in the image');
  },
  async 'switching tabs stops the capture and restores the page'() {
    await open('/playground/sticky-sections');
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await send({ action: 'captureFullPage' });
    await page.waitForTimeout(1000);
    await pixels.bringToFront();
    let message = '';
    try { await waitForImage(); } catch (error) { message = error.message; }
    await page.bringToFront();
    ok(message.includes('tab was switched'), `expected the capture to stop, got: ${message || 'an image'}`);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ y: scrollY, position: getComputedStyle(document.querySelector('.pg-sticky-heading')).position }));
    ok(after.y === 300 && after.position === 'sticky', `page not restored: ${JSON.stringify(after)}`);
  },
  async 'started from the panel, which stays out of the image'() {
    await open('/playground/late-fixed');
    await sw.evaluate(async ({ url, files }) => {
      const [tab] = await chrome.tabs.query({ url });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [...files, 'content/panel.js'] });
      self.__result = null;
    }, { url: page.url(), files: CONTENT_FILES });
    await page.waitForTimeout(300);
    const panel = await page.evaluate(() => {
      const host = document.getElementById('__element-snapper-panel-host__');
      host.shadowRoot.getElementById('captureFullPageBtn').click();
      const r = host.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + 100 };
    });
    const img = await waitForImage();
    const blue = (await img.row(panel.y * DPR)).filter((px) => near(px, [59, 130, 246], 30)).length;
    ok(blue < 100, 'the panel is in the image');
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.getElementById('__element-snapper-panel-host__').style.display !== 'none'), 'the panel did not come back');
  },
  async 'page state comes back after a capture'() {
    await open('/playground/sticky-sections');
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
    await capturePage();
    const after = await page.evaluate(() => ({ y: scrollY, position: getComputedStyle(document.querySelector('.pg-sticky-heading')).position, visibility: getComputedStyle(document.querySelector('.pg-sticky-side')).visibility, leftover: document.querySelector('#element-screenshot-capture-styles') !== null }));
    ok(after.y === 700, `scrolled to ${after.y}, expected 700`);
    ok(after.position === 'sticky', `heading is ${after.position}`);
    ok(after.visibility === 'visible', 'sidebar stayed hidden');
    ok(!after.leftover, 'capture styles left behind');
  },
};

let innerHeightCss = 0;
let currentCase = '';
await open('/playground');
innerHeightCss = await page.evaluate(() => innerHeight);

const only = process.argv[2]?.split(',');
let failed = 0;
for (const [name, run] of Object.entries(CASES)) {
  if (only && !only.includes(name)) continue;
  currentCase = name.replace(/[^\w-]+/g, '-');
  try {
    await run();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}: ${error.message.split('\n')[0]}`);
  }
}
if (pageErrors.length) console.log('page errors:', pageErrors.slice(0, 5));
await ctx.close();
server.close();
process.exit(failed ? 1 : 0);
