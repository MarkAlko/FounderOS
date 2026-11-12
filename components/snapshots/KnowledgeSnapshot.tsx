'use client';

import { useMemo, useState } from 'react';
import { knowledgeBadgeText, jerusalemDay } from '@/lib/snapshot-copy';

type KnowledgePage = { id: string; title: string; url: string; section: string; updatedAt: string; summary: string };

/** Notion pages from the snapshot, grouped by section, with a local search. */
export function KnowledgeSnapshotView({ generatedAt, pages: source }: { generatedAt: string; pages: KnowledgePage[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const pages = useMemo(() => {
    return source.filter((page) => {
      if (!needle) return true;
      return [page.title, page.section, page.summary].some((part) => part.toLowerCase().includes(needle));
    });
  }, [source, needle]);
  const sections = useMemo(() => {
    const groups = new Map<string, typeof pages>();
    for (const page of [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
      const key = page.section || 'ללא מדור';
      const list = groups.get(key) ?? [];
      list.push(page);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [pages]);

  return (
    <section data-knowledge-snapshot="">
      <p className="mb-3 inline-flex rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
        {knowledgeBadgeText(generatedAt)}
      </p>
      <label className="mb-4 block text-[12px]" style={{ color: 'var(--text-2)' }}>
        חיפוש
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש"
          aria-label="חיפוש"
          className="mt-1 block w-full max-w-md rounded border bg-transparent px-2 py-1 text-[13px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </label>
      <p className="mb-3 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
        {pages.length.toLocaleString('he-IL')} דפים
      </p>
      {sections.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          אין דפים בתצוגה הזו
        </p>
      ) : (
        sections.map(([section, rows]) => (
          <section key={section} className="mb-5">
            <h2 className="mb-2 text-[13px] font-medium" style={{ color: 'var(--text)' }}>
              {section}
              {' · '}
              {rows.length.toLocaleString('he-IL')}
            </h2>
            <ul className="space-y-2">
              {rows.map((page) => (
                <li key={page.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-baseline justify-between gap-3">
                    {page.url.startsWith('http') ? (
                      <a href={page.url} className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                        {page.title}
                      </a>
                    ) : (
                      <h3 className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                        {page.title}
                      </h3>
                    )}
                    <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {jerusalemDay(new Date(page.updatedAt))}
                    </span>
                  </div>
                  {page.summary && (
                    <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
                      {page.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
