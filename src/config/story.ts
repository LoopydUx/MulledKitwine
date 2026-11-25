import { CHAPTER_RANGES, CHAPTER_SCROLL_WEIGHT } from '../scene/choreography';

/**
 * Scroll pacing for the pinned story, in viewport-height units.
 * The journey is: gift hold -> intro (hero copy leaves) -> six chapters -> hold.
 *
 * SCROLL_PACE stretches every animated beat. A higher value means one wheel notch
 * covers less of each movement, so the scene advances slowly instead of jumping.
 */
export const SCROLL_PACE = 2;
/** Closed kit with gifting copy: reading hold, then the preparation hero. */
export const GIFT_VH = Math.round(72 * SCROLL_PACE);
export const INTRO_VH = Math.round(80 * SCROLL_PACE);
export const HOLD_VH = 45;
const CHAPTER_VH = {
  landscape: Math.round(124 * SCROLL_PACE),
  portrait: Math.round(98 * SCROLL_PACE),
} as const;

export interface ScrollMap {
  lengths: number[];
  /** total scroll distance of the pinned journey, in vh */
  total: number;
  /** timeline time (vh of scroll from the top of the journey) at which story progress equals p */
  timeOf: (p: number) => number;
  /** scroll time where the preparation chapters begin (after gift + intro) */
  storyStart: number;
}

export function buildScrollMap(portrait: boolean): ScrollMap {
  const base = CHAPTER_VH[portrait ? 'portrait' : 'landscape'];
  const lengths = CHAPTER_SCROLL_WEIGHT.map((w) => Math.round(w * base));
  const storyStart = GIFT_VH + INTRO_VH;
  const total = storyStart + lengths.reduce((a, b) => a + b, 0) + HOLD_VH;
  const timeOf = (p: number): number => {
    let t = storyStart;
    for (let i = 0; i < CHAPTER_RANGES.length; i++) {
      const [a, b] = CHAPTER_RANGES[i];
      if (p <= b || i === CHAPTER_RANGES.length - 1) return t + (Math.min(Math.max(p, a), b) - a) / (b - a) * lengths[i];
      t += lengths[i];
    }
    return t;
  };
  return { lengths, total, timeOf, storyStart };
}

/** Anchor ids used by navigation, the chapter indicator, and the footer replay link. */
export const ANCHORS = {
  top: 'top',
  ritual: 'ritual',
  chapter: (n: number): string => `chapter-${n}`,
  inside: 'inside-the-box',
  order: 'order',
} as const;
