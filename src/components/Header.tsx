import { useEffect, useRef, useState } from 'react';
import { order } from '../config/product';
import { ANCHORS } from '../config/story';
import { useLanguage } from '../i18n/LanguageContext';
import { Wordmark } from './bits';

function OrderLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const { t } = useLanguage();
  // A verified checkout URL leaves the page; otherwise the button scrolls to the order section.
  return order.url ? (
    <a className={className} href={order.url} onClick={onClick}>
      {t.nav.cta}
    </a>
  ) : (
    <a className={className} href={`#${ANCHORS.order}`} onClick={onClick}>
      {t.nav.cta}
    </a>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement | null>(null);

  // <dialog>.showModal() gives a focus trap, Escape to close, and an inert page behind it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const links = [
    { href: `#${ANCHORS.ritual}`, label: t.nav.ritual },
    { href: `#${ANCHORS.inside}`, label: t.nav.inside },
  ];

  return (
    <dialog
      ref={ref}
      id="mobile-menu"
      className="mobile-menu"
      aria-label={t.nav.menu}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="mobile-menu__panel">
        <div className="mobile-menu__top">
          <Wordmark />
          <button type="button" className="icon-button" onClick={onClose} aria-label={t.nav.close}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav aria-label={t.nav.primary}>
          <ul className="mobile-menu__links">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={onClose}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu__actions">
          <OrderLink className="btn btn--gold" onClick={onClose} />
        </div>
      </div>
    </dialog>
  );
}

export function Header() {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // close the menu if the layout grows past the mobile breakpoint
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 900px)');
    const onChange = (): void => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      <header className="site-header" data-solid={solid}>
        <a className="skip-link" href="#main">
          {t.nav.skipToContent}
        </a>
        <a className="site-header__brand" href={`#${ANCHORS.top}`} aria-label={t.nav.home}>
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label={t.nav.primary}>
          <a href={`#${ANCHORS.ritual}`}>{t.nav.ritual}</a>
          <a href={`#${ANCHORS.inside}`}>{t.nav.inside}</a>
        </nav>
        <div className="site-header__actions">
          <OrderLink className="btn btn--gold btn--small" />
          <button
            type="button"
            className="icon-button site-header__menu"
            aria-label={t.nav.menu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
