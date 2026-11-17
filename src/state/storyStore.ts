/**
 * The one mutable source of scroll progress. GSAP ScrollTrigger writes it, the
 * 3D stage reads it every frame, and nothing else stores animation state.
 */
export const storyStore = {
  /** 0..1 while the hero copy scrolls away */
  intro: 0,
  /** 0..1 across the six chapters */
  p: 0,
  /** right-to-left layout: the stage subject swaps sides, artwork is never mirrored */
  rtl: false,
};
