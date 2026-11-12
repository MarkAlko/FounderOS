/** Hebrew labels for the bots snapshot. No filesystem imports: the client board uses this too. */

export const BOT_CATEGORIES = [
  'mail',
  'calendar',
  'Monday',
  'quotes',
  'Notion/knowledge',
  'WhatsApp',
  'website',
  'marketing',
  'meetings',
  'management',
  'personal',
  'other',
] as const;

export type BotCategory = (typeof BOT_CATEGORIES)[number];
export type BotStatus = 'active' | 'idle' | 'unknown';

export const BOT_CATEGORY_LABEL: Record<BotCategory, string> = {
  mail: 'דואר',
  calendar: 'יומן',
  Monday: 'Monday',
  quotes: 'הצעות',
  'Notion/knowledge': 'ידע',
  WhatsApp: 'WhatsApp',
  website: 'אתר',
  marketing: 'שיווק',
  meetings: 'פגישות',
  management: 'ניהול',
  personal: 'אישי',
  other: 'אחר',
};

export const BOT_STATUS_LABEL: Record<BotStatus, string> = {
  active: 'פעיל',
  idle: 'ממתין',
  unknown: 'לא ידוע',
};

export function botStatusRank(status: BotStatus): number {
  if (status === 'active') return 0;
  if (status === 'idle') return 1;
  return 2;
}

const WHEN: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

export function botsWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('he-IL', WHEN);
}

export function botsBadgeText(iso: string): string {
  const when = botsWhen(iso);
  return when ? `תמונת מצב של הבוטים · עודכן ${when}` : 'תמונת מצב של הבוטים';
}
