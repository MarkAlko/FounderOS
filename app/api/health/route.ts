import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Load-balancer probe. Open on purpose: it reports only that the process
 * answered. No auth state, no paths, no versions, no secrets.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
