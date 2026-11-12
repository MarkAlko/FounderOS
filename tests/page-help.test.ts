import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { PAGE_HELP, matchPageHelp } from '@/lib/page-help';
import { HE_MESSAGES } from '@/lib/messages';

const ALLOW = new Set([
  'AdPilot',
  'FounderOS',
  'MRK',
  'Stripe',
  'WhatsApp',
  'Slack',
  'SQLite',
  'API',
  'URL',
  'English',
  'Monday',
  'Notion',
  'IMAP',
  'Google',
  'Holdings',
  'Grok',
]);

function latinWords(value: string): string[] {
  return value.match(/[A-Za-z][A-Za-z0-9]*/g) ?? [];
}

function discoverRoutes(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...discoverRoutes(abs, rel));
    else if (name === 'page.tsx') {
      const route = '/' + rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '');
      out.push(route === '/' ? '/' : route.replace(/\/$/, ''));
    }
  }
  return out;
}

describe('page help', () => {
  test('every page route has a Hebrew explanation', () => {
    const routes = discoverRoutes(path.join(process.cwd(), 'app')).sort();
    const missing = routes.filter((route) => !PAGE_HELP[route]);
    expect(missing).toEqual([]);
  });

  test('a dynamic path resolves to its pattern', () => {
    expect(matchPageHelp('/agents/setup/vera')?.title).toBe('הגדרת סוכן');
    expect(matchPageHelp('/social/instagram')?.title).toBe('ערוץ בודד');
    expect(matchPageHelp('/')?.title).toBe('בית');
  });

  test('help copy and Hebrew chrome strings keep Latin to names on the allowlist', () => {
    const blobs: string[] = [];
    for (const help of Object.values(PAGE_HELP)) {
      blobs.push(help.title, help.what, ...help.steps, ...help.connected.flatMap((l) => [l.source, l.role]));
    }
    for (const value of Object.values(HE_MESSAGES)) blobs.push(value);
    const stray = new Set<string>();
    for (const blob of blobs) {
      for (const word of latinWords(blob)) {
        if (word.length < 3) continue;
        if (ALLOW.has(word)) continue;
        stray.add(word);
      }
    }
    expect([...stray].sort()).toEqual([]);
  });
});
