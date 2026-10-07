// Renders the Bladebound thumbnail and icon with headless Chromium.
//   npm install
//   npx playwright install chromium
//   npm run render
// Output PNGs are written next to this folder (into bladebound/).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(root, '..');
const SUPERSAMPLE = 2;

const jobs = [
  { file: 'Bladebound_Thumbnail.png', w: 1920, h: 1080, query: '' },
  { file: 'Bladebound_Thumbnail_ohne_Logo.png', w: 1920, h: 1080, query: 'logo=0' },
  { file: 'Bladebound_Icon.png', w: 512, h: 512, query: 'mode=icon' },
];

const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const { port } = server.address();

// SwiftShader keeps the output identical on machines with and without a GPU.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: SUPERSAMPLE });
    page.on('pageerror', (e) => console.error('[page]', e.message));
    await page.goto(`http://localhost:${port}/scene.html?w=${job.w}&h=${job.h}&${job.query}`, { timeout: 600000 });
    await page.waitForFunction(() => window.__done === true, null, { timeout: 600000 });
    const big = await page.screenshot({ type: 'png' });
    // downsample the supersampled frame for clean anti-aliasing
    const small = await page.evaluate(async ({ b64, w, h }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/png').split(',')[1];
    }, { b64: big.toString('base64'), w: job.w, h: job.h });
    fs.writeFileSync(path.join(outDir, job.file), Buffer.from(small, 'base64'));
    console.log(`rendered ${job.file}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
