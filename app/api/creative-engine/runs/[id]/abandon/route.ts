import { NextResponse } from 'next/server';
import { abandonRun } from '@/lib/creative-engine/runs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, segment: { params: { id: string } }): Promise<Response>;
export async function POST(_req: Request, segment: { params: Promise<{ id: string }> }): Promise<Response>;
export async function POST(_req: Request, segment: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await segment.params;
  const run = abandonRun(params.id);
  if (!run) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, run });
}
