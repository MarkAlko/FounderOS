import { inboxBadgeText, INBOX_REPLY_HINT, jerusalemClock } from '@/lib/snapshot-copy';
import type { InboxSnapshot as InboxFile } from '@/lib/office-snapshots';

/** Read-only business mailbox. Reply stays in the mailbox itself. */
export function InboxSnapshotView({ snap }: { snap: InboxFile }) {
  const threads = [...snap.threads].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  return (
    <section data-inbox-snapshot="">
      <p className="mb-3 inline-flex rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
        {inboxBadgeText(snap.generatedAt)}
      </p>
      <p className="mb-3 text-[13px]" style={{ color: 'var(--text)' }}>
        {threads.length.toLocaleString('he-IL')} שרשורים · {threads.filter((thread) => thread.unread).length.toLocaleString('he-IL')} לא נקראו
      </p>
      <ul className="space-y-3">
        {threads.map((thread) => (
          <li key={thread.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: 'var(--text)' }}>
                {thread.subject}
              </h2>
              <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-3)' }}>
                {jerusalemClock(thread.receivedAt)}
              </span>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-2)' }}>
              {thread.fromName}
              {thread.unread ? ' · לא נקרא' : ''}
            </p>
            {thread.labels.length > 0 && (
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                {thread.labels.join(' · ')}
              </p>
            )}
            {thread.snippet && (
              <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text)' }}>
                {thread.snippet}
              </p>
            )}
            <button type="button" disabled title={INBOX_REPLY_HINT} className="mt-2 cursor-not-allowed rounded border px-2 py-1 text-[12px] opacity-60" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
              תשובה
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
