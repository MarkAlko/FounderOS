import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data';
import { createRuntime } from '@/lib/agents/runtime';
import { realAgents } from '@/lib/agents/real';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, segment: { params: { id: string } }): Promise<Response>;
export async function POST(_req: Request, segment: { params: Promise<{ id: string }> }): Promise<Response>;
export async function POST(_req: Request, segment: { params: { id: string } | Promise<{ id: string }> }) {
  const params = await segment.params;
  const runtime = createRuntime(getDb(), realAgents);
  try {
    const run = await runtime.run(params.id);
    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 404 },
    );
  }
}
