/**
 * Locale for this fork. Hebrew is the default for a fresh browser; English
 * is the fallback and a stored choice. The cookie is the source the server
 * can see, so the first paint already has the right `lang` and `dir`.
 */
export const LOCALES = ['he', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'he';
export const LOCALE_COOKIE = 'mrk-locale';
export const LOCALE_MAX_AGE = 365 * 24 * 60 * 60;

export function isLocale(value: unknown): value is Locale {
  return value === 'he' || value === 'en';
}

/** Unknown or empty values fall back to Hebrew, the product default. */
export function parseLocale(raw: string | null | undefined): Locale {
  const value = (raw ?? '').trim().toLowerCase();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

export function localeLang(locale: Locale): 'he' | 'en' {
  return locale;
}
