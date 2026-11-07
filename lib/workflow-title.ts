/**
 * Editing a workflow step title.
 *
 * Unbound agent nodes start with owner and subtitle mirroring the type title
 * (`engine.ts` addNode). Those mirrors should follow a rename. An independent
 * label such as "Vera · Triage" must survive a title edit: the canvas used to
 * copy the new title into owner and sub whenever `ownerAgentId` was empty,
 * which is how a save replaced the display owner with the step title.
 */
export type TitleEditableNode = {
  title: string;
  owner: string;
  sub: string;
  ownerKind: 'human' | 'agent';
  ownerAgentId: string | null;
};

export function applyNodeTitle(node: TitleEditableNode, nextTitle: string): void {
  const previous = node.title;
  node.title = nextTitle;
  if (node.ownerKind !== 'agent' || node.ownerAgentId) return;
  if (node.owner === previous) node.owner = nextTitle;
  if (node.sub === previous) node.sub = nextTitle;
}
