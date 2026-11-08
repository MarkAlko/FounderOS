import { cookies } from 'next/headers';
import { LOCALE_COOKIE, parseLocale, type Locale } from '@/lib/locale';

/** The locale for this request. A missing cookie is Hebrew. */
export async function getLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    return parseLocale(jar.get(LOCALE_COOKIE)?.value);
  } catch {
    return parseLocale(null);
  }
}
