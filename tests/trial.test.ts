import { describe, expect, test } from 'vitest';
import { trialBlockReason } from '@/lib/trial';
import { decideGate } from '@/lib/auth-gate';

describe('trial isolation', () => {
  test('anonymous pages and APIs stay behind the password gate', () => {
    const base = { hostname: 'trial.example', origin: null, requestOrigin: 'https://trial.example', configured: true, authed: false };
    expect(decideGate({ ...base, pathname: '/', method: 'GET' }).kind).toBe('redirect-login');
    expect(decideGate({ ...base, pathname: '/api/workflows/wf-inbound', method: 'GET' }).kind).toBe('unauthorized-api');
    expect(decideGate({ ...base, pathname: '/api/connections', method: 'GET' }).kind).toBe('unauthorized-api');
  });

  test('a signed-in trial can read the app and save a demo workflow', () => {
    expect(trialBlockReason('/', 'GET')).toBeNull();
    expect(trialBlockReason('/finances', 'GET')).toBeNull();
    expect(trialBlockReason('/api/workflows/wf-inbound', 'PATCH')).toBeNull();
    expect(trialBlockReason('/api/auth/login', 'POST')).toBeNull();
    expect(trialBlockReason('/api/snapshot/monday', 'POST')).toBeNull();
  });

  test('a signed-in trial cannot send, run tools, write keys, or read operator files', () => {
    expect(trialBlockReason('/api/wizard/send', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/social/posts', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/connections/connect', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/keys', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/auth/password', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/settings/filming', 'POST')).toMatch(/workflow edits/);
    expect(trialBlockReason('/api/agents/ag-vera/run', 'GET')).toMatch(/tools/);
    expect(trialBlockReason('/api/lab/run', 'POST')).toMatch(/workflow edits|tools/);
    expect(trialBlockReason('/api/database/file', 'GET')).toMatch(/tools/);
    expect(trialBlockReason('/api/cron/tick', 'GET')).toMatch(/tools/);
  });
});
