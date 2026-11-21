// Checks the landing page video in the built site: not fetched before scrolling, plays once visible.
// Run: (cd ../website && npm run build) && CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node vcheck.mjs
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const site = new URL('../website/out', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = [join(site, path), join(site, path + '.html'), join(site, path, 'index.html')].find((f) => existsSync(f) && extname(f) && statSync(f).isFile());
  if (!file) { res.statusCode = 404; return res.end(); }
  const buf = readFileSync(file);
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.setHeader('accept-ranges', 'bytes');
  const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if (range) {
    const a = +range[1], b = range[2] ? +range[2] : buf.length - 1;
    res.statusCode = 206; res.setHeader('content-range', `bytes ${a}-${b}/${buf.length}`);
    return res.end(buf.subarray(a, b + 1));
  }
  res.end(buf);
});
await new Promise((r) => server.listen(0, r));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fetched = [];
page.on('request', (r) => { if (/demo-loop/.test(r.url())) fetched.push(r.url().split('/').pop()); });
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForTimeout(1500);
console.log('before scrolling:', fetched.join(', ') || 'nothing');
await page.locator('.demo-video').scrollIntoViewIfNeeded();
await page.waitForTimeout(3000);
const playing = await page.evaluate(() => { const v = document.querySelector('.demo-video'); return { paused: v.paused, time: v.currentTime.toFixed(1), size: `${v.videoWidth}x${v.videoHeight}` }; });
console.log('after scrolling:', [...new Set(fetched)].join(', '), playing);
await page.locator('#how-it-works').screenshot({ path: new URL('out/site-section.png', import.meta.url).pathname });
await browser.close();
server.closeAllConnections(); server.close();
