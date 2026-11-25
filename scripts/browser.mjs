/**
 * Shared helpers for the browser checks (scripts/verify-page.mjs).
 * Drives an installed Chrome or Edge through puppeteer-core; nothing is downloaded.
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export const BASE = process.env.SITE_URL ?? 'http://127.0.0.1:5173';

export const VIEWS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  laptop: { width: 1180, height: 680, deviceScaleFactor: 1 },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  small: { width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser.');
  return found;
}

/** `webgl: false` starts a browser with 3D APIs disabled, to exercise the real no-WebGL path. */
export async function launch({ webgl = true } = {}) {
  const gpu = webgl ? ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--enable-webgl'] : ['--disable-3d-apis'];
  return puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: [...gpu, '--hide-scrollbars', '--force-color-profile=srgb'],
  });
}

/** Opens the site and records everything the console and the network complain about. */
export async function open(browser, { view = 'desktop', query = '', hash = '', reducedMotion = false, before = null, waitUntil = 'networkidle0' } = {}) {
  // a fresh context per page: the saved language choice must not leak between checks
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText ?? ''}`));
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`[http ${res.status()}] ${res.url()}`);
  });
  await page.setViewport(VIEWS[view]);
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (before) await before(page);
  await page.goto(`${BASE}/${query ? `?${query}` : ''}${hash}`, { waitUntil });
  return { page, problems, close: () => context.close() };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until the 3D stage reports real frames on screen. */
export async function stageReady(page, timeout = 30000) {
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-status') === 'ready', { timeout });
  await sleep(1100); // poster cross-fade
}

/** Scroll position (px) at which the story is at progress p. Mirrors src/config/story.ts. */
/** Must stay in sync with GIFT_VH / INTRO_VH in src/config/story.ts. */
const GIFT_VH = 72;
const INTRO_VH = 80;

export function scrollForProgress(p, width, height) {
  const portrait = width < 900 || width / height < 1.05;
  const base = portrait ? 98 : 124;
  const weights = [1.45, 1.05, 1.1, 1.0, 1.05, 1.35];
  const ranges = [
    [0, 0.18],
    [0.18, 0.35],
    [0.35, 0.5],
    [0.5, 0.67],
    [0.67, 0.82],
    [0.82, 1],
  ];
  let t = GIFT_VH + INTRO_VH;
  for (let i = 0; i < 6; i++) {
    const [a, b] = ranges[i];
    const len = Math.round(weights[i] * base);
    if (p <= b || i === 5) {
      t += ((Math.min(Math.max(p, a), b) - a) / (b - a)) * len;
      break;
    }
    t += len;
  }
  return (t * height) / 100;
}

/** Inverse of scrollForProgress: the { gift, intro, p } the story must show at scroll position y. */
export function progressForScroll(y, width, height) {
  const portrait = width < 900 || width / height < 1.05;
  const base = portrait ? 98 : 124;
  const weights = [1.45, 1.05, 1.1, 1.0, 1.05, 1.35];
  const ends = [0.18, 0.35, 0.5, 0.67, 0.82, 1];
  const t = (y * 100) / height;
  const giftHold = GIFT_VH * 0.42;
  const giftExit = GIFT_VH - giftHold;
  let gift = 0;
  if (t <= giftHold) gift = 0;
  else if (t >= GIFT_VH) gift = 1;
  else gift = (t - giftHold) / giftExit;
  const afterGift = t - GIFT_VH;
  const intro = Math.min(1, Math.max(0, afterGift / INTRO_VH));
  let rest = afterGift - INTRO_VH;
  let p = 0;
  for (let i = 0; i < 6 && rest > 0; i++) {
    const len = Math.round(weights[i] * base);
    const start = i === 0 ? 0 : ends[i - 1];
    p = start + (Math.min(rest, len) / len) * (ends[i] - start);
    rest -= len;
  }
  return { gift, intro, p };
}

/** Jumps to story progress p and lets the scrubbed timeline settle. */
export async function seek(page, p, settle = 1500) {
  const { width, height } = page.viewport();
  const y = scrollForProgress(p, width, height);
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await sleep(settle);
}

export async function shot(page, dir, name, options = {}) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 86, ...options });
  return file;
}
