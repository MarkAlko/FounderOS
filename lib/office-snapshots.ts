/**
 * Read-only calendar, inbox, and knowledge snapshots.
 * A relay POSTs one JSON file each. The screens read them. Nothing is sent back.
 * The files sit next to monday-snapshot.json and must not be committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { snapshotHasSensitiveKey } from '@/lib/bots-snapshot';
import { mondaySnapshotDir, SNAPSHOT_MAX_BYTES, snapshotIngestAuth } from '@/lib/monday-snapshot';

const text = z.string().max(500);
const id = z.string().min(1).max(80);
const stamp = z.string().min(1).max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'date');

export const CalendarSnapshotSchema = z
  .object({
    generatedAt: stamp,
    calendar: z.literal('Holdings'),
    events: z
      .array(
        z
          .object({
            id,
            title: text,
            start: stamp,
            end: stamp,
            allDay: z.boolean(),
            location: text,
            attendeesCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();

export const InboxSnapshotSchema = z
  .object({
    generatedAt: stamp,
    mailbox: z.literal('business'),
    threads: z
      .array(
        z
          .object({
            id,
            subject: text,
            fromName: text,
            receivedAt: stamp,
            unread: z.boolean(),
            labels: z.array(z.string().max(40)).max(12),
            snippet: z.string().max(160),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();

export const KnowledgeSnapshotSchema = z
  .object({
    generatedAt: stamp,
    source: z.literal('Notion'),
    pages: z
      .array(
        z
          .object({
            id,
            title: text,
            url: z.string().max(500),
            section: text,
            updatedAt: stamp,
            summary: z.string().max(400),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();

export type CalendarSnapshot = z.infer<typeof CalendarSnapshotSchema>;
export type InboxSnapshot = z.infer<typeof InboxSnapshotSchema>;
export type KnowledgeSnapshot = z.infer<typeof KnowledgeSnapshotSchema>;

type Cache<T> = { key: string; data: T | null } | null;

function store<T>(filename: string, flag: string, schema: z.ZodType<T>) {
  let cached: Cache<T> = null;
  const file = () => path.join(mondaySnapshotDir(), filename);
  const enabled = (env: Record<string, string | undefined> = process.env) => env[flag] === '1' || env.MONDAY_SNAPSHOT === '1';
  return {
    path: file,
    enabled,
    write(data: T) {
      const dir = mondaySnapshotDir();
      fs.mkdirSync(dir, { recursive: true });
      const dest = file();
      const tmp = path.join(dir, `.${filename}.${process.pid}.${Date.now()}.tmp`);
      fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
      fs.chmodSync(tmp, 0o600);
      try {
        fs.renameSync(tmp, dest);
      } catch (err) {
        fs.rmSync(tmp, { force: true });
        throw err;
      }
      try {
        const stat = fs.statSync(dest);
        cached = { key: `${dest}:${stat.mtimeMs}:${stat.size}`, data };
      } catch {
        cached = null;
      }
    },
    read(): T | null {
      if (!enabled()) return null;
      const dest = file();
      try {
        const stat = fs.statSync(dest);
        const key = `${dest}:${stat.mtimeMs}:${stat.size}`;
        if (cached?.key === key) return cached.data;
        const json = JSON.parse(fs.readFileSync(dest, 'utf8')) as unknown;
        if (snapshotHasSensitiveKey(json)) {
          cached = { key, data: null };
          return null;
        }
        const parsed = schema.safeParse(json);
        const data = parsed.success ? parsed.data : null;
        cached = { key, data };
        return data;
      } catch {
        return null;
      }
    },
  };
}

const calendarStore = store('calendar-snapshot.json', 'CALENDAR_SNAPSHOT', CalendarSnapshotSchema);
const inboxStore = store('inbox-snapshot.json', 'INBOX_SNAPSHOT', InboxSnapshotSchema);
const knowledgeStore = store('knowledge-snapshot.json', 'KNOWLEDGE_SNAPSHOT', KnowledgeSnapshotSchema);

export const calendarSnapshotPath = calendarStore.path;
export const calendarSnapshotEnabled = calendarStore.enabled;
export const writeCalendarSnapshot = calendarStore.write;
export const readCalendarSnapshot = calendarStore.read;

export const inboxSnapshotPath = inboxStore.path;
export const inboxSnapshotEnabled = inboxStore.enabled;
export const writeInboxSnapshot = inboxStore.write;
export const readInboxSnapshot = inboxStore.read;

export const knowledgeSnapshotPath = knowledgeStore.path;
export const knowledgeSnapshotEnabled = knowledgeStore.enabled;
export const writeKnowledgeSnapshot = knowledgeStore.write;
export const readKnowledgeSnapshot = knowledgeStore.read;

export async function postSnapshot<T>(
  req: Request,
  schema: z.ZodType<T>,
  write: (data: T) => void,
  summary: (data: T) => Record<string, number>,
): Promise<Response> {
  const { NextResponse } = await import('next/server');
  const auth = snapshotIngestAuth(req.headers.get('authorization'));
  if (auth === 'absent') return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (auth === 'reject') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > SNAPSHOT_MAX_BYTES) {
    return NextResponse.json({ error: 'too large' }, { status: 413 });
  }
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > SNAPSHOT_MAX_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(buf.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (snapshotHasSensitiveKey(json)) return NextResponse.json({ error: 'refused' }, { status: 400 });
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  write(parsed.data);
  return NextResponse.json({ ok: true, ...summary(parsed.data) });
}
