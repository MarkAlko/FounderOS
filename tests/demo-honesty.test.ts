import { describe, expect, test } from 'vitest';
import { demoConnectors } from '@/lib/demo-mode';

describe('demo connector honesty', () => {
  test('filming connectors are not configured and do not claim a live account', () => {
    const rows = demoConnectors();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.state, row.id).toBe('not_configured');
      expect(row.detail.toLowerCase()).toContain('not configured');
      expect(row.detail).not.toMatch(/live ·|unread|available/i);
      expect(row.meta).toBeUndefined();
    }
    expect(rows.map((row) => row.id)).toContain('payments');
    expect(rows.map((row) => row.id)).toContain('email');
  });
});
