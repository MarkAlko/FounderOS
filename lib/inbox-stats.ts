import type { InboxSource, InboxThread } from '@/lib/inbox';
import { SOURCES } from '@/lib/inbox';

/**
 * The numbers behind the /inbox report row. Everything here is counted from
 * data that exists: threads the feed actually pulled, and (for the only
 * week-over-week figure) real message timestamps out of the WhatsApp database.
 *
 * Every chart plots one stated quantity with a caption naming it — a bar is a
 * conversation, a channel or a day, never decoration. Nothing is snapshotted
 * over time anywhere in GladOS, so no card but `messages` can carry a
 * "vs. last week" without inventing the comparison.
 */

const DAY = 86_400_000;

export type Tone = 'accent' | 'warn' | 'err' | 'plain';

export type Bar = { value: number; label: string };
export type Cell = { on: boolean; label: string };

export type Chart =
  | { kind: 'bars'; bars: Bar[]; tone: Tone; caption: string }
  | { kind: 'cells'; cells: Cell[]; tone: Tone; caption: string };

export interface StatCard {
  id: string;
  label: string;
  value: string;
  unit?: string;
  /** Only ever present when a real comparison exists. */
  delta?: { text: string; dir: 'up' | 'down' | 'flat'; note: string };
  /** Plain statement of what the number is made of. Never a fake trend. */
  sub?: string;
  chart: Chart;
}

export interface WeeklyInput {
  thisWeek: number;
  lastWeek: number;
}

/** Unread per conversation, busiest first — one bar per conversation. */
export function unreadBars(threads: InboxThread[], max = 22): Bar[] {
  return threads
    .filter((t) => t.unread > 0)
    .sort((a, b) => b.unread - a.unread)
    .slice(0, max)
    .map((t) => ({ value: t.unread, label: `${t.sender}: ${t.unread.toLocaleString('he-IL')} לא נקראו` }));
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Messages per day over the trailing 7 days, oldest first. */
export function perDay(threads: InboxThread[], now: Date = new Date(), days = 7): Bar[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const counts = new Array(days).fill(0) as number[];
  for (const t of threads) {
    const ts = Date.parse(t.ts);
    if (!Number.isFinite(ts)) continue;
    const idx = days - 1 - Math.floor((start + DAY - ts) / DAY);
    if (idx >= 0 && idx < days) counts[idx] += 1;
  }
  return counts.map((value, i) => {
    const d = new Date(start - (days - 1 - i) * DAY);
    return { value, label: `${WEEKDAY[d.getDay()]}: ${value} message${value === 1 ? '' : 's'}` };
  });
}

/** Needs-reply threads split by the channel they came in on. */
export function replyByChannel(threads: InboxThread[]): Bar[] {
  const reply = threads.filter((t) => t.triage === 'reply');
  return SOURCES.map((s) => {
    const value = reply.filter((t) => t.source === s.id).length;
    return { value, label: `${s.label}: ${value} waiting` };
  });
}

function pct(now: number, before: number): { text: string; dir: 'up' | 'down' | 'flat' } {
  if (before <= 0) return { text: now > 0 ? 'new' : 'flat', dir: now > 0 ? 'up' : 'flat' };
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return { text: 'flat', dir: 'flat' };
  return { text: `${change > 0 ? '+' : ''}${change}%`, dir: change > 0 ? 'up' : 'down' };
}

export function buildStatCards(
  threads: InboxThread[],
  connected: Record<InboxSource, boolean>,
  weekly: WeeklyInput | null,
  now: Date = new Date(),
): StatCard[] {
  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const bars = unreadBars(threads);
  const conversations = threads.filter((t) => t.unread > 0).length;
  const reply = threads.filter((t) => t.triage === 'reply').length;
  const live = SOURCES.filter((s) => connected[s.id]);
  const days = perDay(threads, now);
  const byChannel = replyByChannel(threads);

  return [
    {
      id: 'unread',
      label: 'לא נקרא',
      value: String(unread),
      sub: conversations === 1 ? 'בשיחה אחת' : `ב־${conversations.toLocaleString('he-IL')} שיחות`,
      chart: {
        kind: 'bars',
        bars,
        tone: 'accent',
        caption: bars.length ? 'עמודה לשיחה, העמוסה קודם' : 'אין שלא נקרא',
      },
    },
    {
      id: 'reply',
      label: 'צריך תשובה',
      value: String(reply),
      sub: reply ? 'שאלות אליך, ושיחות שלא נקראו' : 'הכל מטופל',
      chart: { kind: 'bars', bars: byChannel, tone: 'err', caption: 'לפי ערוץ' },
    },
    {
      id: 'messages',
      label: 'הודעות השבוע',
      value: String(weekly ? weekly.thisWeek : days.reduce((a, b) => a + b.value, 0)),
      delta: weekly ? { ...pct(weekly.thisWeek, weekly.lastWeek), note: 'לעומת השבוע שעבר' } : undefined,
      sub: weekly ? undefined : 'בשיחות שבעמוד',
      chart: { kind: 'bars', bars: days, tone: 'accent', caption: 'עמודה ליום, שבעה אחרונים' },
    },
    {
      id: 'channels',
      label: 'ערוצים מחוברים',
      value: String(live.length),
      unit: `מתוך ${SOURCES.length}`,
      sub: live.length ? live.map((s) => s.label).join(', ') : 'עדיין אין חיבור',
      chart: {
        kind: 'cells',
        cells: SOURCES.map((s) => ({ on: connected[s.id], label: `${s.label}: ${connected[s.id] ? 'מחובר' : 'לא מוגדר'}` })),
        tone: live.length === SOURCES.length ? 'accent' : 'warn',
        caption: 'בלוק לערוץ',
      },
    },
  ];
}
