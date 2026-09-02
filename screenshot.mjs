import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = Number(process.argv[4]) || 1440;
const height = Number(process.argv[5]) || 900;

const dir = './temporary screenshots';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(dir, `screenshot-${n}${label ? '' : ''}.png`)) || fs.existsSync(path.join(dir, `screenshot-${n}-${label}.png`))) {
  n++;
}
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outPath = path.join(dir, filename);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 400));

// scroll through the full page first so scroll-triggered reveals fire and finish transitioning
const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < scrollHeight; y += 400) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise((r) => setTimeout(r, 60));
}
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 700));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(outPath);
