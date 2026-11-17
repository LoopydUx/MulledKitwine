import { CHAPTER_RANGES, CHAPTER_SCROLL_WEIGHT } from '../scene/choreography';

/**
 * Scroll pacing for the pinned story, in viewport-height units.
 * The journey is: intro (hero copy leaves) -> six chapters -> a short hold on the finished glass.
 */
export const INTRO_VH = 80;
export const HOLD_VH = 45;
const CHAPTER_VH = { landscape: 124, portrait: 98 } as const;

export interface ScrollMap {
  lengths: number[];
  /** total scroll distance of the pinned journey, in vh */
  total: number;
  /** timeline time (vh of scroll from the top of the journey) at which story progress equals p */
  timeOf: (p: number) => number;
}

export function buildScrollMap(portrait: boolean): ScrollMap {
  const base = CHAPTER_VH[portrait ? 'portrait' : 'landscape'];
  const lengths = CHAPTER_SCROLL_WEIGHT.map((w) => Math.round(w * base));
  const total = INTRO_VH + lengths.reduce((a, b) => a + b, 0) + HOLD_VH;
  const timeOf = (p: number): number => {
    let t = INTRO_VH;
    for (let i = 0; i < CHAPTER_RANGES.length; i++) {
      const [a, b] = CHAPTER_RANGES[i];
      if (p <= b || i === CHAPTER_RANGES.length - 1) return t + (Math.min(Math.max(p, a), b) - a) / (b - a) * lengths[i];
      t += lengths[i];
    }
    return t;
  };
  return { lengths, total, timeOf };
}

/** Anchor ids used by navigation, the chapter indicator, and the footer replay link. */
export const ANCHORS = {
  top: 'top',
  ritual: 'ritual',
  chapter: (n: number): string => `chapter-${n}`,
  inside: 'inside-the-box',
  order: 'order',
  howToOrder: 'how-to-order',
} as const;
