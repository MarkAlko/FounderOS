import type { MondayFinanceSummary, MondayQuote, MondayTaskBoard } from '@/lib/connectors/monday';
import type { OrgRecord } from '@/lib/connectors/notion-org';
import type { SnapshotQuote } from '@/lib/monday-snapshot';
import { snapshotBadgeText } from '@/lib/monday-snapshot';
import { SetupLink } from '@/components/SetupLink';

export function MondaySnapshotBadge({ generatedAt }: { generatedAt: string }) {
  return (
    <p
      className="mb-4 inline-flex rounded-full border px-3 py-1 text-[12px]"
      style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
      data-monday-snapshot=""
    >
      {snapshotBadgeText(generatedAt)}
    </p>
  );
}

export function MondayTasksPanel({ board, limit = 8 }: { board: MondayTaskBoard; limit?: number }) {
  return (
    <section className="mb-4 rounded-lg border border-os-border bg-os-surface p-4" aria-label="משימות מאנדיי">
      <h2 className="text-[14px] font-medium">{board.name}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {board.groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-[12px] text-os-muted">{group.title} · {group.tasks.length.toLocaleString('he-IL')}</h3>
            <ul className="mt-2 space-y-1">
              {group.tasks.slice(0, limit).map((task) => (
                <li key={task.id} className="truncate text-[12.5px]">
                  {task.name}
                  {task.owner ? <span className="text-os-dim"> · {task.owner}</span> : null}
                  {task.status ? <span className="text-os-dim"> · {task.status}</span> : null}
                  {task.due ? <span className="text-os-dim"> · {task.due}</span> : null}
                </li>
              ))}
              {group.tasks.length > limit ? (
                <li className="text-[12px] text-os-dim">עוד {(group.tasks.length - limit).toLocaleString('he-IL')}</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MondayQuotes({ quotes, limit = 12 }: { quotes: MondayQuote[]; limit?: number }) {
  if (!quotes.length) return null;
  return (
    <section className="mb-4 rounded-lg border border-os-border bg-os-surface p-4" aria-label="הצעות פתוחות">
      <h2 className="text-[14px] font-medium">הצעות פתוחות · {quotes.length.toLocaleString('he-IL')}</h2>
      <ul className="mt-2 space-y-1 text-[12.5px]">
        {quotes.slice(0, limit).map((q) => (
          <li key={q.id}>{q.quoteNumber ?? q.name}{q.amount ? ` · ${q.amount}` : ''}{q.status ? ` · ${q.status}` : ''}</li>
        ))}
        {quotes.length > limit ? (
          <li className="text-os-dim">עוד {(quotes.length - limit).toLocaleString('he-IL')}</li>
        ) : null}
      </ul>
    </section>
  );
}

export function SnapshotQuotes({ quotes }: { quotes: SnapshotQuote[] }) {
  return (
    <section className="mb-4 rounded-lg border border-os-border bg-os-surface p-4" aria-label="הצעות">
      <h2 className="text-[14px] font-medium">הצעות · {quotes.length.toLocaleString('he-IL')}</h2>
      {quotes.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-os-muted">אין הצעות בתמונה</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {quotes.slice(0, 200).map((quote) => (
            <li key={quote.id}>
              {quote.client}
              {quote.company ? ` · ${quote.company}` : ''}
              {` · ${quote.amount.toLocaleString('he-IL')}`}
              {quote.status ? ` · ${quote.status}` : ''}
            </li>
          ))}
          {quotes.length > 200 ? (
            <li className="text-os-dim">עוד {(quotes.length - 200).toLocaleString('he-IL')}</li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

export function MondayFinancePanel({ summary }: { summary: MondayFinanceSummary }) {
  return (
    <section className="mb-4 rounded-lg border border-os-border bg-os-surface p-4" aria-label="סיכום כספים">
      <h2 className="text-[14px] font-medium">סיכום לפי סטטוס</h2>
      {summary.boards.map((board) => (
        <div key={board.id} className="mt-3">
          <h3 className="text-[12px] text-os-muted">{board.name}</h3>
          <ul className="mt-1 space-y-1 text-[12.5px]">
            {board.byStatus.map((row) => (
              <li key={row.status}>
                {row.status} · {row.count.toLocaleString('he-IL')}
                {row.total != null ? ` · ${row.total.toLocaleString('he-IL')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function LiveMissing({ what }: { what: string }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[12.5px] text-os-muted">
      {what}
      <SetupLink href="/integrations" hint="הגדרת קריאה חיה" />
    </p>
  );
}

export function NotionOrgPanel({ rows }: { rows: OrgRecord[] }) {
  if (!rows.length) return null;
  return (
    <section className="mb-6 rounded-lg border border-os-border bg-os-surface px-4 py-3" aria-label="אנשים וחברות">
      <h2 className="text-[13px] font-medium">אנשים וחברות</h2>
      <ul className="mt-2 flex flex-wrap gap-2 text-[12px]">
        {rows.slice(0, 24).map((row) => (
          <li key={row.id} className="rounded border border-os-border px-2 py-1">{row.name}</li>
        ))}
      </ul>
    </section>
  );
}
