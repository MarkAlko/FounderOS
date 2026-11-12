/**
 * Notion read for the org page. Only pages listed in NOTION_ORG_PAGE_IDS are
 * queried. Titles that look personal, health, or family are dropped.
 */
import { TTL, keyTag, swr } from '@/lib/swr';
import { liveReadConnectorsEnabled } from '@/lib/live-reads';
import { runtimeEnv } from '@/lib/creds';

const EXCLUDE = /personal|health|family|אישי|בריאות|משפחה/i;

export type OrgRecord = { id: string; name: string; kind: 'person' | 'company' };

export function notionOrgIds(env: Record<string, string | undefined>): string[] {
  return [...new Set((env.NOTION_ORG_PAGE_IDS ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
}

export function keepOrgTitle(title: string): boolean {
  return title.trim().length > 0 && !EXCLUDE.test(title);
}

type NotionTitle = { plain_text?: string };
type NotionPage = { id: string; properties?: Record<string, { type?: string; title?: NotionTitle[] }> };

function titleOf(page: NotionPage): string {
  for (const prop of Object.values(page.properties ?? {})) {
    if (prop.type === 'title' && prop.title?.length) return prop.title.map((t) => t.plain_text ?? '').join('');
  }
  return '';
}

export async function readNotionOrg(env: Record<string, string | undefined> = runtimeEnv()): Promise<OrgRecord[] | null> {
  if (!liveReadConnectorsEnabled(env)) return null;
  const key = env.NOTION_API_KEY?.trim();
  const ids = notionOrgIds(env);
  if (!key || ids.length === 0) return [];
  const cacheKey = `notion:org:${keyTag(key)}:${ids.join(',')}`;
  return swr(cacheKey, TTL.crm, () => pull(key, ids).catch(() => []));
}

async function pull(key: string, ids: string[]): Promise<OrgRecord[]> {
  const { Client } = await import('@notionhq/client');
  const notion = new Client({ auth: key });
  const out: OrgRecord[] = [];
  for (const id of ids.slice(0, 12)) {
    const res = await notion.dataSources.query({ data_source_id: id, page_size: 50 }).catch(async () => {
      const page = await notion.pages.retrieve({ page_id: id });
      return { results: [page] };
    });
    for (const row of res.results as NotionPage[]) {
      const name = titleOf(row);
      if (!keepOrgTitle(name)) continue;
      out.push({ id: row.id, name, kind: /חברה|company/i.test(name) ? 'company' : 'person' });
    }
  }
  return out;
}
