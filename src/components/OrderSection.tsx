import { assets, brand, order } from '../config/product';
import { ANCHORS } from '../config/story';
import { useReveal } from '../hooks/useViewport';
import { useLanguage } from '../i18n/LanguageContext';
import { Ornament, SatinRibbon } from './bits';

/**
 * Closing section. With `order.url` configured it links to the real checkout;
 * without one it explains honestly how to reach the brand instead of faking a purchase flow.
 */
export function OrderSection() {
  const { t, l } = useLanguage();
  const o = t.order;
  const copyRef = useReveal<HTMLDivElement>();
  const artRef = useReveal<HTMLElement>();
  const howRef = useReveal<HTMLDivElement>();

  return (
    <section id={ANCHORS.order} className="section order" aria-labelledby="order-title">
      <div className="order__bg" aria-hidden="true">
        <SatinRibbon />
      </div>
      <div className="order__layout">
        <figure className="order__art reveal" ref={artRef}>
          <img src={assets.stills.closing} alt={o.alt} width={2000} height={1500} loading="lazy" decoding="async" />
        </figure>

        <div className="order__copy reveal" ref={copyRef}>
          <h2 id="order-title" className="order__title">
            {o.title}
          </h2>
          <Ornament />
          <p className="order__body">{o.body}</p>

          <h3 className="order__subhead">{o.contentsTitle}</h3>
          <ul className="order__contents">
            {o.contents.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {order.price && <p className="order__price">{l(order.price)}</p>}

          {order.url ? (
            <a className="btn btn--gold" href={order.url}>
              {o.ctaOnline}
            </a>
          ) : (
            <a className="btn btn--gold" href={`#${ANCHORS.howToOrder}`}>
              {o.cta}
            </a>
          )}
        </div>
      </div>

      {!order.url && (
        <div id={ANCHORS.howToOrder} className="how reveal" ref={howRef} role="region" aria-labelledby="how-title">
          <h3 id="how-title" className="how__title">
            {o.howTitle}
          </h3>
          <p className="how__body">{o.howBody}</p>
          <ul className="how__ways">
            <li>
              <span className="how__label">{o.website}</span>
              <a href={brand.website.url} target="_blank" rel="noopener" dir="ltr">
                {brand.website.label}
              </a>
            </li>
            <li>
              <span className="how__label">{o.instagram}</span>
              <a href={brand.instagram.url} target="_blank" rel="noopener" dir="ltr">
                {brand.instagram.label}
              </a>
            </li>
            <li>
              <span className="how__label">{o.boutique}</span>
              <span>{l(brand.boutique)}</span>
            </li>
          </ul>
          <p className="how__note">{o.priceNote}</p>
        </div>
      )}
    </section>
  );
}
