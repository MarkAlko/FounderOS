'use client';

import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, LOCALE_MAX_AGE, LOCALES, localeDir, type Locale } from '@/lib/locale';
import { t } from '@/lib/messages';

/** Settings control. Writes the locale cookie and refreshes so the server paint matches. */
export function LocalePicker({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = localeDir(next);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t(locale, 'page.language')}>
      {LOCALES.map((id) => {
        const on = id === locale;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => choose(id)}
            className="rounded-full border px-3 py-1 text-[13px] transition-colors"
            style={{
              borderColor: on ? 'var(--accent-line)' : 'var(--border)',
              background: on ? 'var(--accent-soft)' : 'transparent',
              color: on ? 'var(--text)' : 'var(--text-2)',
            }}
          >
            <span dir={id === 'he' ? 'rtl' : 'ltr'}>{t(locale, `locale.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
