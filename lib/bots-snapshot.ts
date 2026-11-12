/**
 * Read-only bots snapshot. A relay POSTs one JSON file; the agent screens read it.
 * Nothing is sent to a bot. The file lives next to monday-snapshot.json and
 * must not be committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { BOT_CATEGORIES, type BotCategory, type BotStatus } from '@/lib/bots-labels';
import { mondaySnapshotDir } from '@/lib/monday-snapshot';

const text = z.string().max(500);
const id = z.string().min(1).max(80);
const stamp = z.string().min(1).max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'date');

const RoutineSchema = z
  .object({
    name: text,
    schedule: text,
  })
  .strict();

export const SnapshotBotSchema = z
  .object({
    id,
    name: text,
    role: text,
    category: z.enum(BOT_CATEGORIES),
    lastActiveAt: z.union([stamp, z.null()]),
    status: z.enum(['active', 'idle', 'unknown']),
    routines: z.array(RoutineSchema).max(40).optional().default([]),
    recentWork: z.array(text).max(40).optional().default([]),
    openItems: z.array(text).max(40).optional().default([]),
  })
  .strict();

const ErrorSchema = z
  .object({
    bot: text,
    reason: text,
  })
  .strict();

export const BotsSnapshotSchema = z
  .object({
    generatedAt: stamp,
    bots: z.array(SnapshotBotSchema).max(500),
    errors: z.array(ErrorSchema).max(100),
  })
  .strict();

export type SnapshotBot = z.infer<typeof SnapshotBotSchema>;
export type BotsSnapshot = z.infer<typeof BotsSnapshotSchema>;

export type PublicBot = {
  id: string;
  name: string;
  role: string;
  category: BotCategory;
  status: BotStatus;
  lastActiveAt: string | null;
  routines: { name: string; schedule: string }[];
  recentWork: string[];
  openItems: string[];
  personal: boolean;
};

const SENSITIVE_KEY = /phone|email|token|password/i;

export function botsSnapshotPath(): string {
  return path.join(mondaySnapshotDir(), 'bots-snapshot.json');
}

export function botsSnapshotEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BOTS_SNAPSHOT === '1' || env.MONDAY_SNAPSHOT === '1';
}

/** True when any object key names a phone, email, token, or password. */
export function snapshotHasSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(snapshotHasSensitiveKey);
  if (!value || typeof value !== 'object') return false;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) return true;
    if (snapshotHasSensitiveKey(child)) return true;
  }
  return false;
}

let cached: { key: string; data: BotsSnapshot | null } | null = null;

function remember(file: string, data: BotsSnapshot | null): void {
  try {
    const stat = fs.statSync(file);
    cached = { key: `${file}:${stat.mtimeMs}:${stat.size}`, data };
  } catch {
    cached = null;
  }
}

export function writeBotsSnapshot(data: BotsSnapshot): void {
  const dir = mondaySnapshotDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = botsSnapshotPath();
  const tmp = path.join(dir, `.bots-snapshot.${process.pid}.${Date.now()}.tmp`);
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

export function readBotsSnapshot(): BotsSnapshot | null {
  if (!botsSnapshotEnabled()) return null;
  const file = botsSnapshotPath();
  try {
    const stat = fs.statSync(file);
    const key = `${file}:${stat.mtimeMs}:${stat.size}`;
    if (cached?.key === key) return cached.data;
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw) as unknown;
    if (snapshotHasSensitiveKey(json)) {
      remember(file, null);
      return null;
    }
    const parsed = BotsSnapshotSchema.safeParse(json);
    const data = parsed.success ? parsed.data : null;
    remember(file, data);
    return data;
  } catch {
    return null;
  }
}

/** Personal bots keep name, role, and status. Their activity and notes stay off the screen. */
export function presentBots(snap: BotsSnapshot): PublicBot[] {
  return snap.bots.map((bot) => {
    const personal = bot.category === 'personal';
    return {
      id: bot.id,
      name: bot.name,
      role: bot.role,
      category: bot.category,
      status: bot.status,
      lastActiveAt: personal ? null : bot.lastActiveAt,
      routines: personal ? [] : bot.routines,
      recentWork: personal ? [] : bot.recentWork,
      openItems: personal ? [] : bot.openItems,
      personal,
    };
  });
}
