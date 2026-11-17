/**
 * Re-renders the still artwork from the 3D scene:  npm run stills
 * (the dev server must be running: npm run dev)
 *
 * Opens /?capture=1, which renders each pose and posts it to the dev server.
 * Output: public/stills/*.webp and src/config/kit-markers.json
 */
import { BASE, launch } from './browser.mjs';

const browser = await launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.error('[pageerror]', err.message));
await page.setViewport({ width: 1700, height: 1300, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?capture=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.title === 'capture done', { timeout: 120000 });
console.log(await page.$eval('#capture-log', (el) => el.textContent));
await browser.close();
