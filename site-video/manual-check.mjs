// Screenshots the built manual: the home panel callouts and the editor step. Writes out/manual-*.png.
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const site = new URL('../website/out', import.meta.url).pathname;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = [join(site, path), join(site, path + '.html'), join(site, path, 'index.html')].find((f) => existsSync(f) && extname(f) && statSync(f).isFile());
  if (!file) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', T[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const logs = []; p.on('console', (m) => logs.push(m.text()));
await p.goto(`http://localhost:${server.address().port}/manual`); await p.waitForTimeout(800);
const steps = p.locator('.manual-step');
await steps.nth(1).screenshot({ path: 'out/manual-home.png' });
await steps.nth(3).scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await steps.nth(3).screenshot({ path: 'out/manual-editor.png' });
await p.locator('.manual-tips').screenshot({ path: 'out/manual-tips.png' });
console.log('console:', logs.filter((l) => /badge|error/i.test(l)).join(' | ') || 'clean');
await b.close(); server.closeAllConnections(); server.close();
