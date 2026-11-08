/**
 * Trial isolation. GLADOS_TRIAL=1 is a demo the operator may put behind
 * HTTPS. It is not a production mode.
 *
 * The process must already have an operator password (scripts/serve.mjs
 * refuses to boot a trial without one). This module then keeps the trial
 * on the demo dataset and refuses the surfaces that manage secrets, run
 * host commands, send messages, or call outside tools.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Reads and the one local demo edit the trial is allowed to save. */
const WRITE_ALLOW = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/logout$/,
  /^\/api\/workflows\/[^/]+$/,
  /^\/api\/workflows\/[^/]+\/versions$/,
  /^\/api\/workflows\/[^/]+\/versions\/restore$/,
];

/** Even a GET here runs work, spawns a tool, or reads an operator file. */
const BLOCKED_READ = [
  /^\/api\/cron\//,
  /^\/api\/agents\/[^/]+\/run$/,
  /^\/api\/lab\//,
  /^\/api\/content\//,
  /^\/api\/creative-engine\//,
  /^\/api\/database\/file$/,
  /^\/api\/wizard\/send$/,
  /^\/api\/social\/(dm\/reply|posts|sync|upload)$/,
  /^\/api\/connections\/connect$/,
  /^\/api\/keys$/,
  /^\/api\/setup\/check$/,
  /^\/api\/trading\//,
  /^\/api\/usage\/push$/,
  /^\/api\/plaud\//,
  /^\/api\/webhooks\//,
  /^\/api\/compute\//,
];

export function isTrial(): boolean {
  return process.env.GLADOS_TRIAL === '1';
}

/**
 * Null when the request may proceed. A string is the reason to answer 403.
 * Auth still runs first: an anonymous caller is refused by the password gate
 * before this allow-list matters.
 */
export function trialBlockReason(pathname: string, method: string): string | null {
  const path = pathname.split('?')[0] || '/';
  const verb = method.toUpperCase();
  if (!SAFE_METHODS.has(verb)) {
    if (WRITE_ALLOW.some((re) => re.test(path)) && (verb === 'POST' || verb === 'PATCH' || verb === 'PUT')) return null;
    return 'trial mode only saves demo workflow edits';
  }
  if (BLOCKED_READ.some((re) => re.test(path))) return 'trial mode does not run tools, commands, or integrations';
  return null;
}
