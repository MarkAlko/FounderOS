import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '@/app/api/snapshot/bots/route';
import { BotsBoard } from '@/components/bots/BotsBoard';
import { botsBadgeText, botsWhen } from '@/lib/bots-labels';
import {
  BotsSnapshotSchema,
  botsSnapshotEnabled,
  botsSnapshotPath,
  presentBots,
  readBotsSnapshot,
  snapshotHasSensitiveKey,
  writeBotsSnapshot,
  type BotsSnapshot,
} from '@/lib/bots-snapshot';
import { SNAPSHOT_MAX_BYTES } from '@/lib/monday-snapshot';

const KEYS = ['SNAPSHOT_INGEST_TOKEN', 'BOTS_SNAPSHOT', 'MONDAY_SNAPSHOT', 'GLADOS_DATA_DIR', 'GLADOS_STORE', 'GLADOS_TRIAL'] as const;
const saved: Record<string, string | undefined> = {};
let dir = '';
const when = '2026-11-12T16:00:00.000Z';

function payload(extra: Partial<BotsSnapshot> = {}): BotsSnapshot {
  return {
    generatedAt: when,
    bots: [
      {
        id: 'mail-1',
        name: 'דוגמה',
        role: 'דואר',
        category: 'mail',
        lastActiveAt: when,
        status: 'active',
        routines: [{ name: 'סיכום', schedule: 'כל בוקר' }],
        recentWork: ['טיוטה'],
        openItems: ['פריט'],
      },
      {
        id: 'personal-1',
        name: 'אישי לדוגמה',
        role: 'פרטי',
        category: 'personal',
        lastActiveAt: when,
        status: 'idle',
        routines: [{ name: 'שגרה סודית', schedule: 'לילה' }],
        recentWork: ['הערה פרטית'],
        openItems: ['משימה פרטית'],
      },
    ],
    errors: [{ bot: 'דוגמה', reason: 'אין קובץ' }],
    ...extra,
  };
}

function post(body: string, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/snapshot/bots', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    }),
  );
}

beforeEach(() => {
  for (const key of KEYS) saved[key] = process.env[key];
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bots-snap-'));
  process.env.GLADOS_DATA_DIR = dir;
  delete process.env.GLADOS_TRIAL;
  delete process.env.GLADOS_STORE;
  delete process.env.BOTS_SNAPSHOT;
  delete process.env.MONDAY_SNAPSHOT;
  delete process.env.SNAPSHOT_INGEST_TOKEN;
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('bots snapshot ingest', () => {
  test('a missing token env is 404 and a wrong bearer is 401', async () => {
    expect((await post('{}', { authorization: 'Bearer anything' })).status).toBe(404);
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    expect((await post(JSON.stringify(payload()))).status).toBe(401);
    expect((await post(JSON.stringify(payload()), { authorization: 'Bearer nope' })).status).toBe(401);
    expect(fs.existsSync(botsSnapshotPath())).toBe(false);
  });

  test('a valid body is written atomically and omitted lists default to empty', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const body = payload();
    delete (body.bots[0] as { routines?: unknown }).routines;
    const first = await post(JSON.stringify(body), { authorization: 'Bearer ingest-secret' });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, bots: 2, errors: 1 });
    const stored = JSON.parse(fs.readFileSync(botsSnapshotPath(), 'utf8')) as BotsSnapshot;
    expect(stored.bots[0]?.routines).toEqual([]);
    const second = await post(JSON.stringify(payload({ generatedAt: '2026-11-12T17:00:00.000Z' })), { authorization: 'Bearer ingest-secret' });
    expect(second.status).toBe(200);
    expect((JSON.parse(fs.readFileSync(botsSnapshotPath(), 'utf8')) as BotsSnapshot).generatedAt).toBe('2026-11-12T17:00:00.000Z');
    expect(fs.readdirSync(dir).filter((name) => name.includes('.tmp'))).toEqual([]);
    expect(fs.statSync(botsSnapshotPath()).mode & 0o777).toBe(0o600);
  });

  test('phone, email, token, and password fields are refused, including nested keys', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const headers = { authorization: 'Bearer ingest-secret' };
    for (const key of ['phone', 'email', 'token', 'password', 'Email', 'apiToken']) {
      const body = JSON.stringify(payload()).replace('"role":"דואר"', `"role":"דואר","${key}":"x"`);
      expect((await post(body, headers)).status).toBe(400);
    }
    const nested = JSON.stringify(payload()).replace('"schedule":"כל בוקר"', '"schedule":"כל בוקר","password":"x"');
    expect((await post(nested, headers)).status).toBe(400);
    expect(snapshotHasSensitiveKey({ bots: [{ recentWork: ['password policy'] }] })).toBe(false);
    const allowed = payload();
    allowed.bots[0] = { ...allowed.bots[0], recentWork: ['password policy'] };
    expect((await post(JSON.stringify(allowed), headers)).status).toBe(200);
    expect(BotsSnapshotSchema.safeParse({ ...payload(), note: 'x' }).success).toBe(false);
  });

  test('an oversized body is 413', async () => {
    process.env.SNAPSHOT_INGEST_TOKEN = 'ingest-secret';
    const res = await post(' '.repeat(SNAPSHOT_MAX_BYTES + 1), { authorization: 'Bearer ingest-secret' });
    expect(res.status).toBe(413);
    expect(fs.existsSync(botsSnapshotPath())).toBe(false);
  });

  test('a trial writes under GLADOS_STORE and ignores GLADOS_DATA_DIR', () => {
    process.env.GLADOS_TRIAL = '1';
    const store = fs.mkdtempSync(path.join(os.tmpdir(), 'bots-store-'));
    process.env.GLADOS_STORE = store;
    process.env.GLADOS_DATA_DIR = dir;
    writeBotsSnapshot(payload());
    expect(fs.existsSync(path.join(store, 'bots-snapshot.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'bots-snapshot.json'))).toBe(false);
    fs.rmSync(store, { recursive: true, force: true });
  });
});

describe('bots snapshot reader', () => {
  test('the file is used when either snapshot flag is on', () => {
    writeBotsSnapshot(payload());
    expect(readBotsSnapshot()).toBeNull();
    expect(botsSnapshotEnabled({ BOTS_SNAPSHOT: '1' })).toBe(true);
    expect(botsSnapshotEnabled({ MONDAY_SNAPSHOT: '1' })).toBe(true);
    process.env.MONDAY_SNAPSHOT = '1';
    expect(readBotsSnapshot()?.bots).toHaveLength(2);
  });

  test('personal bots keep only name, role, and status', () => {
    const rows = presentBots(payload());
    const personal = rows.find((bot) => bot.personal);
    const mail = rows.find((bot) => bot.category === 'mail');
    expect(personal?.routines).toEqual([]);
    expect(personal?.recentWork).toEqual([]);
    expect(personal?.openItems).toEqual([]);
    expect(personal?.lastActiveAt).toBeNull();
    expect(personal?.name).toBe('אישי לדוגמה');
    expect(personal?.role).toBe('פרטי');
    expect(personal?.status).toBe('idle');
    expect(mail?.routines).toEqual([{ name: 'סיכום', schedule: 'כל בוקר' }]);
    expect(mail?.recentWork).toEqual(['טיוטה']);
  });

  test('the board badge is Hebrew and hides personal notes', () => {
    const jerusalem = new Date(when).toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(botsWhen(when)).toBe(jerusalem);
    expect(botsBadgeText(when)).toBe(`תמונת מצב של הבוטים · עודכן ${jerusalem}`);
    const html = renderToStaticMarkup(createElement(BotsBoard, { generatedAt: when, bots: presentBots(payload()), errors: [] }));
    expect(html).toContain(`תמונת מצב של הבוטים · עודכן ${jerusalem}`);
    expect(html).toContain('אישי לדוגמה');
    expect(html).toContain('דואר');
    expect(html).not.toContain('שגרה סודית');
    expect(html).not.toContain('הערה פרטית');
    expect(html).toContain('פרטים');
    expect(html).toContain('2 בוטים');
  });

  test('the schema doc names the fields and the sensitive keys', () => {
    const doc = fs.readFileSync(path.join(process.cwd(), 'docs/bots-snapshot.md'), 'utf8');
    for (const field of ['generatedAt', 'bots', 'id', 'name', 'role', 'category', 'lastActiveAt', 'status', 'routines', 'schedule', 'recentWork', 'openItems', 'errors', 'reason']) {
      expect(doc).toContain(field);
    }
    for (const category of ['mail', 'calendar', 'Monday', 'quotes', 'Notion/knowledge', 'WhatsApp', 'website', 'marketing', 'meetings', 'management', 'personal', 'other']) {
      expect(doc).toContain(category);
    }
    expect(doc).toContain('phone');
    expect(doc).toContain('password');
    expect(doc).toContain('SNAPSHOT_INGEST_TOKEN');
  });
});
