import { brand } from '../config/product';
import { ANCHORS } from '../config/story';
import { useLanguage } from '../i18n/LanguageContext';
import type { Strings } from '../i18n/strings';
import { Ornament } from './bits';

type IngredientKey = keyof Strings['story']['ingredients'];
const INGREDIENT_ORDER: IngredientKey[] = ['orange', 'cinnamon', 'star', 'cardamom', 'clove'];

/** Small progress ring: a visual cue for time passing. The text beside it always carries the instruction. */
function Ring({ name }: { name: string }) {
  return (
    <svg className="cue__ring" viewBox="0 0 36 36" width="34" height="34" aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="15.915" className="cue__ring-track" />
      <circle cx="18" cy="18" r="15.915" className="cue__ring-value" pathLength={100} data-ring={name} />
    </svg>
  );
}

function ChapterNumber({ index }: { index: number }) {
  const { t } = useLanguage();
  return (
    <p className="story-copy__count">
      <span className="story-copy__count-word">{t.story.chapterWord}</span> <span className="numeral">{index + 1}</span>
      <span className="story-copy__count-of">
        {' '}
        {t.story.of} <span className="numeral">6</span>
      </span>
    </p>
  );
}

/**
 * DOM typography over the 3D stage: chapter copy, ingredient names, time cues, the
 * finale line, the chapter indicator, and the skip link. All of it is animated by the
 * scroll timeline in Journey, never by timers.
 */
export function StoryOverlay({ chapter }: { chapter: number }) {
  const { t, l } = useLanguage();
  const s = t.story;

  return (
    <div className="stage__overlay">
      <h2 className="visually-hidden">{s.heading}</h2>

      <article className="story-gift" aria-labelledby="gift-title">
        <p className="eyebrow story-gift__eyebrow">{s.gift.eyebrow}</p>
        <h3 id="gift-title" className="story-gift__title">
          {s.gift.title}
        </h3>
        <p className="story-gift__body">{s.gift.body}</p>
      </article>

      {s.chapters.map((c, i) => (
        <article key={i} className="story-copy" data-chapter={i + 1} aria-labelledby={`story-title-${i + 1}`}>
          <ChapterNumber index={i} />
          <h3 id={`story-title-${i + 1}`} className="story-copy__title">
            {c.title}
          </h3>
          <p className="story-copy__body">{c.body}</p>

          {/* Each name appears as its ingredient enters the pan. */}
          {i === 2 && (
            <ul className="story-ingredients" aria-label={t.recipe.fromKit}>
              {INGREDIENT_ORDER.map((key) => (
                <li key={key} data-ingredient={key}>
                  {s.ingredients[key]}
                </li>
              ))}
            </ul>
          )}

          {i === 3 && (
            <div className="cue-row">
              <p className="cue">
                <Ring name="simmer" />
                <span>
                  <strong>{s.cues.lowHeat}</strong>
                  <span className="cue__sub">{s.cues.minutes15}</span>
                </span>
              </p>
              <p className="cue cue--warning">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                  <path d="M12 3.5 21.5 20h-19zM12 10v4.5M12 17.2v.3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <strong>{c.note}</strong>
              </p>
            </div>
          )}

          {i === 4 && (
            <div className="cue-row">
              <p className="cue">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                  <path d="M12 3v8M7 6.2a8 8 0 1 0 10 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <strong>{s.cues.heatOff}</strong>
              </p>
              <p className="cue" data-cue="rest">
                <Ring name="rest" />
                <span>
                  <strong>{s.cues.rest}</strong>
                  <span className="cue__sub">{s.cues.minutes8}</span>
                </span>
              </p>
            </div>
          )}

          {i !== 3 && c.note && <p className="story-copy__note">{c.note}</p>}
        </article>
      ))}

      <div className="story-finale">
        <Ornament />
        <p className="story-finale__line">{l(brand.signature)}</p>
        <p className="story-finale__note">{s.finale.note}</p>
      </div>

      <div className="story-chrome">
        <nav className="chapter-nav" aria-label={s.chaptersNav}>
          <ol>
            {s.chapters.map((c, i) => (
              <li key={i}>
                <a href={`#${ANCHORS.chapter(i + 1)}`} aria-current={chapter === i ? 'step' : undefined} title={c.title}>
                  <span className="chapter-nav__dot" aria-hidden="true" />
                  <span className="visually-hidden">
                    {s.chapterWord} {i + 1}: {c.title}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <a className="story-skip" href={`#${ANCHORS.inside}`}>
          {s.skip}
        </a>
      </div>
    </div>
  );
}
