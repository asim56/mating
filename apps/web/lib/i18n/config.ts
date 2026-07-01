import enMessages from '../../messages/en.json';
import urMessages from '../../messages/ur.json';

export const locales = ['en', 'ur'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Right-to-left locales. Drives the `dir` attribute and Tailwind `rtl:` variants. */
export const rtlLocales: readonly Locale[] = ['ur'];

export type Direction = 'ltr' | 'rtl';

export type Messages = Record<string, string>;

const messages: Record<Locale, Messages> = {
  en: enMessages as Messages,
  ur: urMessages as Messages,
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function dirForLocale(locale: Locale): Direction {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

/**
 * Resolves a message key for a locale, falling back to the default locale and
 * finally to the key itself so missing translations are visible, never blank.
 */
export function translate(locale: Locale, key: string): string {
  return messages[locale]?.[key] ?? messages[defaultLocale]?.[key] ?? key;
}
