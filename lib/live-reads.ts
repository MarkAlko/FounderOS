/**
 * Phase-1 live reads. GLADOS_LIVE_READS=1 lets a trial or a demo fetch the
 * read-only connectors (Monday, calendar, one mailbox, Notion org). It never
 * opens sends, writes, posts, or cron. Those stay on the trial gate.
 *
 * A real install (not filming, not a trial) may read without the flag.
 */
import { filmingMode } from '@/lib/paths';
import type { HelpMode } from '@/lib/page-help';

const BANK = '7890955175';
const TASKS = '4739453413';
const ids = (raw: string | undefined) => [...new Set((raw ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];

export function liveReadConnectorsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.GLADOS_LIVE_READS === '1') return true;
  if (env.GLADOS_TRIAL === '1') return false;
  if (filmingMode()) return false;
  return true;
}

function configured(key: string, env: Record<string, string | undefined>): boolean {
  const allow = new Set(ids(env.MONDAY_BOARD_IDS));
  if (key === 'monday-tasks') return Boolean(env.MONDAY_API_TOKEN && allow.has(TASKS));
  if (key === 'monday-funnel') return Boolean(env.MONDAY_API_TOKEN && ids(env.MONDAY_LEAD_BOARD_IDS).some((id) => allow.has(id) && id !== BANK));
  if (key === 'monday-finance') return Boolean(env.MONDAY_API_TOKEN && ids(env.MONDAY_FINANCE_BOARD_IDS).some((id) => allow.has(id) && id !== BANK));
  if (key === 'calendar') return Boolean(env.CALENDAR_USER && env.CALENDAR_APP_PASSWORD);
  if (key === 'mail') return Boolean(env.MAIL_IMAP_HOST && env.MAIL_IMAP_USER && env.MAIL_IMAP_PASS);
  if (key === 'notion-org') return Boolean(env.NOTION_API_KEY && env.NOTION_ORG_PAGE_IDS);
  return false;
}

export function helpModes(env: Record<string, string | undefined> = process.env): Record<string, HelpMode> {
  const on = liveReadConnectorsEnabled(env);
  const keys = ['monday-tasks', 'monday-funnel', 'monday-finance', 'calendar', 'mail', 'notion-org'];
  return Object.fromEntries(keys.map((key) => [key, !on ? 'demo' : configured(key, env) ? 'live' : 'none']));
}
