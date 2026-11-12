import { describe, expect, test } from 'vitest';
import { applyNodeTitle } from '@/lib/workflow-title';

describe('applyNodeTitle', () => {
  test('an independent owner label survives a title edit when the agent is unbound', () => {
    const node = {
      title: 'Message lands',
      owner: 'Vera · Triage',
      sub: 'Vera · Triage',
      ownerKind: 'agent' as const,
      ownerAgentId: null,
    };
    applyNodeTitle(node, 'Message lands demo-check');
    expect(node.title).toBe('Message lands demo-check');
    expect(node.owner).toBe('Vera · Triage');
    expect(node.sub).toBe('Vera · Triage');
  });

  test('a placeholder that still mirrors the title follows the rename', () => {
    const node = {
      title: 'Schedule',
      owner: 'Schedule',
      sub: 'Schedule',
      ownerKind: 'agent' as const,
      ownerAgentId: null,
    };
    applyNodeTitle(node, 'Weekly digest');
    expect(node).toMatchObject({ title: 'Weekly digest', owner: 'Weekly digest', sub: 'Weekly digest' });
  });

  test('a bound agent keeps its roster label', () => {
    const node = {
      title: 'Message lands',
      owner: 'Vera',
      sub: 'Vera',
      ownerKind: 'agent' as const,
      ownerAgentId: 'ag-vera',
    };
    applyNodeTitle(node, 'Inbox received');
    expect(node.owner).toBe('Vera');
    expect(node.ownerAgentId).toBe('ag-vera');
  });
});
