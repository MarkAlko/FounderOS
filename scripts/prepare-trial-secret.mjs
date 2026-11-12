#!/usr/bin/env node
/**
 * Write the trial password outside the repository.
 * Prints only the destination path. Never prints the password or the hash.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const dest = process.env.GLADOS_TRIAL_SECRET_FILE || path.join(homedir(), 'founderos-trial.env');

const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16);
const key = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
const passwordHash = ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join(':');
const sessionSecret = randomBytes(32).toString('hex');

const body = [
  '# FounderOS trial handoff. Do not commit, log, or paste into chat.',
  'GLADOS_TRIAL=1',
  `GLADOS_PASSWORD_HASH=${passwordHash}`,
  `GLADOS_SESSION_SECRET=${sessionSecret}`,
  `TRIAL_PASSWORD=${password}`,
  '',
].join('\n');

mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, body, { mode: 0o600 });
chmodSync(dest, 0o600);
process.stdout.write(`wrote ${dest}\n`);
