import { NextResponse } from 'next/server';
import { BotsSnapshotSchema, snapshotHasSensitiveKey, writeBotsSnapshot } from '@/lib/bots-snapshot';
import { SNAPSHOT_MAX_BYTES, snapshotIngestAuth } from '@/lib/monday-snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/snapshot/bots
 * Authorization: Bearer <SNAPSHOT_INGEST_TOKEN>
 * Missing token env → 404. Missing or wrong bearer → 401.
 * The body is validated, then replaced atomically. No message is sent to a bot.
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

  let json: unknown;
  try {
    json = JSON.parse(buf.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (snapshotHasSensitiveKey(json)) return NextResponse.json({ error: 'refused' }, { status: 400 });
  const parsed = BotsSnapshotSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  writeBotsSnapshot(parsed.data);
  return NextResponse.json({ ok: true, bots: parsed.data.bots.length, errors: parsed.data.errors.length });
}
