/**
 * Quick screenshots while tuning:  npm run look -- <view> <query> <name> <items>
 *   view   desktop | wide | laptop | tablet | mobile | small
 *   items  comma list of: hero, a story progress (0..1), #anchor, #anchor+px, yPX, full
 * Example: npm run look -- mobile "motion=full&freeze=1" m "hero,0.262,0.607,#recipe"
 * Images are written to the system temp folder under cana_view/.
 */
import os from 'node:os';
import path from 'node:path';
import { launch, open, seek, shot, sleep, stageReady } from './browser.mjs';

const [view = 'desktop', query = 'motion=full', name = 'look', list = 'hero'] = process.argv.slice(2);
const out = path.join(os.tmpdir(), 'cana_view');
const browser = await launch();
const { page, problems } = await open(browser, { view, query });
const info = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return { webgl: !!gl, renderer: gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null, mode: document.documentElement.dataset.motion };
});
console.log(JSON.stringify(info));
if (info.mode === 'animated') await stageReady(page);
for (const item of list.split(',')) {
  if (item === 'full') {
    // trigger every lazy image and scroll reveal before the full-page capture
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await sleep(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1200);
    console.log(await shot(page, out, `${name}-full`, { fullPage: true }));
    continue;
  }
  if (item === 'hero') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1200);
  } else if (item.startsWith('#')) {
    const [id, extra = '0'] = item.slice(1).split('+');
    await page.evaluate((id, extra) => {
      document.getElementById(id)?.scrollIntoView();
      window.scrollBy(0, extra);
    }, id, Number(extra));
    await sleep(1600);
  } else if (item.startsWith('y')) {
    await page.evaluate((y) => window.scrollTo(0, y), Number(item.slice(1)));
    await sleep(1500);
  } else {
    await seek(page, Number(item));
  }
  console.log(await shot(page, out, `${name}-${item.replace('#', '').replace('+', '_')}`));
}
if (problems.length) console.log('PROBLEMS:\n' + problems.join('\n'));
await browser.close();
