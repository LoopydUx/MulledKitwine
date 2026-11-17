import { smooth } from './choreography';
import type { StageRegion, StageView } from './world';

/**
 * Where the 3D subject sits in the viewport. Landscape layouts keep the copy in
 * the leading third and the stage in the remainder; portrait layouts put the copy
 * above the stage and leave room for the header and the bottom chapter bar.
 * The matching CSS lives in src/styles/journey.css (.story-copy, .stage__still).
 */
const REGIONS: Record<'landscape' | 'portrait', Record<'hero' | 'story' | 'finale', StageRegion>> = {
  landscape: {
    hero: { cx: 0.7, cy: 0.53, w: 0.46, h: 0.8 },
    story: { cx: 0.66, cy: 0.54, w: 0.6, h: 0.76 },
    finale: { cx: 0.64, cy: 0.52, w: 0.5, h: 0.78 },
  },
  portrait: {
    hero: { cx: 0.5, cy: 0.725, w: 0.8, h: 0.46 },
    story: { cx: 0.5, cy: 0.635, w: 0.94, h: 0.5 },
    finale: { cx: 0.5, cy: 0.63, w: 0.8, h: 0.5 },
  },
};

/** Short phones: the hero copy needs more of the screen, so the box sits lower and a little smaller. */
const SHORT_PORTRAIT_HERO: StageRegion = { cx: 0.5, cy: 0.76, w: 0.8, h: 0.4 };
const SHORT_PORTRAIT_HEIGHT = 700;

export function isPortraitLayout(width: number, height: number): boolean {
  return width < 900 || width / height < 1.05;
}

const mix = (a: StageRegion, b: StageRegion, t: number): StageRegion => ({
  cx: a.cx + (b.cx - a.cx) * t,
  cy: a.cy + (b.cy - a.cy) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

export function stageView(width: number, height: number, intro: number, p: number, rtl: boolean): StageView {
  const portrait = isPortraitLayout(width, height);
  const set = REGIONS[portrait ? 'portrait' : 'landscape'];
  const hero = portrait && height < SHORT_PORTRAIT_HEIGHT ? SHORT_PORTRAIT_HERO : set.hero;
  let region = mix(hero, set.story, smooth(Math.min(Math.max(intro, 0), 1)));
  if (p > 0.95) region = mix(region, set.finale, smooth(Math.min((p - 0.95) / 0.035, 1)));
  if (rtl && !portrait) region = { ...region, cx: 1 - region.cx };
  return { width, height, portrait, region };
}

/** Centred framing used when rendering still artwork. */
export const STILL_VIEW: StageView = { width: 2000, height: 1500, portrait: false, region: { cx: 0.5, cy: 0.5, w: 0.9, h: 0.86 } };
