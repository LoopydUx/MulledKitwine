import { ANCHORS } from '../config/story';
import { useLanguage } from '../i18n/LanguageContext';
import { Ornament } from './bits';

/** Hero copy. It is ordinary document content that scrolls away over the pinned stage. */
export function HeroContent({ ritualHref = `#${ANCHORS.ritual}` }: { ritualHref?: string }) {
  const { t } = useLanguage();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="eyebrow hero__eyebrow">{t.hero.eyebrow}</p>
        <h1 id="hero-title" className="hero__title">
          {t.hero.title}
        </h1>
        <Ornament className="hero__ornament" />
        <p className="hero__body">{t.hero.body}</p>
        <div className="hero__actions">
          <a className="btn btn--gold" href={ritualHref}>
            {t.hero.primary}
          </a>
          <a className="btn btn--ghost" href={`#${ANCHORS.inside}`}>
            {t.hero.secondary}
          </a>
        </div>
      </div>
      <a className="hero__scroll" href={ritualHref}>
        <span>{t.hero.scroll}</span>
        <svg viewBox="0 0 12 28" width="12" height="28" aria-hidden="true" focusable="false">
          <path d="M6 0v25M1 20l5 6 5-6" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
