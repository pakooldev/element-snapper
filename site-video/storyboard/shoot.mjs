import { chromium } from '../../tests/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
mkdirSync(here + 'frames', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
for (let i = 1; i <= 7; i++) {
  await p.goto(`file://${here}frames.html?f=${i}`); await p.waitForTimeout(300);
  await p.screenshot({ path: `${here}frames/${i}.jpg`, quality: 88 });
}
const s = await b.newPage({ viewport: { width: 1920, height: 900 } });
await s.goto(`file://${here}storyboard.html`); await s.waitForTimeout(500);
await s.screenshot({ path: `${here}storyboard.png`, fullPage: true });
await b.close();
