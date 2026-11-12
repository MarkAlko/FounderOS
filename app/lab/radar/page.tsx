import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Radar (01 section 8). */
async function LabRadarPage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabRadarPage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabRadarPage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('radar', searchParams);
}
export default LabRadarPage;
