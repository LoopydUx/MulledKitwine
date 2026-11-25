/**
 * Browser checks for the finished page:  npm run verify:page
 *
 * Needs a running site (npm run dev, or `npm run preview` with SITE_URL=http://127.0.0.1:4173)
 * and an installed Chrome or Edge. Screenshots and a JSON report are written to .verify/.
 *
 * What it covers: the scroll story forward and backward (same frames both ways), rapid
 * scrolling, chapter jumps, navigation, replay, resize, WebGL context loss, slow loading,
 * mobile menu focus handling, reduced motion, no-WebGL,
 * image alt text, text contrast, horizontal overflow, and console/network errors.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { VIEWS, launch, open, progressForScroll, seek, sleep, stageReady } from './browser.mjs';

const OUT = path.resolve(process.env.VERIFY_OUT ?? '.verify');
mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const wants = (group) => only.length === 0 || only.includes(group);

const results = [];
function check(group, name, ok, detail = '') {
  results.push({ group, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? `  (${detail})` : ''}`);
}
const fx = (n, d = 3) => Number(n).toFixed(d);

const browser = await launch();
const differ = await browser.newPage();

async function snap(page, name) {
  const b64 = await page.screenshot({ type: 'png', encoding: 'base64' });
  if (name) writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(b64, 'base64'));
  return b64;
}

/** Mean per-pixel difference (0..255) and share of pixels that differ visibly. */
function pixelDiff(a, b) {
  return differ.evaluate(
    async (a64, b64) => {
      const load = async (data) => createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const [ia, ib] = await Promise.all([load(a64), load(b64)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { mean: 255, changed: 1 };
      const read = (img) => {
        const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      };
      const da = read(ia);
      const db = read(ib);
      let sum = 0;
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        sum += d;
        if (d > 40) changed++;
      }
      return { mean: sum / (da.length / 4), changed: changed / (da.length / 4) };
    },
    a,
    b,
  );
}

const storyState = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return null;
    const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
    const copies = [...stage.querySelectorAll('.story-copy')].map((el) => {
      const r = el.getBoundingClientRect();
      const opacity = +getComputedStyle(el).opacity;
      return { opacity, inside: r.top >= header - 1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 };
    });
    const ringOffset = (name) => {
      const el = stage.querySelector(`[data-ring="${name}"]`);
      return el ? parseFloat(getComputedStyle(el).strokeDashoffset) : null;
    };
    const still = stage.querySelector('.stage__still');
    return {
      p: +stage.dataset.p,
      intro: +stage.dataset.intro,
      gift: stage.dataset.gift !== undefined ? +stage.dataset.gift : undefined,
      tone: stage.dataset.tone,
      status: stage.dataset.status,
      phase: stage.dataset.phase,
      current: [...stage.querySelectorAll('.chapter-nav a')].findIndex((a) => a.getAttribute('aria-current') === 'step'),
      copies,
      restCue: +getComputedStyle(stage.querySelector('[data-cue="rest"]')).opacity,
      finale: +getComputedStyle(stage.querySelector('.story-finale')).opacity,
      simmerRing: ringOffset('simmer'),
      restRing: ringOffset('rest'),
      // chapter marks and skip link: fully on screen and not on top of each other
      chrome: (() => {
        const nav = stage.querySelector('.chapter-nav').getBoundingClientRect();
        const skip = stage.querySelector('.story-skip').getBoundingClientRect();
        const within = (r) => r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        return within(nav) && within(skip) && (nav.right <= skip.left || skip.right <= nav.left);
      })(),
      canvas: !!stage.querySelector('canvas'),
      still: still ? { src: still.getAttribute('src'), loaded: still.complete && still.naturalWidth > 0 } : null,
      y: scrollY,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });

const chapterOf = (p) => [0.18, 0.35, 0.5, 0.67, 0.82].filter((end) => p >= end).length;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const sectionTop = (page, id) => page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), id);
const clickEl = (page, selector) => page.evaluate((s) => document.querySelector(s).click(), selector);

async function loadEverything(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round(page.viewport().height * 0.7);
  for (let y = 0; y < h; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await sleep(90);
  }
  await sleep(500);
}

/** Scrubs forward through `points`, then to the end of the page, then backward through the same points. */
async function scrub(group, page, label, points) {
  const forward = [];
  for (const p of points) {
    await seek(page, p);
    forward.push({ p, state: await storyState(page), shot: await snap(page, `${label}-p${fx(p, 4)}-forward`) });
  }
  const offBy = forward.map((f) => Math.abs(f.state.p - f.p));
  check(group, `${label}: scroll position maps to story progress`, Math.max(...offBy) < 0.003, `max error ${fx(Math.max(...offBy), 4)}`);
  const wrongChapter = forward.filter((f) => f.state.current !== chapterOf(f.p));
  check(group, `${label}: chapter indicator follows progress`, wrongChapter.length === 0, wrongChapter.map((f) => `p=${f.p} shows ${f.state.current + 1}`).join(', '));
  const clipped = forward.filter((f) => f.state.copies.some((c) => c.opacity > 0.9 && !c.inside));
  check(group, `${label}: visible chapter copy sits inside the viewport`, clipped.length === 0, clipped.map((f) => `p=${f.p}`).join(', '));
  const stacked = forward.filter((f) => f.state.copies.filter((c) => c.opacity > 0.5).length > 1);
  check(group, `${label}: never two chapter texts at once`, stacked.length === 0, stacked.map((f) => `p=${f.p}`).join(', '));
  check(group, `${label}: no horizontal overflow during the story`, forward.every((f) => !f.state.overflow));
  check(group, `${label}: chapter indicator and skip link fit on screen without touching`, forward.every((f) => f.state.chrome));

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(700);
  let worst = { mean: 0, changed: 0, p: null, dp: 0 };
  for (const f of [...forward].reverse()) {
    await seek(page, f.p);
    const state = await storyState(page);
    const d = await pixelDiff(f.shot, await snap(page, `${label}-p${fx(f.p, 4)}-backward`));
    const dp = Math.abs(state.p - f.state.p);
    if (d.mean > worst.mean || dp > worst.dp) worst = { ...d, p: f.p, dp: Math.max(dp, worst.dp) };
    if (state.current !== f.state.current) worst = { ...worst, mismatch: f.p };
  }
  check(
    group,
    `${label}: scrolling backward shows the same frames as forward`,
    worst.mean < 0.6 && worst.changed < 0.004 && worst.dp < 0.002 && worst.mismatch === undefined,
    `worst frame p=${worst.p}: mean pixel difference ${fx(worst.mean, 3)}/255, ${fx(worst.changed * 100, 2)}% of pixels changed, progress drift ${fx(worst.dp, 4)}`,
  );
  return forward;
}

const POINTS = [0.05, 0.12, 0.262, 0.31, 0.4365, 0.56, 0.607, 0.7, 0.7475, 0.8, 0.86, 0.9285, 1];

/* ------------------------------------------------------------------ desktop */
if (wants('desktop')) {
  const g = 'desktop';
  const { page, problems, close } = await open(browser, { view: 'desktop', query: 'motion=full&freeze=1' });
  try {
    await stageReady(page);
    const first = await storyState(page);
    check(g, 'WebGL stage starts and reports ready', first.status === 'ready' && first.canvas);
    await snap(page, 'desktop-hero');
    const forward = await scrub(g, page, 'desktop', POINTS);
    const at = (p) => forward.find((f) => f.p === p);

    // time cues, driven by scroll only
    await seek(page, 0.66);
    let s = await storyState(page);
    check(g, 'simmer ring is complete before chapter 4 ends', s.simmerRing < 1 && s.current === 3, `offset ${fx(s.simmerRing, 1)}`);
    await seek(page, 0.715);
    s = await storyState(page);
    check(g, '"Heat off" is on screen before the rest cue appears', s.copies[4].opacity > 0.9 && s.restCue < 0.05, `chapter 5 copy ${fx(s.copies[4].opacity, 2)}, rest cue ${fx(s.restCue, 2)}`);
    await seek(page, 0.805);
    s = await storyState(page);
    check(g, 'rest cue is visible while the mixture rests', s.restCue > 0.95 && s.restRing > 1 && s.restRing < 99, `ring offset ${fx(s.restRing, 1)}`);
    await seek(page, 0.83);
    s = await storyState(page);
    check(g, 'rest ring is complete before straining starts (p 0.902)', s.restRing < 1, `offset ${fx(s.restRing, 1)} at p=0.83`);
    await seek(page, 1);
    s = await storyState(page);
    check(g, 'finale line is shown at the end, on the burgundy backdrop', s.finale > 0.95 && s.tone === 'dark' && s.phase === 'finale');

    // rapid scrolling: wheel flings and random jumps, then the frame must still match
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await page.mouse.move(700, 450);
    for (let i = 0; i < 24; i++) {
      await page.mouse.wheel({ deltaY: i < 14 ? 2600 : -3400 });
      await sleep(16);
    }
    let seed = 7;
    for (let i = 0; i < 60; i++) {
      seed = (seed * 16807) % 2147483647;
      await page.evaluate((y) => window.scrollTo(0, y), (seed / 2147483647) * max);
      await sleep(12);
    }
    await seek(page, 0.607);
    let d = await pixelDiff(at(0.607).shot, await snap(page, 'desktop-after-rapid-scroll'));
    s = await storyState(page);
    check(g, 'rapid scrolling leaves the story in the correct state', d.mean < 0.6 && Math.abs(s.p - 0.607) < 0.003 && s.current === 3, `mean pixel difference ${fx(d.mean, 3)}/255`);

    // chapter jump links
    const jumps = [];
    for (const n of [4, 1, 6, 2, 5, 3]) {
      await clickEl(page, `.chapter-nav a[href="#chapter-${n}"]`);
      await sleep(1900);
      s = await storyState(page);
      const hash = await page.evaluate(() => location.hash);
      if (s.current !== n - 1 || s.copies[n - 1].opacity < 0.9 || hash !== `#chapter-${n}`) jumps.push(`chapter ${n}: indicator ${s.current + 1}, copy ${fx(s.copies[n - 1].opacity, 2)}, ${hash}`);
    }
    check(g, 'chapter indicator links jump to each chapter, in any order', jumps.length === 0, jumps.join('; '));

    // header navigation and skip link
    const header = await page.evaluate(() => Math.round(document.querySelector('.site-header').getBoundingClientRect().height));
    const nav = [];
    for (const id of ['inside-the-box']) {
      await clickEl(page, `.site-nav a[href="#${id}"]`);
      await sleep(1500);
      const top = await sectionTop(page, id);
      if (top < 0 || top > header + 8) nav.push(`${id} lands at ${top}px`);
    }
    await clickEl(page, '.site-nav a[href="#ritual"]');
    await sleep(1800);
    s = await storyState(page);
    if (!(s.intro > 0.999 && s.current === 0 && s.phase === 'story')) nav.push(`ritual: intro ${s.intro}, chapter ${s.current + 1}`);
    await clickEl(page, '.site-header__actions a.btn');
    await sleep(1500);
    const orderTop = await sectionTop(page, 'order');
    if (orderTop < 0 || orderTop > header + 8) nav.push(`order lands at ${orderTop}px`);
    check(g, 'header links reach The Ritual, Inside the Box and the order section', nav.length === 0, nav.join('; '));

    await seek(page, 0.4);
    await clickEl(page, '.story-skip');
    await sleep(1500);
    const skipTop = await sectionTop(page, 'inside-the-box');
    check(g, '"Skip animation" lands on Inside the box', skipTop >= 0 && skipTop <= header + 8, `${skipTop}px from the top`);

    // replay from the footer
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(900);
    await clickEl(page, '.site-footer a[href="#top"]');
    await sleep(2200);
    s = await storyState(page);
    // Start is the gift opening (phase gift, gift≈0), then the preparation hero.
    check(g, 'footer replay link returns to the start', s.y === 0 && s.p === 0 && s.intro === 0 && (s.phase === 'gift' || s.phase === 'hero'));
    await seek(page, 0.262);
    d = await pixelDiff(at(0.262).shot, await snap(page, 'desktop-after-replay'));
    check(g, 'the story plays identically after replay', d.mean < 0.6, `mean pixel difference ${fx(d.mean, 3)}/255`);

    // order section without a checkout URL
    const orderInfo = await page.evaluate(() => {
      const how = document.getElementById('how-to-order');
      const cta = document.querySelector('.order__copy a.btn');
      return { how: !!how, cta: cta?.getAttribute('href') ?? null, price: !!document.querySelector('.order__price') };
    });
    check(g, 'with no order URL configured there is no How to order panel, no checkout button, and no price', !orderInfo.how && orderInfo.cta === null && !orderInfo.price);

    // images
    await loadEverything(page);
    const images = await page.evaluate(() =>
      [...document.images].map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt'), ok: img.complete && img.naturalWidth > 0 })),
    );
    check(g, 'every image loads', images.every((i) => i.ok), images.filter((i) => !i.ok).map((i) => i.src).join(', '));
    check(g, 'every image has an alt attribute (empty only when decorative)', images.every((i) => i.alt !== null), `${images.filter((i) => i.alt).length} described, ${images.filter((i) => i.alt === '').length} decorative`);

    // resize: the story must follow the new layout without a reload
    await seek(page, 0.607);
    const sizes = [
      ['laptop', 1180, 680],
      ['phone-size', 390, 844],
      ['tablet-size', 820, 1180],
      ['desktop', 1440, 900],
    ];
    const resize = [];
    for (const [name, width, height] of sizes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await sleep(2000);
      s = await storyState(page);
      const want = progressForScroll(s.y, width, height);
      const fit = await page.evaluate(() => {
        const c = document.querySelector('.stage canvas');
        const r = document.querySelector('.stage').getBoundingClientRect();
        return Math.abs(c.clientWidth - r.width) < 2 && Math.abs(c.clientHeight - r.height) < 2;
      });
      await snap(page, `desktop-resized-${name}`);
      if (Math.abs(s.p - want.p) > 0.004 || !fit || s.overflow) resize.push(`${name}: p ${fx(s.p)} expected ${fx(want.p)}, canvas fits ${fit}, overflow ${s.overflow}`);
    }
    check(g, 'resizing between phone, tablet and desktop sizes keeps scroll and story in step', resize.length === 0, resize.join('; '));
    check(g, 'no console or network errors', problems.length === 0, problems.join(' | '));

    // losing the WebGL context falls back to the chapter still
    const before = problems.length;
    await seek(page, 0.607);
    await page.evaluate(() => {
      const c = document.querySelector('.stage canvas');
      (c.getContext('webgl2') ?? c.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();
    });
    await sleep(1500);
    s = await storyState(page);
    check(g, 'WebGL context loss swaps in the still for the current chapter', s.status === 'unavailable' && !s.canvas && s.still?.loaded && /chapter-4/.test(s.still.src), s.still?.src ?? 'no still');
    await snap(page, 'desktop-context-lost');
    await seek(page, 0.9285);
    s = await storyState(page);
    check(g, 'after context loss the copy and stills still follow the scroll', s.current === 5 && /chapter-6/.test(s.still?.src ?? '') && s.copies[5].opacity > 0.9);
    const pageErrors = problems.slice(before).filter((line) => line.startsWith('[pageerror]'));
    check(g, 'context loss raises no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  } catch (err) {
    check(g, 'desktop run completed', false, String(err));
  }
  await close();
}

/* ------------------------------------------------------------- other sizes */
if (wants('sizes')) {
  const g = 'sizes';
  for (const view of ['wide', 'laptop', 'tablet', 'small']) {
    const { page, problems, close } = await open(browser, { view, query: 'motion=full&freeze=1' });
    try {
      await stageReady(page);
      await snap(page, `${view}-hero`);
      await scrub(g, page, view, [0.0775, 0.262, 0.4365, 0.607, 0.7475, 0.9285, 1]);
      await loadEverything(page);
      check(g, `${view}: no horizontal overflow in the lower sections`, await noOverflow(page));
      check(g, `${view}: no console or network errors`, problems.length === 0, problems.join(' | '));
    } catch (err) {
      check(g, `${view} run completed`, false, String(err));
    }
    await close();
  }
}

/* ------------------------------------------------------------------- mobile */
if (wants('mobile')) {
  const g = 'mobile';
  const { page, problems, close } = await open(browser, { view: 'mobile', query: 'motion=full&freeze=1' });
  try {
    await stageReady(page);
    await snap(page, 'mobile-hero');
    await scrub(g, page, 'mobile', [0.05, 0.12, 0.262, 0.4365, 0.607, 0.7475, 0.86, 0.9285, 1]);

    // a real touch fling, so native scrolling is what drives the story
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);
    const drag = async (fromY, toY) => {
      await page.touchscreen.touchStart(195, fromY);
      for (let i = 1; i <= 24; i++) {
        await page.touchscreen.touchMove(195, fromY + ((toY - fromY) * i) / 24);
        await sleep(12);
      }
      await page.touchscreen.touchEnd();
      await sleep(250);
    };
    for (let i = 0; i < 5; i++) await drag(760, 120);
    await sleep(1500);
    let s = await storyState(page);
    let want = progressForScroll(s.y, 390, 844);
    const down = s.y;
    check(g, 'finger drags over the stage scroll the page natively and the story follows', s.y > 2500 && s.p > 0.1 && Math.abs(s.p - want.p) < 0.004, `scrolled ${Math.round(s.y)}px, p ${fx(s.p)} expected ${fx(want.p)}`);
    for (let i = 0; i < 2; i++) await drag(120, 760);
    await sleep(1500);
    s = await storyState(page);
    want = progressForScroll(s.y, 390, 844);
    check(g, 'dragging back down the page reverses the story', s.y < down - 900 && Math.abs(s.p - want.p) < 0.004, `back to ${Math.round(s.y)}px, p ${fx(s.p)} expected ${fx(want.p)}`);

    // menu: modal dialog with focus kept inside, Escape to close, focus restored
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await page.focus('.site-header__menu');
    await page.keyboard.press('Enter');
    await sleep(500);
    await snap(page, 'mobile-menu');
    const menu = await page.evaluate(() => {
      const dialog = document.getElementById('mobile-menu');
      return {
        open: dialog.open,
        modal: dialog.matches(':modal'),
        focusInside: dialog.contains(document.activeElement),
        expanded: document.querySelector('.site-header__menu').getAttribute('aria-expanded'),
        links: [...dialog.querySelectorAll('a')].map((a) => a.getAttribute('href')),
        labelled: !!dialog.getAttribute('aria-label'),
      };
    });
    check(g, 'menu opens as a labelled modal dialog and takes focus', menu.open && menu.modal && menu.focusInside && menu.expanded === 'true' && menu.labelled, menu.links.join(' '));
    const escaped = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab').catch(async () => {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Tab');
        await page.keyboard.up('Shift');
      });
      const where = await page.evaluate(() => {
        const a = document.activeElement;
        const dialog = document.getElementById('mobile-menu');
        return dialog.contains(a) ? 'dialog' : a === document.body || a === document.documentElement ? 'none' : (a.className || a.tagName);
      });
      if (where !== 'dialog' && where !== 'none') escaped.push(where);
    }
    check(g, 'Tab and Shift+Tab never reach the page behind the menu', escaped.length === 0, escaped.join(', '));
    await page.keyboard.press('Escape');
    await sleep(400);
    const closed = await page.evaluate(() => ({
      open: document.getElementById('mobile-menu').open,
      expanded: document.querySelector('.site-header__menu').getAttribute('aria-expanded'),
      focusBack: document.activeElement === document.querySelector('.site-header__menu'),
    }));
    check(g, 'Escape closes the menu and returns focus to the menu button', !closed.open && closed.expanded === 'false' && closed.focusBack);
    await clickEl(page, '.site-header__menu');
    await sleep(400);
    await clickEl(page, '#mobile-menu a[href="#inside-the-box"]');
    await sleep(1600);
    const insideTop = await sectionTop(page, 'inside-the-box');
    const stillOpen = await page.evaluate(() => document.getElementById('mobile-menu').open);
    check(g, 'a menu link closes the menu and scrolls to its section', !stillOpen && insideTop >= 0 && insideTop <= 80, `inside the box at ${insideTop}px`);

    await loadEverything(page);
    check(g, 'no horizontal overflow in the lower sections', await noOverflow(page));
    for (const [id, extra] of [['inside-the-box', 0], ['inside-the-box', 2300], ['order', 0], ['order', 900]]) {
      await page.evaluate((id, extra) => { document.getElementById(id).scrollIntoView(); window.scrollBy(0, extra); }, id, extra);
      await sleep(900);
      await snap(page, `mobile-${id}-${extra}`);
    }
    check(g, 'no console or network errors', problems.length === 0, problems.join(' | '));
  } catch (err) {
    check(g, 'mobile run completed', false, String(err));
  }
  await close();
}

/* ----------------------------------------------------------- reduced motion */
const CONTRAST_AUDIT = () => {
  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [n[0], n[1], n[2], n[3] ?? 1];
  };
  const over = (top, bottom) => {
    const a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  // surfaces whose colour comes from a gradient or a sibling layer: use their least favourable tone
  const DARK = '.site-header, .mobile-menu, .hero, .static-hero, .order, .site-footer, .stage[data-tone="dark"], [data-tone="burgundy"]';
  const backgroundOf = (el) => {
    const layers = [];
    let base = null;
    for (let node = el; node && node !== document.documentElement && !base; node = node.parentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c[3] >= 0.999) base = c;
      else {
        if (c && c[3] > 0) layers.push(c);
        // a surface painted by a gradient or a layer behind it: stop here, do not fall through to the page colour
        if (node.matches(DARK)) base = [90, 27, 38, 1];
        else if (node.matches('.stage')) base = [232, 213, 184, 1];
      }
    }
    base ??= parse(getComputedStyle(document.body).backgroundColor);
    return layers.reverse().reduce((acc, layer) => over(layer, acc), base);
  };
  const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.visually-hidden, .skip-link, [aria-hidden="true"], dialog:not([open]), svg, canvas, script, style')) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!text) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
    // text that is faded out at this moment is not on screen
    let shown = 1;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) shown *= +getComputedStyle(node).opacity;
    if (shown < 0.9) continue;
    const bg = backgroundOf(el);
    const fg = over(parse(cs.color), bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const value = ratio(fg, bg);
    const key = `${cs.color}|${bg.map(Math.round).join(',')}|${large}`;
    const entry = seen.get(key) ?? { ratio: +value.toFixed(2), need: large ? 3 : 4.5, color: cs.color, on: `rgb(${bg.slice(0, 3).map(Math.round).join(' ')})`, size, count: 0, sample: text.slice(0, 40) };
    entry.count++;
    seen.set(key, entry);
  }
  return [...seen.values()].sort((a, b) => a.ratio / a.need - b.ratio / b.need);
};

if (wants('reduced')) {
  const g = 'reduced-motion';
  for (const view of ['desktop', 'mobile']) {
    const { page, problems, close } = await open(browser, { view, reducedMotion: true });
    try {
      await sleep(600);
      await loadEverything(page);
      const info = await page.evaluate(() => ({
        mode: document.documentElement.dataset.motion,
        canvas: !!document.querySelector('canvas'),
        pinned: !!document.querySelector('.journey'),
        chapters: [...document.querySelectorAll('.static-chapter')].map((li) => {
          const img = li.querySelector('img');
          return { id: li.id, loaded: img.complete && img.naturalWidth > 0, alt: img.alt, title: li.querySelector('h3')?.textContent, body: li.querySelector('.story-copy__body')?.textContent };
        }),
        facts: [...document.querySelectorAll('.static-chapter__facts')].map((p) => p.innerText),
        finale: document.querySelector('.static-finale .story-finale__line')?.textContent,
        notice: document.querySelector('.static-story__notice')?.innerText,
        smooth: getComputedStyle(document.documentElement).scrollBehavior,
        hidden: [...document.querySelectorAll('.reveal')].filter((el) => +getComputedStyle(el).opacity < 0.99).length,
        running: document.getAnimations().filter((a) => a.playState === 'running').length,
        h1: document.querySelector('h1')?.textContent,
      }));
      check(g, `${view}: prefers-reduced-motion gets the static version, with no canvas and no pinned stage`, info.mode === 'static' && !info.canvas && !info.pinned, info.notice);
      check(
        g,
        `${view}: all six chapters appear as still compositions with text and alt text`,
        info.chapters.length === 6 && info.chapters.every((c) => c.loaded && c.alt.length > 20 && c.title && c.body),
        info.chapters.map((c) => c.title).join(' / '),
      );
      check(g, `${view}: heat, "do not boil", heat-off and rest facts are stated in text`, info.facts.length === 2 && /15/.test(info.facts[0]) && /8/.test(info.facts[1]), info.facts.join(' / ').replace(/\n/g, ' '));
      check(g, `${view}: finale line is present`, !!info.finale);
      check(g, `${view}: no smooth scrolling, no running animations, nothing left hidden`, info.smooth === 'auto' && info.running === 0 && info.hidden === 0, `scroll-behavior ${info.smooth}, ${info.running} running, ${info.hidden} hidden`);
      for (const n of [3, 6]) {
        await clickEl(page, `.site-nav a[href="#ritual"]`);
        await page.evaluate((n) => { location.hash = `#chapter-${n}`; }, n);
        await sleep(500);
      }
      const chapterTop = await sectionTop(page, 'chapter-6');
      check(g, `${view}: chapter anchors still work in the static version`, chapterTop >= 0 && chapterTop < 200, `chapter 6 at ${chapterTop}px`);
      check(g, `${view}: no horizontal overflow`, await noOverflow(page));
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);
      await snap(page, `reduced-${view}-top`);
      await page.evaluate(() => document.getElementById('chapter-3').scrollIntoView());
      await sleep(300);
      await snap(page, `reduced-${view}-chapter-3`);
      if (view === 'desktop') {
        const audit = await page.evaluate(CONTRAST_AUDIT);
        const failing = audit.filter((a) => a.ratio < a.need);
        check(g, 'text contrast meets WCAG AA across the static page', failing.length === 0, failing.length ? failing.map((a) => `${a.ratio}:1 "${a.sample}" ${a.color} on ${a.on}`).join(' | ') : `lowest ${audit[0].ratio}:1 ("${audit[0].sample}", needs ${audit[0].need}:1), ${audit.length} colour pairs`);
        // the visitor can still opt in to the animation
        await clickEl(page, '.static-story__notice button');
        await page.waitForFunction(() => document.querySelector('.stage')?.dataset.status === 'ready', { timeout: 30000 });
        const mode = await page.evaluate(() => document.documentElement.dataset.motion);
        check(g, '"Play the scroll animation" opts in to the animated story', mode === 'animated');
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await sleep(600);
        await clickEl(page, '.site-footer button');
        await sleep(800);
        const again = await page.evaluate(() => ({ mode: document.documentElement.dataset.motion, canvas: !!document.querySelector('canvas') }));
        check(g, 'footer "Show still images instead" returns to the static version and removes the canvas', again.mode === 'static' && !again.canvas);
      }
      check(g, `${view}: no console or network errors`, problems.length === 0, problems.join(' | '));
    } catch (err) {
      check(g, `reduced motion ${view} run completed`, false, String(err));
    }
    await close();
  }
}

/* ------------------------------------------------- contrast over the stage */
if (wants('contrast')) {
  const g = 'contrast';
  const { page, close } = await open(browser, { view: 'desktop', query: 'motion=full&freeze=1' });
  try {
    await stageReady(page);
    const failing = [];
    let lowest = null;
    for (const p of [0, 0.0775, 0.262, 0.4365, 0.607, 0.7475, 0.9285, 1]) {
      if (p === 0) await page.evaluate(() => window.scrollTo(0, 0));
      else await seek(page, p);
      if (p === 0) await sleep(800);
      const audit = await page.evaluate(CONTRAST_AUDIT);
      // only text that is actually showing over the stage or in the header at this moment
      const visible = await page.evaluate(() => [...document.querySelectorAll('.story-copy, .story-finale, .hero')].filter((el) => +getComputedStyle(el).opacity > 0.9).length);
      if (!visible) continue;
      for (const a of audit) {
        if (!lowest || a.ratio / a.need < lowest.ratio / lowest.need) lowest = { ...a, p };
        if (a.ratio < a.need) failing.push(`p=${p}: ${a.ratio}:1 "${a.sample}" ${a.color} on ${a.on}`);
      }
    }
    check(g, 'text over the stage meets WCAG AA against the least favourable backdrop tone', failing.length === 0, failing.length ? [...new Set(failing)].slice(0, 6).join(' | ') : `lowest ${lowest.ratio}:1 at p=${lowest.p} ("${lowest.sample}", needs ${lowest.need}:1)`);
  } catch (err) {
    check(g, 'contrast run completed', false, String(err));
  }
  await close();
}

/* ---------------------------------------------------------------- no WebGL */
if (wants('nowebgl')) {
  const g = 'no-webgl';
  const staticInfo = (page) =>
    page.evaluate(() => ({
      mode: document.documentElement.dataset.motion,
      canvas: !!document.querySelector('canvas'),
      notice: document.querySelector('.static-story__notice')?.innerText ?? '',
      play: !!document.querySelector('.static-story__notice button'),
      footerToggle: !!document.querySelector('.site-footer button'),
      chapters: document.querySelectorAll('.static-chapter').length,
      loaded: [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    }));
  {
    const { page, problems, close } = await open(browser, { view: 'desktop', query: 'webgl=off' });
    await loadEverything(page);
    const info = await staticInfo(page);
    check(g, '?webgl=off shows the static story and offers no animation toggle', info.mode === 'static' && !info.canvas && !info.play && !info.footerToggle && info.chapters === 6 && info.loaded, info.notice.trim());
    check(g, '?webgl=off: no console or network errors', problems.length === 0, problems.join(' | '));
    await close();
  }
  // a browser that really has no WebGL
  const plain = await launch({ webgl: false });
  try {
    const { page, problems, close } = await open(plain, { view: 'mobile' });
    const supported = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'));
    await loadEverything(page);
    const info = await staticInfo(page);
    check(g, 'a browser with 3D disabled falls back on its own', !supported && info.mode === 'static' && !info.canvas && !info.play && info.chapters === 6 && info.loaded, `WebGL available: ${supported}; ${info.notice.trim()}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await snap(page, 'no-webgl-mobile-top');
    check(g, 'browser without WebGL: no console or network errors', problems.length === 0, problems.join(' | '));
    await close();
  } catch (err) {
    check(g, 'no-WebGL browser run completed', false, String(err));
  }
  await plain.close();
}

/* ------------------------------------------------------------ slow loading */
if (wants('slow')) {
  const g = 'slow-loading';
  const DELAY = 3500;
  const { page, problems, close } = await open(browser, {
    view: 'desktop',
    query: 'motion=full',
    waitUntil: 'domcontentloaded',
    before: async (page) => {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        // hold back the 3D chunk and its textures
        if (/StageCanvas|\/textures\//.test(req.url())) setTimeout(() => req.continue().catch(() => {}), DELAY);
        else req.continue().catch(() => {});
      });
    },
  });
  try {
    await page.waitForSelector('.stage__still', { timeout: 15000 });
    await sleep(1500);
    const early = await page.evaluate(() => {
      const still = document.querySelector('.stage__still');
      const h1 = document.querySelector('h1');
      return {
        status: document.querySelector('.stage').dataset.status,
        still: !!still && still.complete && still.naturalWidth > 0,
        h1: h1.getBoundingClientRect().height > 0 && +getComputedStyle(h1).opacity > 0.9,
        label: document.querySelector('.stage__status')?.textContent ?? '',
        cta: !!document.querySelector('.hero__actions a'),
      };
    });
    await snap(page, 'slow-loading-poster');
    check(g, 'while the 3D scene loads the hero shows its poster, headline, CTAs and a loading label', early.status === 'loading' && early.still && early.h1 && early.cta && early.label.length > 0, `label "${early.label}"`);
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.6));
    await sleep(900);
    const scrolled = await page.evaluate(() => ({
      status: document.querySelector('.stage').dataset.status,
      copy: +getComputedStyle(document.querySelector('.story-copy')).opacity,
      still: document.querySelector('.stage__still')?.getAttribute('src'),
    }));
    check(g, 'the page can be scrolled and read before the scene is ready', scrolled.copy > 0.9 && /chapter-1/.test(scrolled.still ?? ''), `status ${scrolled.status}, still ${scrolled.still}`);
    await stageReady(page, 40000);
    const late = await page.evaluate(() => ({ status: document.querySelector('.stage').dataset.status, label: !!document.querySelector('.stage__status'), still: !!document.querySelector('.stage__still') }));
    check(g, 'the scene takes over when it arrives and the poster is removed', late.status === 'ready' && !late.label && !late.still);
    check(g, 'no console or network errors', problems.length === 0, problems.join(' | '));
  } catch (err) {
    check(g, 'slow-loading run completed', false, String(err));
  }
  await close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ views: VIEWS, results }, null, 2));
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed. Screenshots and report: ${OUT}`);
if (failed.length) {
  console.log(failed.map((r) => `  FAIL [${r.group}] ${r.name}  ${r.detail}`).join('\n'));
  process.exitCode = 1;
}
