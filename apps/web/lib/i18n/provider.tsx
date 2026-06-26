'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import {
  defaultLocale,
  dirForLocale,
  getMessages,
  translate,
  type Locale,
  type Messages,
} from './config';

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages: getMessages(locale),
      t: (key: string) => translate(locale, key),
    }),
    [locale],
  );

  // Keep the document element in sync so direction/lang are correct app-wide,
  // including portals rendered outside the localized subtree.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = dirForLocale(locale);
    }
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext)?.locale ?? defaultLocale;
}

export function useTranslations(): (key: string) => string {
  const context = useContext(LocaleContext);
  return context ? context.t : (key: string) => translate(defaultLocale, key);
}
