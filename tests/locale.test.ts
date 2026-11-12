import { describe, expect, test } from 'vitest';
import { DEFAULT_LOCALE, localeDir, parseLocale } from '@/lib/locale';
import { MESSAGE_KEYS, t } from '@/lib/messages';

describe('locale', () => {
  test('Hebrew is the default and English is explicit', () => {
    expect(DEFAULT_LOCALE).toBe('he');
    expect(parseLocale(null)).toBe('he');
    expect(parseLocale('')).toBe('he');
    expect(parseLocale('nope')).toBe('he');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale(' HE ')).toBe('he');
  });

  test('direction follows the language', () => {
    expect(localeDir('he')).toBe('rtl');
    expect(localeDir('en')).toBe('ltr');
  });

  test('every shipped string exists in both languages and Hebrew is not a copy of English', () => {
    for (const key of MESSAGE_KEYS) {
      expect(t('en', key).length, key).toBeGreaterThan(0);
      expect(t('he', key).length, key).toBeGreaterThan(0);
    }
    expect(t('he', 'nav./')).toBe('בית');
    expect(t('en', 'nav./')).toBe('Home');
    expect(t('he', 'missing', 'Home')).toBe('Home');
  });
});
