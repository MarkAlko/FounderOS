import { NextResponse } from 'next/server';
import { readSkillMarkdown } from '@/lib/skills-catalog';

export const dynamic = 'force-dynamic';

/** The full SKILL.md for one real skill, loaded on demand by the reader. */
export async function GET(_req: Request, segment: { params: { slug: string } }): Promise<Response>;
export async function GET(_req: Request, segment: { params: Promise<{ slug: string }> }): Promise<Response>;
export async function GET(_req: Request, segment: { params: { slug: string } | Promise<{ slug: string }> }) {
  const params = await segment.params;
  const markdown = readSkillMarkdown(params.slug);
  if (markdown === null) return NextResponse.json({ error: 'skill not found' }, { status: 404 });
  return NextResponse.json({ markdown });
}
