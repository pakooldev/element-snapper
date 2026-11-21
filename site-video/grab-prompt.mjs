// The real "Copy as Prompt" text for the sample list (content/utils.js), for shot 4. Writes assets/prompt.txt.
import { chromium } from '../tests/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`file://${here}scene/page.html`);
await p.addScriptTag({ path: `${here}../content/utils.js` });
let text = await p.evaluate(() => buildElementPromptText(document.getElementById('customers')));
text = text.replace(/^Attached browser context from .*$/m, 'Attached browser context from https://app.fieldnote.example/overview');
writeFileSync(`${here}assets/prompt.txt`, text);
console.log(text.slice(0, 1200));
await b.close();
