/**
 * One business mailbox, read-only. Envelope fetch does not set \Seen and
 * never sends. Host is configurable (Zoho for mrk-group.co.il is the expected
 * default the operator fills in).
 */
import { ImapFlow } from 'imapflow';
import type { CommsItem } from '@/lib/comms';
import { TTL, keyTag, swr } from '@/lib/swr';
import { liveReadConnectorsEnabled } from '@/lib/live-reads';
import { runtimeEnv } from '@/lib/creds';

export const MAIL_FETCH_QUERY = { envelope: true, flags: true } as const;

export type MailAccount = { host: string; port: number; user: string; pass: string };

export function businessMailAccount(env: Record<string, string | undefined>): MailAccount | null {
  const host = env.MAIL_IMAP_HOST?.trim();
  const user = env.MAIL_IMAP_USER?.trim();
  const pass = env.MAIL_IMAP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(env.MAIL_IMAP_PORT ?? 993);
  return { host, port: Number.isFinite(port) ? port : 993, user, pass };
}

export async function fetchBusinessEnvelopes(account: MailAccount, limit = 20): Promise<CommsItem[]> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
    logger: false,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  const items: CommsItem[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      const exists = typeof mailbox === 'object' && mailbox ? mailbox.exists : 0;
      if (!exists) return [];
      const start = Math.max(1, exists - limit + 1);
      for await (const msg of client.fetch(`${start}:*`, MAIL_FETCH_QUERY)) {
        const from = msg.envelope?.from?.[0];
        items.push({
          source: 'email',
          title: from?.name || from?.address || 'שולח',
          sender: from?.name || from?.address || 'שולח',
          replyTo: from?.address,
          account: 'business',
          preview: msg.envelope?.subject ?? '',
          ts: (msg.envelope?.date ?? new Date(0)).toISOString(),
          unread: msg.flags?.has('\\Seen') ? 0 : 1,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return items;
}

export async function businessEnvelopes(env: Record<string, string | undefined> = runtimeEnv()): Promise<CommsItem[]> {
  if (!liveReadConnectorsEnabled(env)) return [];
  const account = businessMailAccount(env);
  if (!account) return [];
  const key = `mail:business:${keyTag(`${account.host}:${account.user}`)}`;
  return swr(key, TTL.comms, () => fetchBusinessEnvelopes(account).catch(() => []));
}
