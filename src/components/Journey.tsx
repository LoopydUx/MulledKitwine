import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FREEZE_AMBIENT } from '../config/debug';
import { assets } from '../config/product';
import { ANCHORS, buildScrollMap, HOLD_VH, INTRO_VH } from '../config/story';
import { isLowPowerDevice, usePortraitLayout } from '../hooks/useViewport';
import { useLanguage } from '../i18n/LanguageContext';
import { backdropAt, CHAPTER_RANGES, chapterAt, T } from '../scene/choreography';
import { storyStore } from '../state/storyStore';
import { SatinRibbon } from './bits';
import { HeroContent } from './HeroContent';
import { StoryOverlay } from './StoryOverlay';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// The WebGL stage (three.js + React Three Fiber) is a separate chunk loaded after first paint.
const StageCanvas = lazy(() => import('../scene/StageCanvas'));

type StageStatus = 'loading' | 'ready' | 'unavailable';
type Phase = 'hero' | 'story' | 'finale';

const FADE = 13; // vh of scroll used by a copy block to fade in

/**
 * Hero + six chapters as one continuous, scroll-controlled stage.
 * The stage is `position: sticky`, so scrolling stays native; GSAP ScrollTrigger
 * only maps scroll position to a timeline that drives the copy and the progress
 * value read by the 3D scene.
 */
export function Journey() {
  const { t, rtl } = useLanguage();
  const portrait = usePortraitLayout();
  const map = useMemo(() => buildScrollMap(portrait), [portrait]);
  const lowPower = useMemo(() => isLowPowerDevice(), []);
  const journeyRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<StageStatus>('loading');
  const [onScreen, setOnScreen] = useState(true);
  const [mountCanvas, setMountCanvas] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [phase, setPhase] = useState<Phase>('hero');

  useEffect(() => {
    storyStore.rtl = rtl;
  }, [rtl]);

  // Let the hero paint first, then bring in the heavier scene.
  useEffect(() => {
    const id = window.setTimeout(() => setMountCanvas(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  // Stop the render loop whenever the stage is off screen.
  useEffect(() => {
    const el = journeyRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const journey = journeyRef.current;
    const stage = stageRef.current;
    if (!journey || !stage) return;
    const live = { chapter: -1, phase: '' as Phase | '', tone: '', burgundy: '', warm: '' };

    const ctx = gsap.context(() => {
      const proxy = { intro: 0, p: 0 };

      const sync = (): void => {
        storyStore.intro = proxy.intro;
        storyStore.p = proxy.p;
        if (FREEZE_AMBIENT) {
          stage.dataset.p = proxy.p.toFixed(4);
          stage.dataset.intro = proxy.intro.toFixed(4);
        }
        const bg = backdropAt(proxy.p);
        const burgundy = bg.burgundy.toFixed(3);
        const warm = bg.warm.toFixed(3);
        if (burgundy !== live.burgundy) {
          live.burgundy = burgundy;
          stage.style.setProperty('--burgundy', burgundy);
        }
        if (warm !== live.warm) {
          live.warm = warm;
          stage.style.setProperty('--warm', warm);
        }
        const tone = bg.burgundy > 0.5 ? 'dark' : 'light';
        if (tone !== live.tone) {
          live.tone = tone;
          stage.dataset.tone = tone;
        }
        const c = chapterAt(proxy.p);
        if (c !== live.chapter) {
          live.chapter = c;
          setChapter(c);
        }
        const ph: Phase = proxy.intro < 0.5 ? 'hero' : proxy.p > 0.972 ? 'finale' : 'story';
        if (ph !== live.phase) {
          live.phase = ph;
          setPhase(ph);
        }
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: sync,
        scrollTrigger: { trigger: journey, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });

      // one normalized progress value: intro, then the six chapters, then a hold
      tl.to(proxy, { intro: 1, duration: INTRO_VH }, 0);
      let at = INTRO_VH;
      CHAPTER_RANGES.forEach(([, end], i) => {
        tl.to(proxy, { p: end, duration: map.lengths[i] }, at);
        at += map.lengths[i];
      });
      tl.to({}, { duration: HOLD_VH }, at);

      // Copy fades with opacity only, so every chapter stays readable by assistive technology.
      const fadeIn = (el: Element | null, time: number, duration = FADE, y = 30, prop: 'opacity' | 'autoAlpha' = 'opacity'): void => {
        if (el) tl.fromTo(el, { [prop]: 0, y }, { [prop]: 1, y: 0, duration, ease: 'power2.out' }, time);
      };
      const fadeOut = (el: Element | null, endTime: number, duration = FADE * 0.75, y = -24): void => {
        if (el) tl.fromTo(el, { opacity: 1, y: 0 }, { opacity: 0, y, duration, ease: 'power1.in', immediateRender: false }, endTime - duration);
      };
      const q = (selector: string): Element | null => stage.querySelector(selector);

      // chapter copy
      stage.querySelectorAll('.story-copy').forEach((el, i) => {
        fadeIn(el, i === 0 ? INTRO_VH * 0.6 : map.timeOf(T.copy[i][0]));
        fadeOut(el, map.timeOf(T.copy[i][1]));
      });
      // ingredient names appear briefly as each one enters the pan
      (Object.keys(T.ingredients) as (keyof typeof T.ingredients)[]).forEach((key) => {
        const el = q(`[data-ingredient="${key}"]`);
        const [a, b] = T.ingredients[key];
        fadeIn(el, map.timeOf(a), 2.4, 8);
        fadeOut(el, map.timeOf(b), 2.4, -8);
      });
      // quiet time-passage cues: the visitor never waits for a real timer
      const ring = (selector: string, from: number, to: number): void => {
        const el = q(selector);
        if (el) tl.fromTo(el, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: map.timeOf(to) - map.timeOf(from) }, map.timeOf(from));
      };
      ring('[data-ring="simmer"]', T.simmer[0], T.simmer[1]);
      fadeIn(q('[data-cue="rest"]'), map.timeOf(T.rest[0] - 0.012), 4, 10);
      ring('[data-ring="rest"]', T.rest[0], T.rest[1]);
      // finale line and persistent chrome
      fadeIn(q('.story-finale'), map.timeOf(T.finaleCopy));
      fadeIn(q('.story-chrome'), INTRO_VH * 0.55, 12, 0, 'autoAlpha');

      sync();
    }, stage);

    return () => ctx.revert();
  }, [map]);

  // Layout height changes (fonts, language, images) must not leave stale trigger positions.
  useEffect(() => {
    ScrollTrigger.refresh();
    if (!document.fonts) return;
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    return () => {
      alive = false;
    };
  }, [map, rtl]);

  // Keep the still mounted briefly so it can cross-fade into the live scene (UI state, not story state).
  const [stillGone, setStillGone] = useState(false);
  useEffect(() => {
    if (status !== 'ready') {
      setStillGone(false);
      return;
    }
    const id = window.setTimeout(() => setStillGone(true), 900);
    return () => window.clearTimeout(id);
  }, [status]);

  const showStill = !stillGone;
  const stillSrc = phase === 'hero' ? assets.stills.hero : phase === 'finale' ? assets.stills.finale : assets.stills.chapters[chapter];

  return (
    <div className="journey" ref={journeyRef} style={{ '--track': map.total } as CSSProperties}>
      <div className="stage" ref={stageRef} data-tone="dark" data-status={status} data-phase={phase}>
        <div className="stage__bg stage__bg--ivory" />
        <div className="stage__bg stage__bg--warm" />
        <div className="stage__bg stage__bg--burgundy">
          <SatinRibbon />
        </div>
        {/* Lightweight still shown until the scene is running, and whenever WebGL is lost. */}
        {showStill && (
          <img
            key={stillSrc}
            className={`stage__still stage__still--${phase === 'hero' ? 'hero' : 'chapter'}`}
            src={stillSrc}
            alt=""
            decoding="async"
            fetchPriority={phase === 'hero' ? 'high' : 'auto'}
          />
        )}
        {mountCanvas && status !== 'unavailable' && (
          <Suspense fallback={null}>
            <StageCanvas active={onScreen} lowPower={lowPower} onReady={() => setStatus('ready')} onUnavailable={() => setStatus('unavailable')} />
          </Suspense>
        )}
        {/* Soft haze behind the copy column so props left outside the frame never sit under text. */}
        <div className="stage__scrim" />
        <StoryOverlay chapter={chapter} />
        {status === 'loading' && (
          <p className="stage__status" role="status">
            {t.story.loading}
          </p>
        )}
      </div>

      <HeroContent />

      {/* Real anchor targets along the pinned track, used by navigation and the chapter indicator. */}
      <div className="track" aria-hidden="true">
        <span id={ANCHORS.ritual} className="track__anchor" style={{ '--at': INTRO_VH + 2 } as CSSProperties} />
        {t.story.chapters.map((_, i) => (
          <span
            key={i}
            id={ANCHORS.chapter(i + 1)}
            className="track__anchor"
            style={{ '--at': i === 0 ? INTRO_VH + 2 : map.timeOf(T.copy[i][0]) + FADE } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
