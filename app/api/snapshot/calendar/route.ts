import { CalendarSnapshotSchema, postSnapshot, writeCalendarSnapshot } from '@/lib/office-snapshots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/snapshot/calendar. Bearer SNAPSHOT_INGEST_TOKEN. No attendee addresses. */
export function POST(req: Request) {
  return postSnapshot(req, CalendarSnapshotSchema, writeCalendarSnapshot, (data) => ({ events: data.events.length }));
}
