import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Playbook (01 section 10). */
async function LabPlaybookPage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabPlaybookPage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabPlaybookPage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('playbook', searchParams);
}
export default LabPlaybookPage;
