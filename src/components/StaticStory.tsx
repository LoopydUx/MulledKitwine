import { assets, brand } from '../config/product';
import { ANCHORS } from '../config/story';
import type { StaticReason } from '../hooks/useStageMode';
import { useLanguage } from '../i18n/LanguageContext';
import { Ornament, SatinRibbon } from './bits';
import { HeroContent } from './HeroContent';

/** Backdrop of each chapter still, matching the stage colour at the moment it was rendered. */
const TONES = ['burgundy', 'ivory', 'ivory', 'warm', 'warm', 'ivory'] as const;

/**
 * The same six chapters as readable still compositions: used when the visitor
 * prefers reduced motion, when WebGL is unavailable, and on request.
 */
export function StaticStory({ reason, canAnimate, onPlay }: { reason: StaticReason; canAnimate: boolean; onPlay: () => void }) {
  const { t, l } = useLanguage();
  const s = t.story;

  return (
    <div className="static-journey">
      <div className="static-hero">
        <div className="static-hero__bg" aria-hidden="true">
          <SatinRibbon />
        </div>
        <img className="static-hero__still" src={assets.stills.hero} alt={s.gift.alt} width={2000} height={1500} fetchPriority="high" />
        <div className="static-hero__gift">
          <p className="eyebrow">{s.gift.eyebrow}</p>
          <h2 className="static-hero__gift-title">{s.gift.title}</h2>
          <p className="static-hero__gift-body">{s.gift.body}</p>
        </div>
      </div>

      <div className="static-hero static-hero--ritual">
        <div className="static-hero__bg" aria-hidden="true">
          <SatinRibbon />
        </div>
        <img className="static-hero__still" src={assets.stills.hero} alt={t.hero.alt} width={2000} height={1500} loading="lazy" decoding="async" />
        <HeroContent ritualHref={`#${ANCHORS.ritual}`} />
      </div>

      <section id={ANCHORS.ritual} className="static-story" aria-labelledby="static-story-title">
        <header className="section-head">
          <p className="eyebrow">{t.nav.ritual}</p>
          <h2 id="static-story-title" className="section-title">
            {s.heading}
          </h2>
          <Ornament />
          <p className="static-story__notice">
            {reason === 'webgl' ? s.stillsBecauseWebgl : s.stillsBecauseMotion}{' '}
            {canAnimate && (
              <button type="button" className="text-button" onClick={onPlay}>
                {s.playAnimated}
              </button>
            )}
          </p>
        </header>

        <ol className="static-chapters">
          {s.chapters.map((c, i) => (
            <li key={i} id={ANCHORS.chapter(i + 1)} className="static-chapter">
              <figure className="static-chapter__figure" data-tone={TONES[i]}>
                <img src={assets.stills.chapters[i]} alt={c.alt} width={2000} height={1500} loading="lazy" decoding="async" />
              </figure>
              <div className="static-chapter__copy">
                <p className="story-copy__count">
                  {s.chapterWord} <span className="numeral">{i + 1}</span> {s.of} <span className="numeral">6</span>
                </p>
                <h3 className="story-copy__title">{c.title}</h3>
                <p className="story-copy__body">{c.body}</p>
                {i === 3 && (
                  <p className="static-chapter__facts">
                    <span>
                      {s.cues.lowHeat} · {s.cues.minutes15}
                    </span>
                    <strong>{c.note}</strong>
                  </p>
                )}
                {i === 4 && (
                  <p className="static-chapter__facts">
                    <span>{s.cues.heatOff}</span>
                    <span>
                      {s.cues.rest} · {s.cues.minutes8}
                    </span>
                  </p>
                )}
                {i !== 3 && c.note && <p className="story-copy__note">{c.note}</p>}
              </div>
            </li>
          ))}
        </ol>

        <div className="static-finale">
          <figure className="static-chapter__figure" data-tone="burgundy">
            <img src={assets.stills.finale} alt={s.finale.alt} width={2000} height={1500} loading="lazy" decoding="async" />
          </figure>
          <div className="static-finale__copy">
            <Ornament />
            <p className="story-finale__line">{l(brand.signature)}</p>
            <p className="story-finale__note">{s.finale.note}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
