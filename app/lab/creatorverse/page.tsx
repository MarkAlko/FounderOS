import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Creatorverse: every creator the Lab follows as one 3D network, sized by audience. */
async function LabCreatorversePage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabCreatorversePage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabCreatorversePage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('creatorverse', searchParams);
}
export default LabCreatorversePage;
