import { assets } from '../config/product';
import { ANCHORS } from '../config/story';
import { useReveal } from '../hooks/useViewport';
import { useLanguage } from '../i18n/LanguageContext';
import { Ornament } from './bits';

/** The complete recipe as real text, plus the supplied booklet PDF served from this site. */
export function RecipeSection() {
  const { t } = useLanguage();
  const r = t.recipe;
  const cardRef = useReveal<HTMLDivElement>();
  const sideRef = useReveal<HTMLDivElement>();

  return (
    <section id={ANCHORS.recipe} className="section recipe" aria-labelledby="recipe-title">
      <div className="recipe__layout">
        <div className="recipe__card reveal" ref={cardRef}>
          <header className="section-head">
            <p className="eyebrow">{r.eyebrow}</p>
            <h2 id="recipe-title" className="section-title">
              {r.title}
            </h2>
            <Ornament />
            <p className="section-intro">{r.intro}</p>
          </header>

          <ol className="recipe__steps">
            {r.steps.map((step, i) => (
              <li key={i} className="recipe-step">
                <p className="recipe-step__label">
                  {r.stepWord} <span className="numeral">{i + 1}</span>
                </p>
                <div>
                  <h3 className="recipe-step__title">{step.title}</h3>
                  <p className="recipe-step__body">
                    {step.body}
                    {step.warning && (
                      <>
                        {' '}
                        <strong className="recipe-step__warning">{step.warning}</strong>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="recipe__side reveal" ref={sideRef}>
          <dl className="recipe__facts">
            <div>
              <dt>{r.timeTitle}</dt>
              <dd>{r.time}</dd>
            </div>
            <div>
              <dt>
                {r.needTitle}: {r.fromKit}
              </dt>
              <dd>{r.fromKitList}</dd>
            </div>
            <div>
              <dt>
                {r.needTitle}: {r.fromKitchen}
              </dt>
              <dd>{r.fromKitchenList}</dd>
            </div>
          </dl>

          <figure className="recipe__booklet">
            <img src={assets.bookletSpread} alt={r.bookletAlt} width={1500} height={1000} loading="lazy" decoding="async" />
          </figure>

          <div className="recipe__actions">
            <a className="btn btn--wine" href={assets.recipePdf} target="_blank" rel="noopener" type="application/pdf">
              {r.read}
              <span className="btn__meta" dir="ltr">
                {r.pdfNote}
              </span>
            </a>
            <a className="btn btn--outline" href={assets.recipePdf} download type="application/pdf">
              {r.download}
              <span className="btn__meta" dir="ltr">
                {r.pdfNote} · {assets.recipePdfSize}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
