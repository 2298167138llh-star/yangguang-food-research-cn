import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/llh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const outDir = path.resolve(import.meta.dirname, '../qa-mobile');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

const results = [];
for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const failures = [];
  const errors = [];
  page.on('requestfailed', (request) => failures.push(`${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}/mobile.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('.slide-preview img').first().evaluate((image) => image.complete ? true : new Promise((resolve) => image.addEventListener('load', () => resolve(true), { once: true })));
  await page.waitForTimeout(500);
  const initial = await page.evaluate(() => ({
    slides: document.querySelectorAll('.mobile-slide').length,
    previews: document.querySelectorAll('.slide-preview img').length,
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    current: document.querySelector('#current')?.textContent,
    nextDisabled: document.querySelector('#next')?.disabled,
    missingImages: [...document.images].filter((image) => image.hasAttribute('src') && image.getAttribute('src') && image.complete && image.naturalWidth === 0).map((image) => image.src),
  }));
  if (viewport.width === 390) {
    await page.screenshot({ path: path.join(outDir, 'mobile-390x844-cover.png') });
  }
  await page.click('#next');
  await page.waitForTimeout(650);
  const afterNext = await page.locator('#current').textContent();
  await page.locator('[data-preview="1"]').click();
  await page.waitForTimeout(200);
  const dialogOpen = await page.locator('#preview-dialog').evaluate((element) => element.open);
  await page.click('#close-preview');
  await page.locator('.mobile-slide').nth(10).scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outDir, `mobile-${viewport.width}x${viewport.height}-slide11.png`) });
  if (viewport.width === 390) {
    await page.locator('.mobile-slide').last().evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outDir, 'mobile-390x844-closing.png') });
  }
  results.push({ viewport, initial, afterNext, dialogOpen, failures, errors });
  await page.close();
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const desktopFailures = [];
desktop.on('requestfailed', (request) => desktopFailures.push(request.url()));
  await desktop.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await desktop.waitForTimeout(700);
const desktopState = await desktop.evaluate(() => ({
  slides: document.querySelectorAll('.slide').length,
  motionReady: document.body.classList.contains('motion-ready'),
  presenterReady: typeof window.__pptPresenter?.initMode === 'function',
}));
await desktop.close();
await browser.close();

console.log(JSON.stringify({ results, desktopState, desktopFailures }, null, 2));
const invalidMobile = results.some(({ initial, afterNext, dialogOpen, failures, errors }) =>
  initial.slides !== 22 || initial.previews !== 22 || initial.horizontalOverflow > 1 || initial.current !== '01' || initial.nextDisabled ||
  initial.missingImages.length || afterNext !== '02' || !dialogOpen || failures.length || errors.length
);
if (invalidMobile || desktopState.slides !== 22 || !desktopState.motionReady || !desktopState.presenterReady || desktopFailures.length) {
  process.exitCode = 1;
}
