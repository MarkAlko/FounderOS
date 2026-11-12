import { InboxWorkspace } from '@/components/inbox/InboxWorkspace';
import { InboxG } from '@/components/inbox/InboxG';
import { getAppearance } from '@/lib/appearance-server';
import { treeFor } from '@/lib/appearance';
import { gatherCommsFeed } from '@/lib/comms-feed';
import { annotatePriorities } from '@/lib/comms';
import { buildThreads, type InboxSource } from '@/lib/inbox';
import { emailStatus } from '@/lib/connectors/email';
import { slackStatus } from '@/lib/connectors/slack';
import { whatsappStatus, weeklyMessages } from '@/lib/connectors/whatsapp';
import { sendCreds } from '@/lib/connectors/whatsapp-send';
import { calendarStatus, upcomingEvents } from '@/lib/connectors/gcal';
import { getDb } from '@/lib/data';
import { cachedStatus } from '@/lib/connectors';
import { isFilming, demoEvents, demoThreadBodies } from '@/lib/demo-mode';
import { getLocale } from '@/lib/locale-server';
import { t } from '@/lib/messages';
import { buildCommsExtras } from '@/lib/comms-extras-server';
import { businessEnvelopes } from '@/lib/connectors/business-mail';
import { liveReadConnectorsEnabled } from '@/lib/live-reads';
import { readCalendarSnapshot, readInboxSnapshot } from '@/lib/office-snapshots';
import { CalendarWindow } from '@/components/snapshots/CalendarWindow';
import { InboxSnapshotView } from '@/components/snapshots/InboxSnapshot';

export const dynamic = 'force-dynamic';

/**
 * /inbox — the comms redo (2026-09-16), shipped beside /comms while it is
 * judged. Every channel in one list with the source in words, a triage state
 * derived from the message, and a reader that shows the whole exchange.
 */
async function InboxPage(query?: { searchParams?: { sample?: string } }): Promise<React.ReactNode>;
async function InboxPage(query: { searchParams?: Promise<{ sample?: string }> }): Promise<React.ReactNode>;
async function InboxPage(query?: { searchParams?: { sample?: string } | Promise<{ sample?: string }> }): Promise<React.ReactNode> {
  const searchParams = await query?.searchParams;
  const inboxSnap = readInboxSnapshot();
  const calendarSnap = readCalendarSnapshot();
  if (inboxSnap) {
    return (
      <>
        {calendarSnap && <CalendarWindow generatedAt={calendarSnap.generatedAt} events={calendarSnap.events} />}
        <InboxSnapshotView snap={inboxSnap} />
      </>
    );
  }
  const now = new Date();
  const [rawFeed, email, slack, whatsapp, calendar, liveEvents, weekly] = await Promise.all([
    gatherCommsFeed(140),
    // Source chips: cached real checks, shared with the connector board's window (lib/swr.ts).
    cachedStatus('email', () => emailStatus()),
    cachedStatus('slack', () => slackStatus()),
    cachedStatus('whatsapp', whatsappStatus),
    cachedStatus('calendar', () => calendarStatus()),
    upcomingEvents(undefined, { days: 7, limit: 200, now }),
    weeklyMessages(now),
  ]);
  // Filming mode: a scripted week and thread histories (lib/demo-mode.ts). Otherwise
  // thread histories arrive once the connectors expose them; until then the
  // reader shows the latest message the feed knows about.
  const events = isFilming() && !liveReadConnectorsEnabled() ? demoEvents() : liveEvents;
  const widgetEvents = calendarSnap
    ? calendarSnap.events.map((event) => ({ id: event.id, title: event.title, start: event.start, end: event.end, allDay: event.allDay }))
    : events;
  const mail = await businessEnvelopes().catch(() => []);
  const bodies = isFilming() ? demoThreadBodies() : {};
  const feed = annotatePriorities([...mail, ...rawFeed], getDb().contactTags.all());
  const threads = buildThreads(feed, events, now);
  const connected: Record<InboxSource, boolean> = {
    email: email.state === 'connected',
    slack: slack.state === 'connected',
    whatsapp: whatsapp.state === 'connected',
    calendar: calendar.state === 'connected',
  };
  // FounderOS additions (F3 digest, F4 recordings, F5 client board and week): one fetch, both trees.
  // `props?` because the smoke test renders every page with no arguments.
  const extras = await buildCommsExtras({
    url: `/inbox${searchParams?.sample === '1' ? '?sample=1' : ''}`,
    events: widgetEvents.map((event) => ({ id: event.id, title: event.title, start: event.start, end: event.end, allDay: event.allDay })),
    slackConnected: connected.slack,
    calendarConnected: connected.calendar || Boolean(calendarSnap),
    forceCalendar: Boolean(calendarSnap),
    now,
  });
  // GladOS tree (glados-ui SPEC S04 §4.9, X5): same data and state hook, kit presentation.
  const Tree = treeFor(await getAppearance(), '/inbox') === 'glados' ? InboxG : InboxWorkspace;
  return (
    <>
    {calendarSnap && <CalendarWindow generatedAt={calendarSnap.generatedAt} events={calendarSnap.events} />}
    <Tree
      threads={threads}
      bodies={bodies}
      connected={connected}
      nowISO={now.toISOString()}
      weekly={weekly}
      whatsappSendReady={!!sendCreds()}
      extras={extras}
      sampleNotice={isFilming() ? t(await getLocale(), 'demo.inbox') : undefined}
    />
    </>
  );
}
export default InboxPage;
