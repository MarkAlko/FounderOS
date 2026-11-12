import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Studio (01 section 11). */
async function LabStudioPage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabStudioPage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabStudioPage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('studio', searchParams);
}
export default LabStudioPage;
