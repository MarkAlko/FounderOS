import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth-gate';
import { sessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Same Secure/Path/SameSite as login, or the browser keeps the HTTPS cookie.
  // This does not rotate the secret, so a copy of the old cookie still works.
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
