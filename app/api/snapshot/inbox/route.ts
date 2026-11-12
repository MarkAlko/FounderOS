import { InboxSnapshotSchema, postSnapshot, writeInboxSnapshot } from '@/lib/office-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/snapshot/inbox. Bearer SNAPSHOT_INGEST_TOKEN. Names only, no addresses. */
export function POST(req: Request) {
  return postSnapshot(req, InboxSnapshotSchema, writeInboxSnapshot, (data) => ({ threads: data.threads.length }));
}
