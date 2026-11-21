// Quick look at the built site pages, to pick what the ad shows.
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
const site = new URL('../website/out', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = [join(site, path), join(site, path + '.html'), join(site, path, 'index.html')].find((f) => existsSync(f) && extname(f));
  if (!file) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const O = `http://localhost:${server.address().port}`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
for (const [name, url] of [['home', '/'], ['playground', '/playground'], ['manual', '/manual']]) {
  await p.goto(O + url); await p.waitForTimeout(800);
  await p.screenshot({ path: `ref/${name}.png` });
  await p.screenshot({ path: `ref/${name}-full.png`, fullPage: true });
}
await b.close(); server.close();
