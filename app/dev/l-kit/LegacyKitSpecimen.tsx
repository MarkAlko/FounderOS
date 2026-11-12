'use client';

import { useState } from 'react';
import { RefreshCw, Search, TrendingUp } from 'lucide-react';
import {
  Badge,
  BigStat,
  Chip,
  ConductorEmblem,
  Dot,
  DotMatrix,
  InsightCard,
  Kbd,
  Label,
  LEmpty,
  LError,
  LSampleChip,
  LSkeleton,
  LUnconfigured,
  MeterStack,
  OsMark,
  Pressable,
  SlabCard,
  SlabTitle,
  StepLine,
  ToggleChip,
} from '@/components/legacy';
import { setupHrefFor } from '@/lib/integrations-catalog';

/** Specimen data only: every number on this page is a fixture, and the SAMPLE chip says so. */
const SERIES = {
  individual: [
    { label: 'Aug 13, 6:00', count: 4 },
    { label: 'Aug 13, 7:00', count: 9 },
    { label: 'Aug 13, 8:00', count: 21 },
    { label: 'Aug 13, 9:00', count: 17 },
    { label: 'Aug 13, 10:00', count: 30 },
  ],
  agentic: [
    { label: 'Aug 13, 6:00', count: 2 },
    { label: 'Aug 13, 7:00', count: 3 },
    { label: 'Aug 13, 8:00', count: 8 },
    { label: 'Aug 13, 9:00', count: 6 },
    { label: 'Aug 13, 10:00', count: 12 },
  ],
};

const STRIP = [
  { label: 'Deployed', value: '$624.70' },
  { label: 'Idle cash', value: '$420.00' },
  { label: 'Unrealized', value: '+$23.30', tone: 'ok' as const },
  { label: 'Agent trades', value: '3' },
];

export function LegacyKitSpecimen() {
  const [sleeve, setSleeve] = useState<'individual' | 'agentic'>('agentic');
  const [filter, setFilter] = useState('all');
  const [thinking, setThinking] = useState(false);
  return (
    <div data-l="KitSpecimen" className="flex flex-col gap-5">
      <SlabTitle
        eyebrow="Kit · Bennett Legacy · specimen"
        title="ערכת Legacy"
        meta="every primitive and state · specimen data · nothing here is live"
        right={
          <>
            <LSampleChip label="Sample · specimen data" />
            <Pressable tone="pill">מעקב בלבד · מתרענן כל 60 שניות</Pressable>
            <Pressable tone="ghost" aria-label="רענון" title="רענון">
              <RefreshCw size={14} strokeWidth={1.7} aria-hidden />
            </Pressable>
          </>
        }
      />

      <div className="grid gap-5 min-[1100px]:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <SlabCard title="סוכן · השרוול" sub="3 trades · last 60d ago" i={1}>
          <div className="l-card-body">
            <div className="l-kit-row mb-3">
              <ToggleChip on={sleeve === 'individual'} onClick={() => setSleeve('individual')}>
                Individual
              </ToggleChip>
              <ToggleChip on={sleeve === 'agentic'} onClick={() => setSleeve('agentic')}>
                Agentic
              </ToggleChip>
            </div>
          </div>
          <StepLine series={SERIES[sleeve]} unit=" trades" height={170} />
          <div className="l-card-body pt-0">
            <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-[var(--l-border)] min-[700px]:grid-cols-4">
              {STRIP.map((s, idx) => (
                <div key={s.label} className={`px-4 py-3 ${idx > 0 ? 'min-[700px]:border-l border-[var(--l-border)]' : ''}`}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--l-text-2)]">{s.label}</div>
                  <div className="mt-1.5 text-[17px] font-semibold tabular-nums" style={{ color: s.tone === 'ok' ? 'var(--l-ok)' : 'var(--l-text)' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlabCard>

        <SlabCard title="חשבונות" sub="2 accounts · updated 60 days ago" i={2}>
          <div className="l-card-body flex flex-col">
            <BigStat value={11290} kind="usdCents" chips={[{ tone: 'ok', text: '+$142.00 today' }]} caption="brokerage, 2 accounts" />
            <MeterStack
              meters={[
                { label: 'Individual · read-only to agents', frac: 0.91, display: '$10,250.00' },
                { label: 'Agentic · agent may trade', frac: 0.09, display: '$1,040.00', hue: 'var(--l-warn)' },
                { label: 'Phantom · wallet not reachable', frac: null, display: '' },
              ]}
              foot="only the agentic sleeve can be traded by an agent"
            />
          </div>
        </SlabCard>
      </div>

      <div className="grid gap-5 min-[1100px]:grid-cols-3">
        <SlabCard title="סוכן · חשיבה" sub="no run recorded" i={3}>
          <LEmpty>עדיין לא נדחף ניתוח. הסוכן כותב לכאן בכל ריצה, בין אם סחר ובין אם לא.</LEmpty>
        </SlabCard>
        <SlabCard title="פוזיציות" sub="$7,913 invested" i={4}>
          <div className="l-card-body flex items-end justify-between gap-4">
            <BigStat value={5} size={30} caption="open positions" />
            <DotMatrix
              cols={[
                { label: '<$50', count: 0 },
                { label: '$50-250', count: 1 },
                { label: '$250-1k', count: 3 },
                { label: '$1k+', count: 4 },
              ]}
            />
          </div>
        </SlabCard>
        <InsightCard
          badge="Agent · next move"
          value={0}
          headline="runs recorded. The agent has not reported in."
          body="Index core: QQQ and SPY, bought on dips and topped up monthly, with buys stopping at the kill-switch floor."
          frac={0.6}
          i={5}
        />
      </div>

      <SlabCard
        title="מצבים"
        sub="empty · not configured · error · loading · sample"
        i={6}
        action={
          <>
            {['all', 'agent', 'you'].map((f) => (
              <ToggleChip key={f} on={filter === f} onClick={() => setFilter(f)}>
                {f}
              </ToggleChip>
            ))}
          </>
        }
      >
        <div className="grid gap-0 min-[900px]:grid-cols-2">
          <LEmpty>אין פקודות חיות אצל הברוקר. הן מופיעות כאן ברגע שההזנה מדווחת על אחת.</LEmpty>
          <LUnconfigured what="Phantom" href={setupHrefFor('phantom')} hint="Add PHANTOM_WALLET_ADDRESS in Settings" />
          <LError message="Robinhood feed timed out after 4 s." lastGood={<BigStat value={11290} kind="usdCents" size={30} />} age="12 min" onRetry={() => undefined} />
          <LError message="The usage reader answered 500." onRetry={() => undefined} />
          <LSkeleton lines={4} />
          <div className="l-state">
            <LSampleChip />
            <span className="l-state-text">שורות מדגם בהתקנה ריקה</span>
          </div>
        </div>
      </SlabCard>

      <div className="grid gap-5 min-[1100px]:grid-cols-2">
        <SlabCard title="בקרות" sub="pressable · toggle · keys" i={7}>
          <div className="l-card-body flex flex-col gap-4">
            <div className="l-kit-row">
              <Pressable tone="primary">שמירה</Pressable>
              <Pressable tone="secondary">
                <Search size={12} strokeWidth={1.8} aria-hidden /> Filter
              </Pressable>
              <Pressable tone="pill">לקריאה בלבד · מתרענן כל 60 שניות</Pressable>
              <Pressable tone="ghost" aria-label="מגמה" title="מגמה">
                <TrendingUp size={14} strokeWidth={1.7} aria-hidden />
              </Pressable>
              <Pressable tone="secondary" disabled>
                Disabled
              </Pressable>
            </div>
            <div className="l-kit-row">
              <span className="l-caption mt-0">לוח פקודות</span>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <Kbd size="sm">1</Kbd>
            </div>
            <Label count="5 of 5" rule>
              Trade log
            </Label>
            <Pressable tone="row" className="px-3 py-2.5">
              <span className="flex items-center justify-between gap-3 text-[12.5px]">
                <span>
                  <span style={{ color: 'var(--l-ok)' }}>BUY</span> SPY 1 @ $601.40
                </span>
                <Badge tone="ok">מולא</Badge>
              </span>
            </Pressable>
          </div>
        </SlabCard>
        <SlabCard title="סטטוס וסימונים" sub="chips · badges · LEDs · emblem · mark" i={8}>
          <div className="l-card-body flex flex-col gap-4">
            <div className="l-kit-row">
              <Chip tone="ok">3 מתוך 25 מערכות חיות</Chip>
              <Chip tone="warn">ישן 12 דק׳</Chip>
              <Chip tone="err">ההזנה למטה</Chip>
              <Chip tone="accent">סוכן</Chip>
              <Chip>בלי גוון</Chip>
            </div>
            <div className="l-kit-row">
              <Badge>ברירת מחדל</Badge>
              <Badge tone="accent">גוון</Badge>
              <Badge tone="ok">Ok</Badge>
              <Badge tone="warn">מזרע · ממתין להזנה</Badge>
              <Badge tone="err">נדחה</Badge>
              <Badge ghost>רפאים</Badge>
            </div>
            <div className="l-kit-row">
              <Dot state="connected" pulse label="connected" />
              <span className="l-caption mt-0">מחובר</span>
              <Dot state="idle" label="idle" />
              <span className="l-caption mt-0">ממתין</span>
              <Dot state="error" label="error" />
              <span className="l-caption mt-0">שגיאה</span>
              <Dot state="not_configured" label="not configured" />
              <span className="l-caption mt-0">לא מוגדר</span>
            </div>
            <div className="l-kit-row">
              <button type="button" className="l-pressable is-dark l-btn-icon" aria-pressed={thinking} aria-label="החלפת מצב חשיבה" onClick={() => setThinking((t) => !t)}>
                <ConductorEmblem size={28} thinking={thinking} />
              </button>
              <span className="l-caption mt-0">{thinking ? 'thinking' : 'idle'}: click the emblem</span>
              <OsMark size={30} />
            </div>
          </div>
        </SlabCard>
      </div>
    </div>
  );
}
