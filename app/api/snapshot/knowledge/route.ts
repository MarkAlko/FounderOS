import { KnowledgeSnapshotSchema, postSnapshot, writeKnowledgeSnapshot } from '@/lib/office-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/snapshot/knowledge. Bearer SNAPSHOT_INGEST_TOKEN. Page summaries only. */
export function POST(req: Request) {
  return postSnapshot(req, KnowledgeSnapshotSchema, writeKnowledgeSnapshot, (data) => ({ pages: data.pages.length }));
}
