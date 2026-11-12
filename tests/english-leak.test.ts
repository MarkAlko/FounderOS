import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ALLOW = new Set(["API","AdPilot","Attio","CLI","CSV","CalDAV","English","FounderOS","GitHub","Gmail","Google","Holdings","IMAP","JSON","MRK","Monday","Notion","Postgres","SQLite","SUMIT","Slack","Stripe","Superset","Trakyo","URL","WhatsApp","Adscout","Apify","Arcads","Beehiiv","Blueprint","Claude","Ctrl","Elements","Fathom","Flash","Foreplay","GoHighLevel","Higgsfield","Instagram","Legacy","LinkedIn","MIOSA","Meta","Northwind","Ollama","Omni","Phantom","Plaud","ROAS","Reddit","Soul","Telegram","TikTok","Twitter","UGC","Wise","YouTube","Zernio","Zoho","bdpilot"]);
const ATTR = /(?:aria-label|title|placeholder|alt)=(?:"([^"]*)"|'([^']*)')/g;
const TEXT = />([^<>{}\n]*)</g;
const WORD = /[A-Za-z][A-Za-z0-9]{3,}/g;

function leaks(src: string): boolean {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const chunks = [
    ...[...clean.matchAll(ATTR)].map((m) => m[1] ?? m[2] ?? ''),
    ...[...clean.matchAll(TEXT)].map((m) => m[1] ?? ''),
  ];
  return chunks.some((chunk) => [...chunk.matchAll(WORD)].some((m) => m[0].length >= 4 && !ALLOW.has(m[0])));
}

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else if (name.endsWith('.tsx')) out.push(rel);
  }
  return out;
}

/** Lib modules whose quoted strings are user-facing copy. */
const LIB_COPY = [
  'lib/lab/view/copy.ts',
  'lib/lab/view/classic-copy.ts',
  'lib/lab/view/creatorverse-copy.ts',
  'lib/lab/view/ui-copy.ts',
  'lib/lab/view/hero-graphs.ts',
  'lib/lab/view/creatorverse.ts',
  'lib/lab/measure/view.ts',
] as const;

const ID = /^[a-z0-9_./:-]+$/;
const CAMEL = /^[a-z]+[A-Z][A-Za-z0-9]*$/;

function skipLiteral(s: string): boolean {
  return ID.test(s) || CAMEL.test(s) || s.startsWith('@') || s.startsWith('.') || s.startsWith('/') || s.startsWith('?') || (s.includes('=') && !/\s/.test(s)) || (s.includes('/') && !/\s/.test(s));
}

/** Quoted copy in a lib module, ignoring ids, paths, and {slots}. */
function libLeaks(src: string): boolean {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  for (const m of clean.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*?)\1/g)) {
    if (skipLiteral(m[2] ?? '')) continue;
    const text = (m[2] ?? '').replace(/\{[^}]+\}/g, ' ');
    if ([...text.matchAll(WORD)].some((w) => w[0].length >= 4 && !ALLOW.has(w[0]) && !CAMEL.test(w[0]))) return true;
  }
  return false;
}

/** Files that still show English. Empty once the visible copy is Hebrew. */
const REMAINING = [] as const;

describe('English leak', () => {
  test('visible JSX and lib copy are Hebrew aside from brand and tech names', () => {
    const jsx = [...walk(path.join(process.cwd(), 'app'), 'app'), ...walk(path.join(process.cwd(), 'components'), 'components')]
      .filter((rel) => leaks(readFileSync(path.join(process.cwd(), rel), 'utf8')));
    const lib = LIB_COPY.filter((rel) => libLeaks(readFileSync(path.join(process.cwd(), rel), 'utf8')));
    expect([...jsx, ...lib].sort()).toEqual([...REMAINING]);
  });
});
