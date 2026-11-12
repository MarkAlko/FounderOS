/** Hebrew copy and Jerusalem dates for the read-only snapshots. No filesystem imports. */

const DAY: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' };
const CLOCK: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false };
const WHEN: Intl.DateTimeFormatOptions = { ...DAY, ...CLOCK };

export const INBOX_REPLY_HINT = 'תשובות נשלחות מתוך התיבה עצמה';

export function jerusalemDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', DAY).format(date);
}

export function jerusalemClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('he-IL', CLOCK);
}

function stamped(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('he-IL', WHEN);
}

function badge(label: string, iso: string): string {
  const when = stamped(iso);
  return when ? `${label} · עודכן ${when}` : label;
}

export function calendarBadgeText(iso: string): string {
  return badge('תמונת מצב של היומן', iso);
}

export function inboxBadgeText(iso: string): string {
  return badge('תמונת מצב של התיבה', iso);
}

export function knowledgeBadgeText(iso: string): string {
  return badge('תמונת מצב של הידע', iso);
}

export type WindowEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; attendeesCount: number };

function shiftDay(day: string, by: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + by)).toISOString().slice(0, 10);
}

/** Today, and the rest of the next seven Jerusalem days. */
export function calendarWindow(events: WindowEvent[], now: Date): { today: WindowEvent[]; week: WindowEvent[] } {
  const start = jerusalemDay(now);
  const end = shiftDay(start, 6);
  const today: WindowEvent[] = [];
  const week: WindowEvent[] = [];
  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const day = jerusalemDay(new Date(event.start));
    if (day === start) today.push(event);
    else if (day > start && day <= end) week.push(event);
  }
  return { today, week };
}
