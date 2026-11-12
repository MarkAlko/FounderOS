import { NextResponse } from 'next/server';
import {
  MondaySnapshotSchema,
  SNAPSHOT_MAX_BYTES,
  snapshotBodyRefused,
  snapshotIngestAuth,
  writeMondaySnapshot,
} from '@/lib/monday-snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/snapshot/monday
 * Authorization: Bearer <SNAPSHOT_INGEST_TOKEN>
 * Missing token env → 404. Missing or wrong bearer → 401.
 * The middleware lets this path through without a session cookie.
 * The body is validated, then replaced atomically. No Monday write-back.
 */
export async function POST(req: Request) {
  const auth = snapshotIngestAuth(req.headers.get('authorization'));
  if (auth === 'absent') return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (auth === 'reject') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > SNAPSHOT_MAX_BYTES) {
    return NextResponse.json({ error: 'too large' }, { status: 413 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > SNAPSHOT_MAX_BYTES) return NextResponse.json({ error: 'too large' }, { status: 413 });
  const raw = buf.toString('utf8');
  if (snapshotBodyRefused(raw)) return NextResponse.json({ error: 'refused' }, { status: 400 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const parsed = MondaySnapshotSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  writeMondaySnapshot(parsed.data);
  return NextResponse.json({
    ok: true,
    tasks: parsed.data.tasks.length,
    leads: parsed.data.leads.length,
    quotes: parsed.data.quotes.length,
    boards: parsed.data.financeSummary.boards.length,
  });
}
