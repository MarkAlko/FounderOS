'use client';

import { Children, useMemo, useState, type ReactNode } from 'react';
import {
  BOT_CATEGORIES,
  BOT_CATEGORY_LABEL,
  BOT_STATUS_LABEL,
  botsBadgeText,
  botsWhen,
  type BotCategory,
  type BotStatus,
} from '@/lib/bots-labels';
import type { PublicBot } from '@/lib/bots-snapshot';

type ErrorRow = { bot: string; reason: string };

const DOT: Record<BotStatus, string> = {
  active: 'var(--h6-live-green)',
  idle: 'var(--text-3)',
  unknown: 'var(--text-2)',
};

export function BotsBoard({
  generatedAt,
  bots,
  errors,
}: {
  generatedAt: string;
  bots: PublicBot[];
  errors: ErrorRow[];
}) {
  const [category, setCategory] = useState<'all' | BotCategory>('all');
  const [status, setStatus] = useState<'all' | BotStatus>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = useMemo(
    () => bots.filter((bot) => (category === 'all' || bot.category === category) && (status === 'all' || bot.status === status)),
    [bots, category, status],
  );
  const open = visible.find((bot) => bot.id === openId && !bot.personal) ?? null;
  const counts = {
    active: bots.filter((bot) => bot.status === 'active').length,
    idle: bots.filter((bot) => bot.status === 'idle').length,
    unknown: bots.filter((bot) => bot.status === 'unknown').length,
  };
  const groups = BOT_CATEGORIES.map((key) => ({ key, bots: visible.filter((bot) => bot.category === key) })).filter((group) => group.bots.length > 0);

  return (
    <div data-bots-board="">
      <p
        className="mb-4 inline-flex rounded-full border px-3 py-1 text-[12px]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
        data-bots-snapshot=""
      >
        {botsBadgeText(generatedAt)}
      </p>
      <p className="mb-3 text-[13px]" style={{ color: 'var(--text)' }} data-bots-summary="">
        {bots.length.toLocaleString('he-IL')} בוטים
        {' · '}
        {counts.active.toLocaleString('he-IL')} פעילים
        {' · '}
        {counts.idle.toLocaleString('he-IL')} ממתינים
        {' · '}
        {counts.unknown.toLocaleString('he-IL')} לא ידוע
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-[12px]" style={{ color: 'var(--text-2)' }}>
          קטגוריה
          <select
            className="mr-2 rounded border bg-transparent px-2 py-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            value={category}
            aria-label="קטגוריה"
            onChange={(event) => setCategory(event.target.value as 'all' | BotCategory)}
          >
            <option value="all">הכל</option>
            {BOT_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {BOT_CATEGORY_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px]" style={{ color: 'var(--text-2)' }}>
          מצב
          <select
            className="mr-2 rounded border bg-transparent px-2 py-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            value={status}
            aria-label="מצב"
            onChange={(event) => setStatus(event.target.value as 'all' | BotStatus)}
          >
            <option value="all">הכל</option>
            <option value="active">פעיל</option>
            <option value="idle">ממתין</option>
            <option value="unknown">לא ידוע</option>
          </select>
        </label>
      </div>
      {groups.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          אין בוטים בתצוגה הזו
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mb-5">
            <h2 className="mb-2 text-[13px] font-medium" style={{ color: 'var(--text)' }}>
              {BOT_CATEGORY_LABEL[group.key]}
              {' · '}
              {group.bots.length.toLocaleString('he-IL')}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.bots.map((bot) => (
                <article key={bot.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[bot.status] }} aria-label={BOT_STATUS_LABEL[bot.status]} />
                    <h3 className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                      {bot.name}
                    </h3>
                  </div>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--text-2)' }}>
                    {bot.role}
                  </p>
                  <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                    {BOT_STATUS_LABEL[bot.status]}
                  </p>
                  {!bot.personal && (
                    <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                      {bot.lastActiveAt ? `פעילות אחרונה ${botsWhen(bot.lastActiveAt)}` : 'אין פעילות אחרונה'}
                    </p>
                  )}
                  {!bot.personal && (
                    <button
                      type="button"
                      className="mt-2 rounded border px-2 py-1 text-[12px]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                      onClick={() => setOpenId(bot.id)}
                    >
                      פרטים
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
      {errors.length > 0 && (
        <section className="mt-4" aria-label="שגיאות">
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
            שגיאות
          </h2>
          <ul className="mt-2 space-y-1 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
            {errors.map((row) => (
              <li key={`${row.bot}:${row.reason}`}>
                {row.bot}
                {' · '}
                {row.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label="פרטי בוט">
          <button type="button" className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--bg) 55%, transparent)' }} aria-label="סגירה" onClick={() => setOpenId(null)} />
          <aside className="relative h-full w-full max-w-md overflow-y-auto border-s p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium">{open.name}</h2>
                <p className="text-[12.5px]" style={{ color: 'var(--text-2)' }}>
                  {open.role}
                </p>
              </div>
              <button type="button" className="rounded border px-2 py-1 text-[12px]" style={{ borderColor: 'var(--border)' }} onClick={() => setOpenId(null)}>
                סגירה
              </button>
            </div>
            <Detail title="שגרות" empty="אין שגרות">
              {open.routines.map((routine) => (
                <li key={`${routine.name}:${routine.schedule}`}>
                  {routine.name}
                  {' · '}
                  {routine.schedule}
                </li>
              ))}
            </Detail>
            <Detail title="עבודה אחרונה" empty="אין עבודה אחרונה">
              {open.recentWork.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </Detail>
            <Detail title="פריטים פתוחים" empty="אין פריטים פתוחים">
              {open.openItems.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </Detail>
          </aside>
        </div>
      )}
    </div>
  );
}

function Detail({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <section className="mb-4">
      <h3 className="text-[12.5px] font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-3)' }}>
          {empty}
        </p>
      ) : (
        <ul className="mt-1 space-y-1 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
          {items}
        </ul>
      )}
    </section>
  );
}
