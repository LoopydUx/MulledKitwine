import { brand } from '../config/product';
import { ANCHORS } from '../config/story';
import type { StageMode } from '../hooks/useStageMode';
import { useLanguage } from '../i18n/LanguageContext';
import { Wordmark } from './bits';

export function Footer({ mode, canAnimate, onChoose }: { mode: StageMode; canAnimate: boolean; onChoose: (mode: StageMode) => void }) {
  const { t, l } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <Wordmark />
        <p className="site-footer__signature">{l(brand.signature)}</p>
      </div>
      <nav aria-label={t.footer.links}>
        <ul className="site-footer__links">
          <li>
            <a href={`#${ANCHORS.top}`}>{t.footer.replay}</a>
          </li>
          <li>
            <a href={brand.website.url} target="_blank" rel="noopener">
              {t.footer.website}
            </a>
          </li>
          <li>
            <a href={brand.instagram.url} target="_blank" rel="noopener">
              {t.footer.instagram}
            </a>
          </li>
          {canAnimate && (
            <li>
              <button type="button" className="text-button" onClick={() => onChoose(mode === 'animated' ? 'static' : 'animated')}>
                {mode === 'animated' ? t.story.showStills : t.story.playAnimated}
              </button>
            </li>
          )}
        </ul>
      </nav>
      <p className="site-footer__legal">{t.footer.responsible}</p>
    </footer>
  );
}
