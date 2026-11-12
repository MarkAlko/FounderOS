/**
 * Monday lead boards → the same FunnelJourney shape Attio uses.
 * Lost rows are counted and left out. Unknown statuses are skipped.
 */
import type { FunnelJourney, FunnelStage } from '@/lib/schemas';
import { funnelProviderName } from '@/lib/stores';
import { loadMonday, type MondayQuote, type MondayTask } from '@/lib/connectors/monday';
import { liveReadConnectorsEnabled } from '@/lib/live-reads';
import { runtimeEnv } from '@/lib/creds';

const STAGE: [RegExp, FunnelStage][] = [
  [/won|נסגר בהצלחה|הומר|שולם/i, 'converted'],
  [/proposal|quote|הצעה|הצעת/i, 'opted_in'],
  [/nurture|טיפוח/i, 'nurtured'],
  [/contact|engaged|בטיפול|שיחה/i, 'engaged'],
  [/new|lead|חדש|ליד/i, 'first_touch'],
];

export function mondayStage(status: string | null): FunnelStage | 'lost' | null {
  const text = status ?? '';
  if (/lost|הפסד|לא רלוונטי/i.test(text)) return 'lost';
  for (const [re, stage] of STAGE) if (re.test(text)) return stage;
  return null;
}

export function leadToJourney(task: MondayTask, now: Date): FunnelJourney | null {
  const stage = mondayStage(task.status);
  if (stage === 'lost' || stage == null) return null;
  const day = now.toISOString().slice(0, 10);
  const amount = task.quoteAmount ? Number(task.quoteAmount.replace(/[^\d.-]/g, '')) : null;
  return {
    id: `monday-${task.id}`,
    name: task.name,
    venture: 'default',
    status: stage,
    product: task.subject,
    amountUsd: amount != null && Number.isFinite(amount) ? amount : null,
    relationship: 'warm',
    likelihood: stage === 'converted' ? 90 : stage === 'opted_in' ? 60 : 30,
    url: task.sumitUrl,
    email: null,
    phone: null,
    person: task.client,
    company: task.company,
    role: null,
    linkedin: null,
    createdAt: now.toISOString(),
    touches: [{
      id: `monday-${task.id}-t`,
      contactId: `monday-${task.id}`,
      seq: 1,
      stage,
      channel: 'crm',
      label: task.status || stage,
      source: 'monday',
      at: day,
    }],
  };
}

export async function mondayFunnelJourneys(now: Date, env: Record<string, string | undefined> = runtimeEnv()): Promise<{ journeys: FunnelJourney[]; quotes: MondayQuote[]; lost: number } | null> {
  if (funnelProviderName() !== 'monday' || !liveReadConnectorsEnabled(env)) return null;
  const data = await loadMonday(env);
  if (!data || data.missing.length) return null;
  let lost = 0;
  const journeys: FunnelJourney[] = [];
  for (const lead of data.leads) {
    const stage = mondayStage(lead.status);
    if (stage === 'lost') lost += 1;
    const journey = leadToJourney(lead, now);
    if (journey) journeys.push(journey);
  }
  return { journeys, quotes: data.quotes, lost };
}
