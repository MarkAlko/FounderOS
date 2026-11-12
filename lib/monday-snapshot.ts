/**
 * Read-only Monday snapshot. A relay POSTs one JSON file; the screens read it.
 * Nothing here calls Monday, and nothing is written back.
 * The file lives under GLADOS_DATA_DIR, or under GLADOS_STORE while a trial
 * is on, or under /var/data. It is machine state and must not be committed.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const MONDAY_BANK_BOARD_ID = '7890955175';
export const SNAPSHOT_MAX_BYTES = 5 * 1024 * 1024;

const text = z.string().max(500);
const id = z.string().min(1).max(80);
const stamp = z.string().min(1).max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'date');

export const SnapshotTaskSchema = z
  .object({
    id,
    name: text,
    board: text,
    group: text,
    status: text,
    owner: text,
    dueDate: text,
    priority: text,
    updatedAt: stamp,
  })
  .strict();

export const SnapshotLeadSchema = z
  .object({
    id,
    name: text,
    board: text,
    group: text,
    status: text,
    source: text,
    city: text,
    workType: text,
    company: text,
    createdAt: stamp,
    updatedAt: stamp,
  })
  .strict();

export const SnapshotQuoteSchema = z
  .object({
    id,
    client: text,
    board: text,
    status: text,
    amount: z.number().finite(),
    company: text,
    sentAt: stamp,
    updatedAt: stamp,
  })
  .strict();

const SnapshotStatusSchema = z
  .object({
    status: text,
    count: z.number().int().nonnegative(),
    total: z.number().finite(),
  })
  .strict();

const SnapshotFinanceBoardSchema = z
  .object({
    name: text,
    byStatus: z.array(SnapshotStatusSchema).max(100),
  })
  .strict();

export const MondaySnapshotSchema = z
  .object({
    generatedAt: stamp,
    tasks: z.array(SnapshotTaskSchema).max(20000),
    leads: z.array(SnapshotLeadSchema).max(20000),
    quotes: z.array(SnapshotQuoteSchema).max(20000),
    financeSummary: z
      .object({
        boards: z.array(SnapshotFinanceBoardSchema).max(50),
      })
      .strict(),
  })
  .strict();

export type SnapshotTask = z.infer<typeof SnapshotTaskSchema>;
export type SnapshotLead = z.infer<typeof SnapshotLeadSchema>;
export type SnapshotQuote = z.infer<typeof SnapshotQuoteSchema>;
export type MondaySnapshot = z.infer<typeof MondaySnapshotSchema>;

const FALLBACK_DIR = '/var/data';

/** Directory that holds monday-snapshot.json. Never the repo tree by default. */
export function mondaySnapshotDir(): string {
  if (process.env.GLADOS_TRIAL === '1') {
    const store = process.env.GLADOS_STORE?.trim();
    if (store) return path.isAbsolute(store) ? store : path.join(process.cwd(), store);
    return FALLBACK_DIR;
  }
  const dir = process.env.GLADOS_DATA_DIR?.trim();
  if (dir) return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return FALLBACK_DIR;
}

export function mondaySnapshotPath(): string {
  return path.join(mondaySnapshotDir(), 'monday-snapshot.json');
}

export function mondaySnapshotEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.MONDAY_SNAPSHOT === '1' || env.FUNNEL_PROVIDER === 'snapshot';
}

/** Hash both sides so a length mismatch does not return early. */
export function bearerMatches(presented: string, expected: string): boolean {
  const left = createHash('sha256').update(presented).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function snapshotIngestAuth(authorization: string | null): 'absent' | 'ok' | 'reject' {
  const expected = process.env.SNAPSHOT_INGEST_TOKEN?.trim() ?? '';
  if (!expected) return 'absent';
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? '');
  const presented = match?.[1] ?? '';
  return bearerMatches(presented, expected) ? 'ok' : 'reject';
}

export function snapshotBodyRefused(raw: string): boolean {
  return raw.includes(MONDAY_BANK_BOARD_ID);
}

let cached: { key: string; data: MondaySnapshot | null } | null = null;

function remember(file: string, data: MondaySnapshot | null): void {
  try {
    const stat = fs.statSync(file);
    cached = { key: `${file}:${stat.mtimeMs}:${stat.size}`, data };
  } catch {
    cached = null;
  }
}

export function writeMondaySnapshot(data: MondaySnapshot): void {
  const dir = mondaySnapshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = mondaySnapshotPath();
  const tmp = path.join(dir, `.monday-snapshot.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  try {
    fs.renameSync(tmp, dest);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  remember(dest, data);
}

export function snapshotFileReady(): boolean {
  try {
    return fs.statSync(mondaySnapshotPath()).isFile();
  } catch {
    return false;
  }
}

export function readMondaySnapshot(): MondaySnapshot | null {
  if (!mondaySnapshotEnabled()) return null;
  const file = mondaySnapshotPath();
  try {
    const stat = fs.statSync(file);
    const key = `${file}:${stat.mtimeMs}:${stat.size}`;
    if (cached?.key === key) return cached.data;
    const raw = fs.readFileSync(file, 'utf8');
    if (snapshotBodyRefused(raw)) {
      remember(file, null);
      return null;
    }
    const parsed = MondaySnapshotSchema.safeParse(JSON.parse(raw));
    const data = parsed.success ? parsed.data : null;
    remember(file, data);
    return data;
  } catch {
    return null;
  }
}

function toTask(row: SnapshotTask) {
  return {
    id: row.id,
    name: row.name,
    group: row.group,
    owner: row.owner || null,
    company: null,
    priority: row.priority || null,
    due: row.dueDate || null,
    status: row.status || null,
    subject: null,
    client: null,
    quoteNumber: null,
    quoteAmount: null,
    sumitUrl: null,
  };
}

export function snapshotTaskBoard(tasks: SnapshotTask[]) {
  const boards = [...new Set(tasks.map((task) => task.board).filter(Boolean))];
  const groups = new Map<string, ReturnType<typeof toTask>[]>();
  for (const task of tasks) {
    const title = boards.length > 1 && task.board ? `${task.board} · ${task.group || 'כללי'}` : task.group || 'כללי';
    const list = groups.get(title) ?? [];
    list.push(toTask(task));
    groups.set(title, list);
  }
  return {
    id: 'snapshot',
    name: boards.length === 1 ? boards[0] : 'משימות',
    groups: [...groups.entries()].map(([title, rows]) => ({ title, tasks: rows })),
  };
}

export function snapshotReads(snap: MondaySnapshot) {
  const quotes = snap.quotes.map((quote) => ({
    id: quote.id,
    name: quote.company ? `${quote.client} · ${quote.company}` : quote.client,
    quoteNumber: null,
    amount: Number.isFinite(quote.amount) ? quote.amount.toLocaleString('he-IL') : null,
    status: quote.status || null,
    boardId: quote.board,
  }));
  return {
    tasks: snapshotTaskBoard(snap.tasks),
    leads: snap.leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      group: lead.group,
      owner: null,
      company: lead.company || null,
      priority: null,
      due: null,
      status: lead.status || null,
      subject: lead.workType || null,
      client: null,
      quoteNumber: null,
      quoteAmount: null,
      sumitUrl: null,
    })),
    quotes,
    finance: {
      boards: snap.financeSummary.boards.map((board, index) => ({
        id: `snapshot-${index}`,
        name: board.name,
        byStatus: board.byStatus.map((row) => ({ status: row.status, count: row.count, total: row.total })),
      })),
    },
    missing: [],
  };
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

export function snapshotWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('he-IL', WHEN);
}

export function snapshotBadgeText(iso: string): string {
  const when = snapshotWhen(iso);
  return when ? `תמונת מצב מ־Monday · עודכן ${when}` : 'תמונת מצב מ־Monday';
}
