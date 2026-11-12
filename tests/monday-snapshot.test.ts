import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '@/app/api/snapshot/monday/route';
import { snapshotToJourneys } from '@/lib/funnel-monday';
import { helpModes } from '@/lib/live-reads';
import {
  MondaySnapshotSchema,
  SNAPSHOT_MAX_BYTES,
  bearerMatches,
  mondaySnapshotPath,
  readMondaySnapshot,
  snapshotBadgeText,
  snapshotReads,
  snapshotWhen,
  writeMondaySnapshot,
  type MondaySnapshot,
} from '@/lib/monday-snapshot';
import { funnelProviderName } from '@/lib/stores';

const KEYS = [
  'SNAPSHOT_INGEST_TOKEN',
  'MONDAY_SNAPSHOT',
  'FUNNEL_PROVIDER',
  'GLADOS_DATA_DIR',
  'GLADOS_STORE',
  'GLADOS_TRIAL',
  'GLADOS_LIVE_READS',
  'DEMO_MODE',
] as const;

const saved: Record<string, string | undefined> = {};
let dir = '';

const when = '2026-11-12T16:00:00.000Z';

function payload(extra: Partial<MondaySnapshot> = {}): MondaySnapshot {
  return {
    generatedAt: when,
    tasks: [
      {
        id: 't1',
        name: 'דוגמה',
        board: 'משימות',
        group: 'היום',
        status: 'בעבודה',
        owner: 'מפעיל',
        dueDate: '2026-11-13',
        priority: 'גבוה',
        updatedAt: when,
      },
    ],
    leads: [
      {
        id: 'l1',
        name: 'ליד לדוגמה',
        board: 'לידים',
        group: 'חדש',
        status: 'סטטוס אחר',
        source: 'אתר',
        city: 'חיפה',
        workType: 'שיפוץ',
        company: 'חברה לדוגמה',
        createdAt: when,
        updatedAt: when,
      },
    ],
    quotes: [
      {
        id: 'q1',
        client: 'לקוח לדוגמה',
        board: 'הצעות',
        status: 'נשלח',
        amount: 1200,
        company: 'חברה לדוגמה',
        sentAt: when,
        updatedAt: when,
      },
    ],
    financeSummary: {
      boards: [{ name: 'גבייה', byStatus: [{ status: 'פתוח', count: 2, total: 500 }] }],
    },
    ...extra,
  };
}

function post(body: string, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/snapshot/monday', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    }),
  );
}

beforeEach(() => {
  for (const key of KEYS) saved[key] = process.env[key];
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'monday-snap-'));
  process.env.GLADOS_DATA_DIR = dir;
  delete process.env.GLADOS_TRIAL;
  delete process.env.GLADOS_STORE;
  delete process.env.MONDAY_SNAPSHOT;
  delete process.env.FUNNEL_PROVIDER;
  delete process.env.SNAPSHOT_INGEST_TOKEN;
  delete process.env.DEMO_MODE;
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Monday snapshot ingest', () => {
  test('a missing token env is 404 and a wrong bearer is 401', async () => {
    expect((await post('{}', { authorization: 'Bearer anything' })).status).toBe(404);
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    expect((await post(JSON.stringify(payload()))).status).toBe(401);
    expect((await post(JSON.stringify(payload()), { authorization: 'Bearer nope' })).status).toBe(401);
    expect((await post(JSON.stringify(payload()), { authorization: 'Bearer ingest-secret-long' })).status).toBe(401);
    expect(fs.existsSync(mondaySnapshotPath())).toBe(false);
  });

  test('bearer compare accepts equal strings and rejects different lengths', () => {
    expect(bearerMatches('ingest-secret', 'ingest-secret')).toBe(true);
    expect(bearerMatches('short', 'ingest-secret')).toBe(false);
    expect(bearerMatches('ingest-secret', 'other-secret')).toBe(false);
  });

  test('a valid body is written atomically and a replay replaces it', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const first = await post(JSON.stringify(payload()), { authorization: 'Bearer ingest-secret' });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, tasks: 1, leads: 1, quotes: 1, boards: 1 });
    const second = await post(
      JSON.stringify(payload({ generatedAt: '2026-11-12T17:00:00.000Z' })),
      { authorization: 'Bearer ingest-secret' },
    );
    expect(second.status).toBe(200);
    const raw = JSON.parse(fs.readFileSync(mondaySnapshotPath(), 'utf8')) as MondaySnapshot;
    expect(raw.generatedAt).toBe('2026-11-12T17:00:00.000Z');
    expect(fs.readdirSync(dir).filter((name) => name.includes('.tmp'))).toEqual([]);
    expect(fs.statSync(mondaySnapshotPath()).mode & 0o777).toBe(0o600);
    expect(mondaySnapshotPath().startsWith(dir)).toBe(true);
  });

  test('the bank board, phone, email, and item rows are refused', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const headers = { authorization: 'Bearer ingest-secret' };
    const bank = JSON.stringify(payload()).replace('משימות', '7890955175');
    expect((await post(bank, headers)).status).toBe(400);
    const phone = JSON.stringify(payload());
    const withPhone = phone.replace('"city":"חיפה"', '"city":"חיפה","phone":"0500000000"');
    expect((await post(withPhone, headers)).status).toBe(400);
    const withEmail = phone.replace('"company":"חברה לדוגמה"', '"company":"חברה לדוגמה","email":"a@example.com"');
    expect((await post(withEmail, headers)).status).toBe(400);
    const items = payload();
    const body = JSON.stringify(items).replace(
      '"byStatus":[{"status":"פתוח","count":2,"total":500}]',
      '"byStatus":[{"status":"פתוח","count":2,"total":500}],"items":[{"name":"שורה"}]',
    );
    expect((await post(body, headers)).status).toBe(400);
    expect(MondaySnapshotSchema.safeParse({ ...payload(), rows: [] }).success).toBe(false);
    expect(fs.existsSync(mondaySnapshotPath())).toBe(false);
  });

  test('an oversized body is 413', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const res = await post(`${' '.repeat(SNAPSHOT_MAX_BYTES + 1)}`, { authorization: 'Bearer ingest-secret' });
    expect(res.status).toBe(413);
    expect(fs.existsSync(mondaySnapshotPath())).toBe(false);
  });

  test('a trial writes under GLADOS_STORE and ignores GLADOS_DATA_DIR', () => {
    process.env.GLADOS_TRIAL = '1';
    const store = fs.mkdtempSync(path.join(os.tmpdir(), 'monday-store-'));
    process.env.GLADOS_STORE = store;
    process.env.GLADOS_DATA_DIR = dir;
    writeMondaySnapshot(payload());
    expect(fs.existsSync(path.join(store, 'monday-snapshot.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'monday-snapshot.json'))).toBe(false);
    fs.rmSync(store, { recursive: true, force: true });
  });
});

describe('Monday snapshot reader', () => {
  test('the file is used only when snapshot mode is on', () => {
    writeMondaySnapshot(payload());
    expect(readMondaySnapshot()).toBeNull();
    process.env.MONDAY_SNAPSHOT = '1';
    const snap = readMondaySnapshot();
    expect(snap?.tasks).toHaveLength(1);
    const reads = snapshotReads(snap!);
    expect(reads.tasks?.groups[0]?.tasks[0]?.owner).toBe('מפעיל');
    expect(reads.quotes[0]?.name).toContain('חברה לדוגמה');
    expect(reads.finance?.boards[0]?.byStatus[0]).toEqual({ status: 'פתוח', count: 2, total: 500 });
    expect(JSON.stringify(reads)).not.toMatch(/phone|email/i);
  });

  test('filming still selects snapshot when the flag is on', () => {
    process.env.DEMO_MODE = '1';
    delete process.env.GLADOS_DATA_DIR;
    expect(funnelProviderName()).toBe('seed');
    process.env.MONDAY_SNAPSHOT = '1';
    expect(funnelProviderName()).toBe('snapshot');
    delete process.env.MONDAY_SNAPSHOT;
    process.env.FUNNEL_PROVIDER = 'snapshot';
    expect(funnelProviderName()).toBe('snapshot');
  });

  test('leads keep company and city and never a phone', () => {
    const journeys = snapshotToJourneys(payload(), new Date(when));
    expect(journeys).toHaveLength(1);
    expect(journeys[0]?.company).toBe('חברה לדוגמה');
    expect(journeys[0]?.role).toBe('חיפה');
    expect(journeys[0]?.email).toBeNull();
    expect(journeys[0]?.phone).toBeNull();
    expect(journeys[0]?.status).toBe('first_touch');
    const lost = payload();
    lost.leads[0] = { ...lost.leads[0], status: 'הפסד' };
    expect(snapshotToJourneys(lost, new Date(when))).toEqual([]);
  });

  test('help marks Monday live only when the file is present', () => {
    expect(helpModes({ MONDAY_SNAPSHOT: '1', GLADOS_TRIAL: '1' })['monday-tasks']).toBe('demo');
    writeMondaySnapshot(payload());
    process.env.MONDAY_SNAPSHOT = '1';
    const modes = helpModes({ MONDAY_SNAPSHOT: '1', GLADOS_TRIAL: '1' });
    expect(modes['monday-finance']).toBe('live');
    expect(modes.mail).toBe('demo');
  });

  test('the badge is the Hebrew snapshot line in Asia/Jerusalem', () => {
    const jerusalem = new Date(when).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(snapshotWhen(when)).toBe(jerusalem);
    expect(snapshotBadgeText(when)).toBe(`תמונת מצב מ־Monday · עודכן ${jerusalem}`);
    expect(snapshotBadgeText(when).match(/[A-Za-z][A-Za-z0-9]{3,}/g)).toEqual(['Monday']);
  });

  test('the schema doc names every field and omits phone', () => {
    const doc = fs.readFileSync(path.join(process.cwd(), 'docs/monday-snapshot.md'), 'utf8');
    for (const field of ['id', 'name', 'board', 'group', 'status', 'owner', 'dueDate', 'priority', 'updatedAt', 'source', 'city', 'workType', 'company', 'createdAt', 'client', 'amount', 'sentAt', 'financeSummary', 'byStatus', 'count', 'total', 'generatedAt']) {
      expect(doc).toContain(field);
    }
    expect(doc).toContain('7890955175');
    expect(doc).toContain('SNAPSHOT_INGEST_TOKEN');
    expect(doc).not.toMatch(/"phone"/);
    expect(doc).not.toMatch(/"email"/);
  });
});
