import { useEffect, useRef, useState, type RefObject } from 'react';
import { isPortraitLayout } from '../scene/layout';

/** True when the stage uses the portrait composition (copy above the stage). */
export function usePortraitLayout(): boolean {
  const [portrait, setPortrait] = useState<boolean>(() => isPortraitLayout(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = (): void => setPortrait(isPortraitLayout(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return portrait;
}

/** Phones and low-memory devices get a smaller shadow map and a lower pixel-ratio cap. */
export function isLowPowerDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);
}

/** Adds `is-in` once an element scrolls into view (CSS handles the transition and reduced motion). */
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
