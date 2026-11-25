import { assets, order } from '../config/product';
import { ANCHORS } from '../config/story';
import { useReveal } from '../hooks/useViewport';
import { useLanguage } from '../i18n/LanguageContext';
import { SatinRibbon } from './bits';

/**
 * Closing section. The button appears only when `order.url` is a real checkout;
 * with no URL the section stays a closing line and does not pretend to take an order.
 */
export function OrderSection() {
  const { t, l } = useLanguage();
  const o = t.order;
  const copyRef = useReveal<HTMLDivElement>();
  const artRef = useReveal<HTMLElement>();

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
          <p className="order__line">{o.body}</p>

          {order.price && <p className="order__price">{l(order.price)}</p>}

          {order.url && (
            <a className="btn btn--gold" href={order.url}>
              {o.cta}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
