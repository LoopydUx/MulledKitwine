import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { L10n, Lang } from '../config/product';
import { strings, type Strings } from './strings';

interface LanguageValue {
  lang: Lang;
  rtl: boolean;
  t: Strings;
  /** pick the right language from a localized config value */
  l: (value: L10n) => string;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);
const STORAGE_KEY = 'cana-lang';

function initialLang(): Lang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'ar' || fromUrl === 'en') return fromUrl;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    /* storage can be unavailable; English is the default */
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = strings[lang].meta.title;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next: Lang = current === 'en' ? 'ar' : 'en';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({ lang, rtl: lang === 'ar', t: strings[lang], l: (v) => v[lang], toggle }),
    [lang, toggle],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
