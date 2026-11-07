import { t } from '@/lib/messages';
import type { Locale } from '@/lib/locale';

/** Global filming notice. Fixed above the content column, including workspace pages. */
export function DemoBanner({ locale }: { locale: Locale }) {
  return (
    <div className="demo-banner" role="status" data-demo-banner="">
      {t(locale, 'demo.banner')}
    </div>
  );
}
