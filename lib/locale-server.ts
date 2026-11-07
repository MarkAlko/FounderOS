import { cookies } from 'next/headers';
import { LOCALE_COOKIE, parseLocale, type Locale } from '@/lib/locale';

/** The locale for this request. A missing cookie is Hebrew. */
export function getLocale(): Locale {
  try {
    return parseLocale(cookies().get(LOCALE_COOKIE)?.value);
  } catch {
    return parseLocale(null);
  }
}
