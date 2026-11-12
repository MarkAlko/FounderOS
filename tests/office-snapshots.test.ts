import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST as postCalendar } from '@/app/api/snapshot/calendar/route';
import { POST as postInbox } from '@/app/api/snapshot/inbox/route';
import { POST as postKnowledge } from '@/app/api/snapshot/knowledge/route';
import { CalendarWindow } from '@/components/snapshots/CalendarWindow';
import { InboxSnapshotView } from '@/components/snapshots/InboxSnapshot';
import { KnowledgeSnapshotView } from '@/components/snapshots/KnowledgeSnapshot';
import {
  calendarSnapshotPath,
  inboxSnapshotPath,
  knowledgeSnapshotPath,
  readCalendarSnapshot,
  readInboxSnapshot,
  readKnowledgeSnapshot,
  writeCalendarSnapshot,
  type CalendarSnapshot,
  type InboxSnapshot,
  type KnowledgeSnapshot,
} from '@/lib/office-snapshots';
import { calendarBadgeText, calendarWindow, INBOX_REPLY_HINT, inboxBadgeText, knowledgeBadgeText } from '@/lib/snapshot-copy';
import { SNAPSHOT_MAX_BYTES } from '@/lib/monday-snapshot';

const KEYS = ['SNAPSHOT_INGEST_TOKEN', 'MONDAY_SNAPSHOT', 'CALENDAR_SNAPSHOT', 'INBOX_SNAPSHOT', 'KNOWLEDGE_SNAPSHOT', 'GLADOS_DATA_DIR', 'GLADOS_STORE', 'GLADOS_TRIAL'] as const;
const saved: Record<string, string | undefined> = {};
let dir = '';
const when = '2026-11-12T08:00:00.000Z';

function calendarBody(): CalendarSnapshot {
  return {
    generatedAt: when,
    calendar: 'Holdings',
    events: [
      { id: 'today', title: 'היום', start: '2026-11-12T08:00:00.000Z', end: '2026-11-12T09:00:00.000Z', allDay: false, location: 'משרד', attendeesCount: 2 },
      { id: 'week', title: 'בהמשך', start: '2026-11-14T08:00:00.000Z', end: '2026-11-14T09:00:00.000Z', allDay: false, location: '', attendeesCount: 0 },
      { id: 'later', title: 'אחר כך', start: '2026-11-20T08:00:00.000Z', end: '2026-11-20T09:00:00.000Z', allDay: true, location: '', attendeesCount: 0 },
    ],
  };
}

function inboxBody(): InboxSnapshot {
  return {
    generatedAt: when,
    mailbox: 'business',
    threads: [
      { id: 't1', subject: 'נושא', fromName: 'שם לדוגמה', receivedAt: when, unread: true, labels: ['עבודה'], snippet: 'שורה קצרה' },
    ],
  };
}

function knowledgeBody(): KnowledgeSnapshot {
  return {
    generatedAt: when,
    source: 'Notion',
    pages: [
      { id: 'p1', title: 'נהלים', url: 'https://example.com/p', section: 'תפעול', updatedAt: when, summary: 'תקציר' },
      { id: 'p2', title: 'מותג', url: '', section: 'שיווק', updatedAt: when, summary: 'עוד תקציר' },
    ],
  };
}

function post(fn: (req: Request) => Promise<Response>, url: string, body: string, headers: Record<string, string> = {}) {
  return fn(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body }));
}

beforeEach(() => {
  for (const key of KEYS) saved[key] = process.env[key];
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-snap-'));
  process.env.GLADOS_DATA_DIR = dir;
  delete process.env.GLADOS_TRIAL;
  delete process.env.GLADOS_STORE;
  delete process.env.MONDAY_SNAPSHOT;
  delete process.env.CALENDAR_SNAPSHOT;
  delete process.env.INBOX_SNAPSHOT;
  delete process.env.KNOWLEDGE_SNAPSHOT;
  delete process.env.SNAPSHOT_INGEST_TOKEN;
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('office snapshot ingest', () => {
  test('a missing token is 404 and a wrong bearer is 401', async () => {
    expect((await post(postCalendar, 'http://localhost/api/snapshot/calendar', '{}', { authorization: 'Bearer x' })).status).toBe(404);
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const headers = { authorization: 'Bearer nope' };
    expect((await post(postCalendar, 'http://localhost/api/snapshot/calendar', JSON.stringify(calendarBody()), headers)).status).toBe(401);
    expect((await post(postInbox, 'http://localhost/api/snapshot/inbox', JSON.stringify(inboxBody()), headers)).status).toBe(401);
    expect((await post(postKnowledge, 'http://localhost/api/snapshot/knowledge', JSON.stringify(knowledgeBody()), headers)).status).toBe(401);
  });

  test('valid bodies are written, and phone, token, password, and email keys are refused', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const headers = { authorization: 'Bearer ingest-secret' };
    const calendar = await post(postCalendar, 'http://localhost/api/snapshot/calendar', JSON.stringify(calendarBody()), headers);
    expect(calendar.status).toBe(200);
    expect(await calendar.json()).toEqual({ ok: true, events: 3 });
    const inbox = await post(postInbox, 'http://localhost/api/snapshot/inbox', JSON.stringify(inboxBody()), headers);
    expect(inbox.status).toBe(200);
    const knowledge = await post(postKnowledge, 'http://localhost/api/snapshot/knowledge', JSON.stringify(knowledgeBody()), headers);
    expect(knowledge.status).toBe(200);
    expect(fs.statSync(calendarSnapshotPath()).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(dir).filter((name) => name.includes('.tmp'))).toEqual([]);
    for (const key of ['phone', 'token', 'password', 'email']) {
      const body = JSON.stringify(inboxBody()).replace('"fromName":"שם לדוגמה"', `"fromName":"שם לדוגמה","${key}":"x"`);
      expect((await post(postInbox, 'http://localhost/api/snapshot/inbox', body, headers)).status).toBe(400);
    }
    const attendees = JSON.stringify(calendarBody()).replace('"attendeesCount":2', '"attendeesCount":2,"attendees":["a@b.c"]');
    expect((await post(postCalendar, 'http://localhost/api/snapshot/calendar', attendees, headers)).status).toBe(400);
    const longSnippet = inboxBody();
    longSnippet.threads[0] = { ...longSnippet.threads[0], snippet: 'א'.repeat(161) };
    expect((await post(postInbox, 'http://localhost/api/snapshot/inbox', JSON.stringify(longSnippet), headers)).status).toBe(400);
    const longSummary = knowledgeBody();
    longSummary.pages[0] = { ...longSummary.pages[0], summary: 'א'.repeat(401) };
    expect((await post(postKnowledge, 'http://localhost/api/snapshot/knowledge', JSON.stringify(longSummary), headers)).status).toBe(400);
    expect((await post(postCalendar, 'http://localhost/api/snapshot/calendar', ' '.repeat(SNAPSHOT_MAX_BYTES + 1), headers)).status).toBe(413);
  });

  test('a trial writes the calendar file under GLADOS_STORE', () => {
    process.env.GLADOS_TRIAL = '1';
    const store = fs.mkdtempSync(path.join(os.tmpdir(), 'office-store-'));
    process.env.GLADOS_STORE = store;
    process.env.GLADOS_DATA_DIR = dir;
    writeCalendarSnapshot(calendarBody());
    expect(fs.existsSync(path.join(store, 'calendar-snapshot.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'calendar-snapshot.json'))).toBe(false);
    fs.rmSync(store, { recursive: true, force: true });
  });
});

describe('office snapshot readers', () => {
  test('each file is read only when its flag or MONDAY_SNAPSHOT is on', () => {
    writeCalendarSnapshot(calendarBody());
    expect(readCalendarSnapshot()).toBeNull();
    process.env.CALENDAR_SNAPSHOT = '1';
    expect(readCalendarSnapshot()?.events).toHaveLength(3);
    delete process.env.CALENDAR_SNAPSHOT;
    process.env.MONDAY_SNAPSHOT = '1';
    expect(readCalendarSnapshot()?.calendar).toBe('Holdings');
    expect(readInboxSnapshot()).toBeNull();
    expect(readKnowledgeSnapshot()).toBeNull();
  });

  test('today and this week use Asia/Jerusalem and skip later events', () => {
    const now = new Date('2026-11-12T10:00:00.000Z');
    const split = calendarWindow(calendarBody().events, now);
    expect(split.today.map((event) => event.id)).toEqual(['today']);
    expect(split.week.map((event) => event.id)).toEqual(['week']);
    const html = renderToStaticMarkup(createElement(CalendarWindow, { generatedAt: when, events: calendarBody().events, now }));
    expect(html).toContain(calendarBadgeText(when));
    expect(html).toContain('היום');
    expect(html).toContain('השבוע');
    expect(html).toContain('משרד');
    expect(html).toContain('2 משתתפים');
    expect(html).not.toContain('אחר כך');
  });

  test('the inbox is read-only and knowledge groups by section', () => {
    const inbox = renderToStaticMarkup(createElement(InboxSnapshotView, { snap: inboxBody() }));
    expect(inbox).toContain(inboxBadgeText(when));
    expect(inbox).toContain(INBOX_REPLY_HINT);
    expect(inbox).toContain('disabled');
    expect(inbox).not.toContain('mailto:');
    expect(inbox).toContain('שם לדוגמה');
    const knowledge = renderToStaticMarkup(createElement(KnowledgeSnapshotView, { generatedAt: when, pages: knowledgeBody().pages }));
    expect(knowledge).toContain(knowledgeBadgeText(when));
    expect(knowledge).toContain('תפעול');
    expect(knowledge).toContain('שיווק');
    expect(knowledge).toContain('נהלים');
  });

  test('the schema doc names the three files and refuses addresses', () => {
    const doc = fs.readFileSync(path.join(process.cwd(), 'docs/read-snapshots.md'), 'utf8');
    for (const field of ['generatedAt', 'calendar', 'Holdings', 'events', 'attendeesCount', 'mailbox', 'business', 'fromName', 'snippet', 'source', 'Notion', 'section', 'summary', 'url']) {
      expect(doc).toContain(field);
    }
    expect(doc).toContain('calendar-snapshot.json');
    expect(doc).toContain('inbox-snapshot.json');
    expect(doc).toContain('knowledge-snapshot.json');
    expect(doc).toContain(INBOX_REPLY_HINT);
    expect(inboxSnapshotPath()).toContain('inbox-snapshot.json');
    expect(knowledgeSnapshotPath()).toContain('knowledge-snapshot.json');
  });
});
