import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { L10n } from '../config/product';
import { strings, type Strings } from './strings';

interface LanguageValue {
  t: Strings;
  /** English copy from a localized config value */
  l: (value: L10n) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = 'en';
    root.dir = 'ltr';
    document.title = strings.meta.title;
    try {
      window.localStorage.removeItem('cana-lang');
    } catch {
      /* storage can be unavailable */
    }
  }, []);

  const value = useMemo<LanguageValue>(() => ({ t: strings, l: (v) => v.en }), []);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
