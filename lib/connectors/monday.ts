/**
 * Monday.com, read-only. GraphQL queries only. The bank board is refused
 * even if someone puts it on an allowlist. Item names never go to logs.
 */
import { TTL, keyTag, swr } from '@/lib/swr';
import { liveReadConnectorsEnabled } from '@/lib/live-reads';
import { runtimeEnv } from '@/lib/creds';

export const MONDAY_API = 'https://api.monday.com/v2';
export const MONDAY_BANK_BOARD_ID = '7890955175';
export const MONDAY_TASKS_BOARD_ID = '4739453413';
export const MONDAY_LEAD_FOLDER_ID = '15572955';
export const MONDAY_PAGE_SIZE = 50;
export const MONDAY_MAX_PAGES = 4;

const TASK_GROUPS = new Set(['היום', 'השבוע', 'ממתין לאחרים', 'טווח רחוק']);

export type MondayColumn = { id: string; title: string; type?: string };
export type MondayItem = {
  id: string;
  name: string;
  group?: { id?: string; title?: string } | null;
  column_values?: { id: string; text?: string | null; type?: string }[];
};
export type MondayBoardPayload = {
  id: string;
  name: string;
  groups?: { id: string; title: string }[];
  columns?: MondayColumn[];
  items_page?: { cursor?: string | null; items: MondayItem[] };
};

export type MondayTask = {
  id: string;
  name: string;
  group: string;
  owner: string | null;
  company: string | null;
  priority: string | null;
  due: string | null;
  status: string | null;
  subject: string | null;
  client: string | null;
  quoteNumber: string | null;
  quoteAmount: string | null;
  sumitUrl: string | null;
};

export type MondayTaskBoard = {
  id: string;
  name: string;
  groups: { title: string; tasks: MondayTask[] }[];
};

export type MondayQuote = {
  id: string;
  name: string;
  quoteNumber: string | null;
  amount: string | null;
  status: string | null;
  boardId: string;
};

export type MondayStatusTotal = { status: string; count: number; total: number | null };
export type MondayFinanceSummary = { boards: { id: string; name: string; byStatus: MondayStatusTotal[] }[] };

export function parseIdList(raw: string | undefined): string[] {
  return [...new Set((raw ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
}

export function boardAllowlist(env: Record<string, string | undefined>): Set<string> {
  return new Set(parseIdList(env.MONDAY_BOARD_IDS));
}

/** Throws when the id is the bank board or not on the allowlist. */
export function assertReadableBoard(id: string, allow: Set<string>): void {
  if (id === MONDAY_BANK_BOARD_ID) throw new Error('monday bank board is not readable');
  if (!allow.has(id)) throw new Error('monday board is not on the allowlist');
}

export function readableBoardIds(wanted: string[], allow: Set<string>): string[] {
  return wanted.filter((id) => {
    try {
      assertReadableBoard(id, allow);
      return true;
    } catch {
      return false;
    }
  });
}

const ALIASES: Record<keyof Omit<MondayTask, 'id' | 'name' | 'group'>, string[]> = {
  owner: ['owner', 'בעלים', 'אחראי'],
  company: ['company', 'חברה'],
  priority: ['priority', 'עדיפות'],
  due: ['due', 'due date', 'תאריך', 'יעד'],
  status: ['status', 'סטטוס'],
  subject: ['subject', 'נושא'],
  client: ['client', 'לקוח'],
  quoteNumber: ['quote', 'quote number', 'הצעה', 'מספר הצעה'],
  quoteAmount: ['amount', 'quote amount', 'סכום'],
  sumitUrl: ['sumit', 'sumit link'],
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function columnId(columns: MondayColumn[], key: keyof typeof ALIASES): string | null {
  const aliases = ALIASES[key].map(norm);
  const hit = columns.find((c) => aliases.some((a) => norm(c.title) === a || norm(c.title).includes(a)));
  return hit?.id ?? null;
}

function textOf(item: MondayItem, id: string | null): string | null {
  if (!id) return null;
  const raw = item.column_values?.find((c) => c.id === id)?.text?.trim();
  return raw ? raw : null;
}

export function toTask(item: MondayItem, columns: MondayColumn[]): MondayTask {
  const ids = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, columnId(columns, k as keyof typeof ALIASES)])) as Record<keyof typeof ALIASES, string | null>;
  return {
    id: item.id,
    name: item.name,
    group: item.group?.title ?? '',
    owner: textOf(item, ids.owner),
    company: textOf(item, ids.company),
    priority: textOf(item, ids.priority),
    due: textOf(item, ids.due),
    status: textOf(item, ids.status),
    subject: textOf(item, ids.subject),
    client: textOf(item, ids.client),
    quoteNumber: textOf(item, ids.quoteNumber),
    quoteAmount: textOf(item, ids.quoteAmount),
    sumitUrl: textOf(item, ids.sumitUrl),
  };
}

export function groupTasks(board: MondayBoardPayload, items: MondayItem[]): MondayTaskBoard {
  const columns = board.columns ?? [];
  const tasks = items.map((item) => toTask(item, columns)).filter((t) => t.group && !t.group.includes('נסגר') && TASK_GROUPS.has(t.group));
  const titles = ['היום', 'השבוע', 'ממתין לאחרים', 'טווח רחוק'];
  return {
    id: board.id,
    name: board.name,
    groups: titles.map((title) => ({ title, tasks: tasks.filter((t) => t.group === title) })),
  };
}

export function openQuotes(items: MondayItem[], columns: MondayColumn[], boardId: string): MondayQuote[] {
  return items
    .map((item) => toTask(item, columns))
    .filter((t) => (t.quoteNumber || t.quoteAmount) && !(t.status ?? '').includes('נסגר'))
    .map((t) => ({ id: t.id, name: t.name, quoteNumber: t.quoteNumber, amount: t.quoteAmount, status: t.status, boardId }));
}

function amountNumber(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Counts and sums only. Names of rows are dropped. */
export function financeSummary(board: MondayBoardPayload, items: MondayItem[]): MondayFinanceSummary['boards'][number] {
  const columns = board.columns ?? [];
  const statusId = columnId(columns, 'status');
  const amountId = columnId(columns, 'quoteAmount');
  const by = new Map<string, { count: number; total: number; sawAmount: boolean }>();
  for (const item of items) {
    const status = textOf(item, statusId) ?? 'בלי סטטוס';
    const row = by.get(status) ?? { count: 0, total: 0, sawAmount: false };
    row.count += 1;
    const n = amountNumber(textOf(item, amountId));
    if (n != null) {
      row.total += n;
      row.sawAmount = true;
    }
    by.set(status, row);
  }
  return {
    id: board.id,
    name: board.name,
    byStatus: [...by.entries()].map(([status, row]) => ({ status, count: row.count, total: row.sawAmount ? row.total : null })),
  };
}

export function assertReadOnlyQuery(query: string): void {
  if (/\bmutation\b/i.test(query)) throw new Error('monday connector is read-only');
}

type MondayPost = (token: string, query: string, variables: Record<string, unknown>) => Promise<unknown>;

export async function mondayQuery(token: string, query: string, variables: Record<string, unknown>, post: MondayPost = defaultPost): Promise<unknown> {
  assertReadOnlyQuery(query);
  const data = await post(token, query, variables);
  return data;
}

async function defaultPost(token: string, query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json', 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`monday ${res.status}`);
  const body = (await res.json()) as { data?: unknown; errors?: unknown[] };
  if (body.errors?.length) throw new Error('monday query failed');
  return body.data;
}

const ITEMS = `query ($ids:[ID!]!, $limit:Int!, $cursor:String) {
  boards(ids:$ids) {
    id name
    groups { id title }
    columns { id title type }
    items_page(limit:$limit, cursor:$cursor) { cursor items { id name group { id title } column_values { id text type } } }
  }
}`;

export async function readBoards(token: string, ids: string[], post?: MondayPost): Promise<{ board: MondayBoardPayload; items: MondayItem[] }[]> {
  const out: { board: MondayBoardPayload; items: MondayItem[] }[] = [];
  for (const id of ids) {
    let cursor: string | null = null;
    let board: MondayBoardPayload | null = null;
    const items: MondayItem[] = [];
    for (let page = 0; page < MONDAY_MAX_PAGES; page++) {
      const data = (await mondayQuery(token, ITEMS, { ids: [id], limit: MONDAY_PAGE_SIZE, cursor }, post)) as { boards?: MondayBoardPayload[] };
      const next = data.boards?.[0];
      if (!next) break;
      board = next;
      items.push(...(next.items_page?.items ?? []));
      cursor = next.items_page?.cursor ?? null;
      if (!cursor) break;
    }
    if (board) out.push({ board, items });
  }
  return out;
}

export type MondayReads = {
  tasks: MondayTaskBoard | null;
  leads: MondayTask[];
  quotes: MondayQuote[];
  finance: MondayFinanceSummary | null;
  missing: string[];
};

export async function loadMonday(env: Record<string, string | undefined> = runtimeEnv(), post?: MondayPost): Promise<MondayReads | null> {
  if (!liveReadConnectorsEnabled(env)) return null;
  const token = env.MONDAY_API_TOKEN?.trim();
  const allow = boardAllowlist(env);
  if (!token || allow.size === 0) return { tasks: null, leads: [], quotes: [], finance: null, missing: ['MONDAY_API_TOKEN', 'MONDAY_BOARD_IDS'] };
  const leadIds = parseIdList(env.MONDAY_LEAD_BOARD_IDS);
  const financeIds = parseIdList(env.MONDAY_FINANCE_BOARD_IDS);
  const wanted = readableBoardIds([MONDAY_TASKS_BOARD_ID, ...leadIds, ...financeIds], allow);
  const key = `monday:${keyTag(token)}:${wanted.join(',')}`;
  const boards = await swr(key, TTL.crm, () => readBoards(token, wanted, post));
  const task = boards.find((b) => b.board.id === MONDAY_TASKS_BOARD_ID);
  const leadBoards = boards.filter((b) => leadIds.includes(b.board.id));
  const quotes = leadBoards.flatMap((b) => openQuotes(b.items, b.board.columns ?? [], b.board.id));
  const leads = leadBoards.flatMap((b) => b.items.map((item) => toTask(item, b.board.columns ?? [])));
  const financeBoards = boards.filter((b) => financeIds.includes(b.board.id)).map((b) => financeSummary(b.board, b.items));
  return {
    tasks: task ? groupTasks(task.board, task.items) : null,
    leads,
    quotes,
    finance: financeBoards.length ? { boards: financeBoards } : null,
    missing: [],
  };
}
