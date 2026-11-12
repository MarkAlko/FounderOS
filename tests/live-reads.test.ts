import { describe, expect, test } from 'vitest';
import { helpModes, liveReadConnectorsEnabled } from '@/lib/live-reads';
import {
  MONDAY_BANK_BOARD_ID,
  assertReadOnlyQuery,
  assertReadableBoard,
  financeSummary,
  groupTasks,
  openQuotes,
  toTask,
  type MondayBoardPayload,
  type MondayItem,
} from '@/lib/connectors/monday';
import { mondayStage } from '@/lib/funnel-monday';
import { MAIL_FETCH_QUERY } from '@/lib/connectors/business-mail';
import { keepOrgTitle } from '@/lib/connectors/notion-org';
import { trialBlockReason } from '@/lib/trial';
import { caldavAccounts } from '@/lib/connectors/gcal';

const columns = [
  { id: 'owner', title: 'בעלים' },
  { id: 'company', title: 'חברה' },
  { id: 'priority', title: 'עדיפות' },
  { id: 'due', title: 'תאריך יעד' },
  { id: 'status', title: 'סטטוס' },
  { id: 'subject', title: 'נושא' },
  { id: 'client', title: 'לקוח' },
  { id: 'quote', title: 'מספר הצעה' },
  { id: 'amount', title: 'סכום' },
  { id: 'sumit', title: 'SUMIT' },
];

function item(over: Partial<MondayItem> = {}): MondayItem {
  return {
    id: 'i1',
    name: 'לקוח א',
    group: { title: 'היום' },
    column_values: [
      { id: 'owner', text: 'מארק' },
      { id: 'status', text: 'הצעה' },
      { id: 'quote', text: 'Q-12' },
      { id: 'amount', text: '1000' },
      { id: 'sumit', text: 'https://sumit.example/q/12' },
    ],
    ...over,
  };
}

const board: MondayBoardPayload = { id: '4739453413', name: 'משימות לטיפול- כללי', columns, groups: [{ id: 'g', title: 'היום' }] };

describe('live reads', () => {
  test('a trial stays dark until the flag is set', () => {
    expect(liveReadConnectorsEnabled({ GLADOS_TRIAL: '1' })).toBe(false);
    expect(liveReadConnectorsEnabled({ GLADOS_TRIAL: '1', GLADOS_LIVE_READS: '1' })).toBe(true);
  });

  test('the flag does not open sends', () => {
    process.env.GLADOS_LIVE_READS = '1';
    expect(trialBlockReason('/api/wizard/send', 'POST')).toBeTruthy();
    expect(trialBlockReason('/api/social/posts', 'POST')).toBeTruthy();
    delete process.env.GLADOS_LIVE_READS;
  });

  test('monday refuses mutations and the bank board', () => {
    expect(() => assertReadOnlyQuery('mutation { create_item }')).toThrow(/read-only/);
    const allow = new Set([MONDAY_BANK_BOARD_ID, '1']);
    expect(() => assertReadableBoard(MONDAY_BANK_BOARD_ID, allow)).toThrow(/bank/);
    expect(() => assertReadableBoard('2', allow)).toThrow(/allowlist/);
  });

  test('tasks keep the four open groups and drop נסגר', () => {
    const closed = item({ id: 'c', group: { title: 'נסגר' } });
    const grouped = groupTasks(board, [item(), closed, item({ id: 'w', group: { title: 'השבוע' } })]);
    expect(grouped.groups.map((g) => g.title)).toEqual(['היום', 'השבוע', 'ממתין לאחרים', 'טווח רחוק']);
    expect(grouped.groups[0].tasks).toHaveLength(1);
    expect(grouped.groups[0].tasks[0].quoteNumber).toBe('Q-12');
    expect(toTask(item(), columns).owner).toBe('מארק');
  });

  test('finance summary is counts and totals, with no row names', () => {
    const summary = financeSummary(board, [item(), item({ id: 'i2' })]);
    expect(JSON.stringify(summary)).not.toContain('לקוח א');
    expect(summary.byStatus).toEqual([{ status: 'הצעה', count: 2, total: 2000 }]);
  });

  test('open quotes skip a closed status', () => {
    const quotes = openQuotes([item(), item({ id: 'x', column_values: [{ id: 'status', text: 'נסגר' }, { id: 'quote', text: 'Q-9' }] })], columns, '155');
    expect(quotes.map((q) => q.quoteNumber)).toEqual(['Q-12']);
  });

  test('lead status maps onto funnel stages', () => {
    expect(mondayStage('הצעה נשלחה')).toBe('opted_in');
    expect(mondayStage('lost')).toBe('lost');
    expect(mondayStage('חדש')).toBe('first_touch');
  });

  test('mailbox fetch asks for the envelope only', () => {
    expect(MAIL_FETCH_QUERY).toEqual({ envelope: true, flags: true });
    expect(JSON.stringify(MAIL_FETCH_QUERY)).not.toMatch(/body|source/);
  });

  test('notion org drops personal, health, and family titles', () => {
    expect(keepOrgTitle('Family office')).toBe(false);
    expect(keepOrgTitle('בריאות')).toBe(false);
    expect(keepOrgTitle('קבוצת MRK')).toBe(true);
  });

  test('calendar account comes from the dedicated app password', () => {
    const accounts = caldavAccounts({ CALENDAR_USER: 'mark@mrk-holdings.com', CALENDAR_APP_PASSWORD: 'app pass' });
    expect(accounts.map((a) => a.user)).toEqual(['mark@mrk-holdings.com']);
    expect(accounts[0].pass).toBe('apppass');
  });

  test('help names a live source only when the flag and the keys are set', () => {
    const off = helpModes({ GLADOS_TRIAL: '1' });
    expect(off['monday-tasks']).toBe('demo');
    const on = helpModes({
      GLADOS_TRIAL: '1',
      GLADOS_LIVE_READS: '1',
      MONDAY_API_TOKEN: 't',
      MONDAY_BOARD_IDS: '4739453413,7890246203',
      MONDAY_FINANCE_BOARD_IDS: '7890246203,7890955175',
      CALENDAR_USER: 'mark@mrk-holdings.com',
      CALENDAR_APP_PASSWORD: 'x',
    });
    expect(on['monday-tasks']).toBe('live');
    expect(on['monday-finance']).toBe('live');
    expect(on.calendar).toBe('live');
    expect(on.mail).toBe('none');
  });
});
