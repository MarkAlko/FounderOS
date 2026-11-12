import Link from 'next/link';
import { SetupLink } from '@/components/SetupLink';
import { rangeContaining, sinceText } from '@/lib/tasks-metrics';

/**
 * The honest empty state for a run chart on /tasks (S04 F-T8, H27).
 *
 * Runs exist but none fall in the window: say how long ago the last one was
 * and offer the smallest page range that contains it. Only when nothing has
 * ever run does it say so, with the Set up link.
 */
export function RunsEmpty({
  windowLabel,
  lastRunAt,
  now,
  minDays = 0,
}: {
  /** "the last 30 days" */
  windowLabel: string;
  lastRunAt: string | null;
  now: number;
  /** never offer a range narrower than this (the page range already shown) */
  minDays?: number;
}) {
  if (!lastRunAt) {
    return (
      <>
        <div className="text-[13px] text-os-muted">עדיין אין ריצות סוכנים</div>
        <div className="max-w-[260px] text-[12px] leading-relaxed text-os-dim">
          אחוז ההצלחה נמדד מריצות אמיתיות.
        </div>
        <SetupLink href="/agents" hint="הסוכנים רצים על המארח. מעלים אחד כדי להתחיל לתעד ריצות." />
      </>
    );
  }

  const wider = rangeContaining(lastRunAt, now);
  const offer = wider && wider.days > minDays ? wider : null;

  return (
    <>
      <div className="text-[13px] text-os-muted">
        אין ריצות ב{windowLabel} · ריצה אחרונה {sinceText(lastRunAt, now)}
      </div>
      {offer && (
        <Link
          href={`/tasks?range=${offer.id}#outcomes`}
          className="text-[12px] text-[var(--accent)] underline-offset-2 hover:underline"
        >
          הרחבה ל{offer.days === 365 ? '12 חודשים' : `${offer.days} ימים`}
        </Link>
      )}
    </>
  );
}
