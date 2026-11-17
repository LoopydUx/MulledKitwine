import { useCallback, useEffect, useState } from 'react';

export type StageMode = 'animated' | 'static';
export type StaticReason = 'motion' | 'webgl' | null;

const param = (name: string): string | null => {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
};

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Decides between the pinned 3D story and the static, fully readable version.
 * Static is used when the visitor prefers reduced motion or WebGL is unavailable.
 * Test overrides: ?motion=reduce | ?motion=full | ?webgl=off
 */
export function useStageMode(): {
  mode: StageMode;
  reason: StaticReason;
  canAnimate: boolean;
  choose: (mode: StageMode) => void;
} {
  const override = param('motion');
  const [reduced, setReduced] = useState<boolean>(() =>
    override === 'reduce' ? true : override === 'full' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [webgl] = useState<boolean>(() => param('webgl') !== 'off' && detectWebGL());
  const [choice, setChoice] = useState<StageMode | null>(null);

  useEffect(() => {
    if (override === 'reduce' || override === 'full') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [override]);

  const mode: StageMode = !webgl ? 'static' : (choice ?? (reduced ? 'static' : 'animated'));
  const reason: StaticReason = !webgl ? 'webgl' : mode === 'static' ? 'motion' : null;

  useEffect(() => {
    document.documentElement.dataset.motion = mode;
  }, [mode]);

  const choose = useCallback((next: StageMode) => setChoice(next), []);
  return { mode, reason, canAnimate: webgl, choose };
}
