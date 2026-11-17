import { useState } from 'react';
import markerData from '../config/kit-markers.json';
import { assets, kitItems, type KitItemId } from '../config/product';
import { ANCHORS } from '../config/story';
import { useReveal } from '../hooks/useViewport';
import { useLanguage } from '../i18n/LanguageContext';
import { Ornament } from './bits';

interface Marker {
  id: string;
  x: number;
  y: number;
}
// Positions are written by the still-capture tool together with the kit artwork.
const markers = markerData as Marker[];

export function KitSection() {
  const { t, l } = useLanguage();
  const [active, setActive] = useState<KitItemId | null>(null);
  const headRef = useReveal<HTMLElement>();
  const figureRef = useReveal<HTMLElement>();
  const listRef = useReveal<HTMLOListElement>();
  const numberOf = (id: string): number => kitItems.findIndex((item) => item.id === id) + 1;

  return (
    <section id={ANCHORS.inside} className="section kit" aria-labelledby="kit-title">
      <header className="section-head reveal" ref={headRef}>
        <p className="eyebrow">{t.kit.eyebrow}</p>
        <h2 id="kit-title" className="section-title">
          {t.kit.title}
        </h2>
        <Ornament />
        <p className="section-intro">{t.kit.intro}</p>
      </header>

      <figure className="kit__figure reveal" ref={figureRef}>
        <div className="kit__art">
          <img src={assets.stills.kit} alt={t.kit.alt} width={2000} height={1500} loading="lazy" decoding="async" />
          {/* Numbers match the list below; brand artwork is never mirrored in Arabic. */}
          <div className="kit__markers" aria-hidden="true" dir="ltr">
            {markers.map((m) => (
              <span
                key={m.id}
                className="kit__marker numeral"
                data-active={active === m.id}
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                onMouseEnter={() => setActive(m.id as KitItemId)}
                onMouseLeave={() => setActive(null)}
              >
                {numberOf(m.id)}
              </span>
            ))}
          </div>
        </div>
      </figure>

      <h3 className="kit__subhead">{t.kit.included}</h3>
      <ol className="kit__list reveal" ref={listRef}>
        {kitItems.map((item, i) => (
          <li
            key={item.id}
            className="kit-item"
            data-active={active === item.id}
            onMouseEnter={() => setActive(item.id)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="kit-item__art" aria-hidden="true">
              {item.illustration ? (
                <img src={item.illustration} alt="" loading="lazy" decoding="async" />
              ) : (
                <img className="kit-item__cover" src={assets.bookletCover} alt="" loading="lazy" decoding="async" />
              )}
            </div>
            <div className="kit-item__text">
              <p className="kit-item__role">
                <span className="kit-item__number numeral">{i + 1}</span>
                {l(item.role)}
              </p>
              <h4 className="kit-item__name">{l(item.name)}</h4>
              <p className="kit-item__description">{l(item.description)}</p>
              {item.meta && <p className="kit-item__meta">{l(item.meta)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
