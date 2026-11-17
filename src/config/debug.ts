/**
 * Test hook for scripts/verify-page.mjs. With `?freeze=1` the decorative loops
 * (steam drift, liquid ripples) hold still and the stage element mirrors the
 * story progress as `data-p` / `data-intro`, so a frame reached by scrolling
 * forward can be compared with the same frame reached by scrolling backward.
 * It changes nothing about how progress drives the scene.
 */
const has = (name: string): boolean => {
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
};

export const FREEZE_AMBIENT = has('freeze');
export const AMBIENT_STILL_TIME = 4.2;
