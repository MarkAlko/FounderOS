import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test('a production build does not create the trial store', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'glados-build-'));
  const blocker = path.join(root, 'not-a-dir');
  writeFileSync(blocker, 'x');
  const store = path.join(blocker, 'var', 'data');
  vi.stubEnv('NEXT_PHASE', 'phase-production-build');
  vi.stubEnv('npm_lifecycle_event', 'build');
  vi.stubEnv('GLADOS_TRIAL', '1');
  vi.stubEnv('GLADOS_STORE', store);
  vi.resetModules();
  try {
    const { ensureDemoStore } = await import('@/lib/demo/store');
    const { getDb } = await import('@/lib/data');
    ensureDemoStore();
    expect(getDb().departments.all().length).toBeGreaterThan(0);
    expect(existsSync(store)).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
