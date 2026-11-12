import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Breakouts (01 section 9). */
async function LabBreakoutsPage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabBreakoutsPage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabBreakoutsPage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('breakouts', searchParams);
}
export default LabBreakoutsPage;
