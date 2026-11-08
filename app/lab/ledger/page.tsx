import { renderLab, type SearchParams } from '../_render';

export const dynamic = 'force-dynamic';

/** Content Lab v2, Ledger (01 section 12). */
async function LabLedgerPage(query?: { searchParams?: SearchParams }): Promise<React.ReactNode>;
async function LabLedgerPage(query: { searchParams?: Promise<SearchParams> }): Promise<React.ReactNode>;
async function LabLedgerPage(query?: { searchParams?: SearchParams | Promise<SearchParams> }): Promise<React.ReactNode> {
  const searchParams = (await query?.searchParams) ?? {};
  return renderLab('ledger', searchParams);
}
export default LabLedgerPage;
