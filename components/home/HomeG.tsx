'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GBar,
  GBarChart,
  GButton,
  GCard,
  GDelta,
  GDisplay,
  GDotMatrix,
  GDotNumber,
  GEmpty,
  GHeroCard,
  GList,
  GPage,
  GRow,
  GSectionHeader,
  GShareBar,
  GSparkline,
  GStat,
  GTag,
  GTickStrip,
  type StageColumn,
} from '@/components/g';
import { Home6Chart, type Home6Series } from '@/components/Home6Chart';
import { formatCompact, formatFull, formatUsdCompact } from '@/lib/format-number';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { channelColor } from '@/lib/series';
import type { Delta } from '@/lib/delta';
import type { InboundSummary, RevenueSummary } from '@/lib/home-summary';
import type { IncomeCategory } from '@/lib/finances';
import type { StatusPill, Tone } from '@/lib/pulse-history';
import { DONE_TODAY_EMPTY, NEEDS_YOU_EMPTY, type DoneToday, type NeedsYou } from '@/lib/home-today';
import { InterjectG } from './Interject';

/**
 * Home under the GladOS style (glados-ui SPEC S01, X5). Home6Console gathers
 * the data once for both styles and hands this tree a plain object; the
 * Classic console is untouched.
 *
 * Layout is Home's own three columns (DOM order main, left, right; tiers on
 * the page width, rules in the "S01 home (G)" block of app/globals.css). Two
 * gradient heroes on the two numbers that drive a decision today (FR-1,
 * C22): money in and people waiting. Every other widget is a calm kit card.
 */

export type HomeGData = {
  greeting: string;
  status: {
    pill: StatusPill;
    segments: { text: string; href: string | null; tone: Tone }[];
    degraded: boolean;
  };
  revenue: RevenueSummary | null;
  financePeriod: 'MTD' | 'YTD';
  financeCategories: IncomeCategory[];
  inbound: InboundSummary;
  /** ISO start of each hourly bucket, oldest first. */
  hourStarts: string[];
  stats: {
    connected: number;
    connectors: number;
    activeAgents: number;
    agents: number;
    runs7: number;
    failed: number;
    brainPages: number;
  };
  chart: {
    usePosting: boolean;
    title: string;
    caption: string;
    href: string;
    hasChart: boolean;
    days: string[];
    series: { key: string; label: string; points: number[] }[];
  };
  runs: {
    perDay: number[];
    days: string[];
    lastRunText: string | null;
    lastRunTitle: string | null;
    recent: {
      id: string;
      agentId: string;
      ok: boolean;
      summary: string;
      age: string;
      at: string;
    }[];
  };
  freshness: { dated: number; fresh: number; aging: number; stale: number };
  audience: {
    key: string;
    label: string;
    last: number;
    spark: number[];
    delta: Delta | null;
    window: string;
    href: string;
  }[];
  /** F2: tasks blocked on the operator (top five) and what finished since local midnight. */
  needs: NeedsYou;
  done: DoneToday & { caption: string };
  live: {
    agents: { id: string; name: string; hint?: string }[];
    active: number;
    more: number;
    /** Real bots snapshot, not the demo roster. */
    bots?: boolean;
  };
  now: { quarter: string; items: { id: string; title: string }[] } | null;
};

const usd = (n: number) => `$${formatFull(Math.round(n))}`;
/** Comms sources on the inbound chart: email is the C19 email slot; the chat sources take categorical slots. */
const COMMS_COLOR: Record<string, string> = {
  email: 'var(--g-series-5)',
  whatsapp: 'var(--g-cat-8)',
  slack: 'var(--g-cat-7)',
};

const TAG_TONE: Record<Tone, 'ok' | 'warn' | 'err' | 'neutral' | 'accent'> = {
  ok: 'ok',
  warn: 'warn',
  err: 'err',
  accent: 'accent',
  dim: 'neutral',
};

export function HomeG({ data }: { data: HomeGData }) {
  return (
    <GPage className="hg">
      <header className="hg-head">
        <GDisplay>{data.greeting}</GDisplay>
        <StatusLine status={data.status} />
      </header>

      <div className="hg-grid h6-grid">
        <div className="hg-col h6-col h6-col-main">
          <div className="hg-heroes">
            <RevenueHero revenue={data.revenue} period={data.financePeriod} />
            <InboundHero inbound={data.inbound} starts={data.hourStarts} />
          </div>
          <Stats stats={data.stats} />
          <InterjectG />
          <div className="hg-today">
            <NeedsYouCard needs={data.needs} />
            <DoneTodayCard done={data.done} />
          </div>
          <ActivityCard chart={data.chart} />
          {data.financeCategories.length > 0 && <FinanceCard categories={data.financeCategories} period={data.financePeriod} />}
        </div>

        <div className="hg-col h6-col h6-col-left">
          <AgentsCard runs={data.runs} failed={data.stats.failed} runs7={data.stats.runs7} />
          <FreshnessCard f={data.freshness} />
          <AudienceCard rows={data.audience} />
        </div>

        <div className="hg-col h6-col h6-col-right">
          <LiveCard live={data.live} />
          {data.now && <NowCard now={data.now} />}
        </div>
      </div>
    </GPage>
  );
}

/* ── header: status from stateOfWorld (FR-5, H2) ─────────────────────── */

function StatusLine({ status }: { status: HomeGData['status'] }) {
  return (
    <div className="hg-status">
      <GTag tone={status.pill.tone} dot title="מצב כללי לפי ריצות שנכשלו וחיבורים">
        {status.pill.text}
      </GTag>
      {status.segments.map((s) =>
        s.href ? (
          <GButton key={s.text} variant="sm" href={s.href}>
            {s.text}
          </GButton>
        ) : (
          <GTag key={s.text} tone={TAG_TONE[s.tone]}>
            {s.text}
          </GTag>
        ),
      )}
      {status.degraded && (
        <GButton variant="sm" href="/setup" title="משהו דורש חיבור. פותחים את ההגדרות.">
          הגדרה
        </GButton>
      )}
    </div>
  );
}

/* ── heroes (FR-1 to FR-4) ───────────────────────────────────────────── */

function RevenueHero({ revenue, period }: { revenue: RevenueSummary | null; period: 'MTD' | 'YTD' }) {
  const caption = `הכנסות · ${period === 'YTD' ? 'מתחילת השנה' : 'מתחילת החודש'}`;
  if (!revenue) {
    return (
      <GHeroCard
        variant="a"
        caption={caption}
        status="אין מעבד תשלומים מחובר"
        setupHref={setupHrefFor('stripe')}
        setupHint="מחברים מעבד תשלומים כדי לראות הכנסות"
        title="הכנסות: אין מעבד תשלומים מחובר"
      />
    );
  }
  const { total, top, segments } = revenue;
  const periodWords = period === 'YTD' ? 'מתחילת השנה' : 'מתחילת החודש';
  const lead = segments.length === 1 ? `${top.label} · 100%` : `${top.label} מוביל · ${top.share}%`;
  return (
    <GHeroCard
      variant="a"
      href="/finances"
      caption={caption}
      value={formatUsdCompact(total)}
      label={`הכנסות ${periodWords} ${usd(total)}, ${top.label} ${segments.length === 1 ? 'הוא הכול' : `מוביל ב־${top.share} אחוז`}. פותחים כספים.`}
      title={`${usd(total)} הכנסה ${periodWords}, מאותם ספרי מעבדים כמו בכספים`}
      status={lead}
      strip={
        <GShareBar
          onHero
          label={`חלוקת הכנסות לפי קטגוריה, ${periodWords}`}
          segments={segments.map((s) => ({
            id: s.key,
            label: s.label,
            value: s.usd,
            title: `${s.label} · ${usd(s.usd)} · ${s.share}%`,
          }))}
        />
      }
    />
  );
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function InboundHero({ inbound, starts }: { inbound: InboundSummary; starts: string[] }) {
  const caption = 'נכנסות · 24 שע׳';
  if (!inbound.configured && inbound.count === 0) {
    return (
      <GHeroCard
        variant="b"
        caption={caption}
        status="אין ערוץ תקשורת מחובר"
        setupHref={setupHrefFor('email')}
        setupHint="מחברים דוא״ל, WhatsApp או Slack כדי לספור הודעות נכנסות"
        title="נכנסות: אין ערוץ תקשורת מחובר"
      />
    );
  }
  const shown = inbound.capped ? `${inbound.count}+` : inbound.count;
  const status =
    inbound.count === 0 ? 'יום שקט · 0 ב־24 שע׳' : inbound.priority > 0 ? `${inbound.priority.toLocaleString('he-IL')} בעדיפות` : `ב־${inbound.channels.toLocaleString('he-IL')} ערוצים`;
  const peak = inbound.hourly.reduce((best, v, i) => (v > inbound.hourly[best] ? i : best), 0);
  return (
    <GHeroCard
      variant="b"
      href="/inbox"
      caption={caption}
      value={shown}
      label={`${shown} inbound messages in the last 24 hours, ${status}. Open the inbox.`}
      title={`Messages that arrived in the last 24 hours across every connected channel${inbound.capped ? ' (the feed is capped, so there may be more)' : ''}`}
      status={status}
      strip={
        <GTickStrip
          onHero
          values={inbound.hourly}
          marked={23}
          titles={inbound.hourly.map((n, i) => `${hourLabel(starts[i])} · ${n.toLocaleString('he-IL')} הודעות`)}
          label={`נכנסות לפי שעה, 24 השעות האחרונות: ${inbound.count.toLocaleString('he-IL')} הודעות${inbound.count > 0 ? `, שיא ${inbound.hourly[peak].toLocaleString('he-IL')} בשעה ${hourLabel(starts[peak])}` : ''}`}
        />
      }
    />
  );
}

/* ── stats row (FR-7) ────────────────────────────────────────────────── */

function Stats({ stats }: { stats: HomeGData['stats'] }) {
  return (
    <div className="hg-stats">
      <GStat
        value={stats.connected}
        label={`מתוך ${stats.connectors.toLocaleString('he-IL')} מערכות`}
        href="/integrations"
        source={`${stats.connected.toLocaleString('he-IL')} מתוך ${stats.connectors.toLocaleString('he-IL')} חיבורים מחוברים`}
      />
      <GStat
        value={stats.activeAgents}
        label={`מתוך ${stats.agents.toLocaleString('he-IL')} סוכנים פעילים`}
        href="/agents"
        source={`${stats.activeAgents.toLocaleString('he-IL')} מתוך ${stats.agents.toLocaleString('he-IL')} סוכנים פעילים`}
      />
      <GStat
        value={stats.runs7}
        label="ריצות · 7 ימים"
        href="/agents"
        source={`ריצות סוכנים שהסתיימו בשבעת הימים האחרונים${stats.failed > 0 ? `; ${stats.failed.toLocaleString('he-IL')} מתוך 40 האחרונות נכשלו` : ''}`}
        extra={
          stats.failed > 0 ? (
            <GTag tone="err" size="xs">
              {stats.failed.toLocaleString('he-IL')} נכשלו
            </GTag>
          ) : undefined
        }
      />
      <GStat value={stats.brainPages} label="עמודי מוח" href="/brain" source={`${formatFull(stats.brainPages)} עמודים במאגר המוח`} />
    </div>
  );
}

/* ── activity chart (FR-8) ───────────────────────────────────────────── */

function ActivityCard({ chart }: { chart: HomeGData['chart'] }) {
  const series: Home6Series[] = chart.series.map((s) => ({
    ...s,
    color: chart.usePosting ? channelColor(s.key) : (COMMS_COLOR[s.key] ?? 'var(--g-accent)'),
  }));
  return (
    <GCard className="hg-card hg-chart" aria-labelledby="hg-chart-title">
      <GSectionHeader
        id="hg-chart-title"
        size={22}
        title={chart.title}
        caption={chart.caption}
        action={
          <GButton variant="sm" href={chart.href}>
            הכל
          </GButton>
        }
      />
      {chart.hasChart ? (
        <>
          <ul className="hg-legend" aria-label="מקרא">
            {series.map((s) => (
              <li key={s.key}>
                <i style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
          <Home6Chart days={chart.days} series={series} title={`${chart.title} · ${chart.caption}`} skin="g" />
        </>
      ) : (
        <GEmpty
          kind="unconfigured"
          title="אין עדיין היסטוריית פרסום או תקשורת"
          body="מחברים את מקור הפרסום כדי לראות היסטוריה."
          setupHref={setupHrefFor('zernio')}
          setupHint="חיבור לצורך היסטוריית פרסום"
        />
      )}
    </GCard>
  );
}

/* ── finances by category (FR-9, C13) ────────────────────────────────── */

function FinanceCard({ categories, period }: { categories: IncomeCategory[]; period: 'MTD' | 'YTD' }) {
  const router = useRouter();
  const total = categories.reduce((s, c) => s + c.usd, 0);
  const top = categories.reduce((best, c) => (c.usd > best.usd ? c : best), categories[0]);
  const [selected, setSelected] = useState<string | null>(top?.key ?? null);
  const columns: StageColumn[] = categories.map((c) => ({
    id: c.key,
    label: c.label,
    value: c.usd,
    tip: {
      title: c.label,
      lines: [usd(c.usd), `${total > 0 ? Math.round((c.usd / total) * 100) : 0}% מההכנסה`],
      hint: 'פתיחה בכספים',
    },
  }));
  return (
    <GCard className="hg-card" aria-labelledby="hg-fin-title">
      <GSectionHeader
        id="hg-fin-title"
        size={22}
        title="לפי קטגוריה"
        caption={`הכנסה · ${period === 'YTD' ? 'מתחילת השנה' : 'מתחילת החודש'}`}
        action={
          <GButton variant="sm" href="/finances">
            פתיחה
          </GButton>
        }
      />
      <div className="hg-fin">
        <GBarChart
          variant="stages"
          measure="usd"
          flow={false}
          columns={columns}
          selected={selected}
          plotHeight={120}
          onSelect={(id) => {
            setSelected(id);
            router.push(`/finances?category=${encodeURIComponent(id)}`);
          }}
          tipHint="פתיחה בכספים"
          label={`Income by category, ${period}`}
        />
      </div>
    </GCard>
  );
}

/* ── left column ─────────────────────────────────────────────────────── */

const DAY_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
};

/** Agents: the run histogram and the recent runs in one card (FR-10, H4). */
function AgentsCard({ runs, failed, runs7 }: { runs: HomeGData['runs']; failed: number; runs7: number }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-agents-title">
      <GSectionHeader
        id="hg-agents-title"
        size={22}
        title="סוכנים"
        caption={
          <span title={runs.lastRunTitle ?? 'ריצות סוכנים שהסתיימו בשבעת הימים האחרונים'}>
            {runs7.toLocaleString('he-IL')} ריצות · 7 ימים{runs.lastRunText ? ` · ${runs.lastRunText}` : ''}
          </span>
        }
        action={
          runs.recent.length > 0 && (
            <GTag tone={failed > 0 ? 'err' : 'ok'} dot title={failed > 0 ? `${failed.toLocaleString('he-IL')} מתוך 40 הריצות האחרונות נכשלו` : 'אין כישלונות ב־40 הריצות האחרונות'}>
              {failed > 0 ? `${failed.toLocaleString('he-IL')} נכשלו` : 'הכול תקין'}
            </GTag>
          )
        }
      />
      {runs.recent.length === 0 && runs7 === 0 ? (
        <GEmpty
          kind="unconfigured"
          title="עדיין אין ריצות סוכנים"
          body="ריצות יופיעו כאן אחרי שסוכן יקבל משימה."
          setupHref="/agents"
          setupHint="עדיין אין ריצה. פותחים את הסוכנים כדי להגדיר."
        />
      ) : (
        <>
          {/* the per-day histogram only when the week has runs: seven empty columns say nothing the caption does not */}
          {runs7 > 0 && (
            <GDotMatrix
              compact
              rows={6}
              label="ריצות ליום, שבעת הימים האחרונים"
              columns={runs.perDay.map((v, i) => {
                const day = runs.days[i] ? new Date(`${runs.days[i]}T00:00:00Z`).toLocaleDateString('he-IL', DAY_FMT) : '';
                return {
                  id: runs.days[i] ?? String(i),
                  label: day.slice(0, 2),
                  value: v,
                  title: `${day} · ${v.toLocaleString('he-IL')} ריצות`,
                };
              })}
            />
          )}
          <GList label="ריצות אחרונות" className="hg-list">
            {runs.recent.map((r) => (
              <GRow
                key={r.id}
                href={`/agents?agent=${encodeURIComponent(r.agentId)}`}
                leading={<span className="hg-dot" data-tone={r.ok ? 'ok' : 'err'} aria-label={r.ok ? 'הצליח' : 'נכשל'} role="img" />}
                title={r.agentId}
                meta={r.summary}
                trailing={
                  <span className="hg-age" title={new Date(r.at).toLocaleString('he-IL')}>
                    {r.age}
                  </span>
                }
                hint={r.summary}
              />
            ))}
          </GList>
        </>
      )}
    </GCard>
  );
}

/** Brain freshness (FR-11): one share number, one split bar, three rows. Page count lives in the stats row only. */
function FreshnessCard({ f }: { f: HomeGData['freshness'] }) {
  const pct = (n: number) => (f.dated > 0 ? Math.round((n / f.dated) * 100) : 0);
  return (
    <GCard className="hg-card" aria-labelledby="hg-fresh-title">
      <GSectionHeader id="hg-fresh-title" size={22} title="רעננות המוח" />
      {f.dated === 0 ? (
        <GEmpty
          kind="unconfigured"
          title="מאגר המוח לא מחובר"
          body="צפוי בתיקיית המוח או במשתנה הסביבה של המאגר."
          setupHref="/setup"
          setupHint="צפוי בתיקיית המוח או במשתנה הסביבה של המאגר"
        />
      ) : (
        <>
          <div className="hg-fresh-head" title="חלק העמודים עם תאריך שהשתנו ב־30 הימים האחרונים">
            <GDotNumber value={`${pct(f.fresh)}%`} size={4} label={`${pct(f.fresh)} אחוז רענן`} />
            <span className="hg-cap">רענן</span>
          </div>
          <GBar
            label={`רעננות המוח: ${f.fresh.toLocaleString('he-IL')} רעננים, ${f.aging.toLocaleString('he-IL')} מתיישנים, ${f.stale.toLocaleString('he-IL')} מיושנים`}
            segments={[
              { value: f.fresh, tone: 'accent', label: `רענן ${f.fresh.toLocaleString('he-IL')}` },
              { value: f.aging, tone: 'muted', label: `מתיישן ${f.aging.toLocaleString('he-IL')}` },
              { value: f.stale, tone: 'warn', label: `מיושן ${f.stale.toLocaleString('he-IL')}` },
            ]}
          />
          <GList label="רעננות" className="hg-list">
            <GRow
              href="/brain"
              title="רענן"
              meta="השתנה ב־30 הימים האחרונים"
              trailing={formatFull(f.fresh)}
              hint={`${f.fresh.toLocaleString('he-IL')} עמודים השתנו ב־30 הימים האחרונים`}
            />
            <GRow
              href="/brain"
              title="מתיישן"
              meta="השתנה לפני 31 עד 89 ימים"
              trailing={formatFull(f.aging)}
              hint={`${f.aging.toLocaleString('he-IL')} עמודים השתנו לפני 31 עד 89 ימים`}
            />
            <GRow
              href="/drift"
              title="מיושן"
              meta="לא נגענו בו 90 ימים או יותר"
              trailing={formatFull(f.stale)}
              hint={`${f.stale.toLocaleString('he-IL')} עמודים לא נגענו בהם 90 ימים או יותר`}
            />
          </GList>
        </>
      )}
    </GCard>
  );
}

/** Audience (FR-12, C19): one row per channel, a 30 day line and the change over the same window. */
function AudienceCard({ rows }: { rows: HomeGData['audience'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-aud-title">
      <GSectionHeader id="hg-aud-title" size={22} title="קהל" caption={rows.length > 0 ? '30 הימים האחרונים' : undefined} />
      {rows.length === 0 ? (
        <GEmpty
          kind="unconfigured"
          title="אין עדיין היסטוריית קהל"
          body="מחברים את מקור הקהל כדי לעקוב אחרי עוקבים."
          setupHref={setupHrefFor('zernio')}
          setupHint="חיבור כדי לעקוב אחרי עוקבים"
        />
      ) : (
        <GList label="קהל לפי ערוץ" className="hg-list">
          {rows.map((r) => (
            <GRow
              key={r.key}
              href={r.href}
              title={r.label}
              meta={r.delta ? <GDelta delta={r.delta} window={r.window} /> : undefined}
              hint={`${r.label}: ${formatFull(r.last)}${r.delta ? `, ${r.delta.text} from ${r.window}` : ''}`}
              trailing={
                <span className="hg-aud-trail">
                  {r.spark.length > 1 && <GSparkline values={r.spark} color={seriesSlot(r.key)} height={24} width={72} label={`${r.label} · last 30 days`} />}
                  <span className="hg-aud-val">{formatCompact(r.last)}</span>
                </span>
              }
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

/** The series slot for a channel (C19); untracked keys read muted. */
function seriesSlot(key: string): 'series-1' | 'series-2' | 'series-3' | 'series-4' | 'series-5' | 'series-6' | 'muted' {
  const m = channelColor(key).match(/--series-(\d)\)/);
  return m && m[1] !== '0' ? (`series-${m[1]}` as 'series-1') : 'muted';
}

/* ── right column ────────────────────────────────────────────────────── */

/** F2 Needs you: tasks blocked until the operator acts, top five, each opening on the board. */
function NeedsYouCard({ needs }: { needs: NeedsYou }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-needs-title" data-home-needs="">
      <GSectionHeader
        id="hg-needs-title"
        size={22}
        title="צריך אותך"
        caption={needs.total > 0 ? 'חסום עד שתפעלו' : undefined}
        action={
          needs.total > needs.rows.length ? (
            <GButton variant="sm" href="/tasks" title={`כל ${needs.total.toLocaleString('he-IL')} המשימות החסומות בלוח`}>
              כל {needs.total.toLocaleString('he-IL')}
            </GButton>
          ) : needs.total > 0 ? (
            <GTag tone="warn" dot title={`${needs.total.toLocaleString('he-IL')} ממתינות לפעולה שלך`}>
              {needs.total}
            </GTag>
          ) : undefined
        }
      />
      {needs.rows.length === 0 ? (
        <p className="hg-today-empty">{NEEDS_YOU_EMPTY}</p>
      ) : (
        <GList label="משימות שממתינות לך" className="hg-list">
          {needs.rows.map((t) => (
            <GRow
              key={t.id}
              href={t.href}
              leading={<span className="hg-dot" data-tone={t.priority === 'high' ? 'err' : 'warn'} role="img" aria-label={t.priority === 'high' ? 'עדיפות גבוהה' : 'חסום'} />}
              title={t.title}
              meta={t.agentId ?? 'Yours'}
              trailing={
                <span className="hg-age" title={`ממתין מאז ${new Date(t.at).toLocaleString('he-IL')}`}>
                  {t.age}
                </span>
              }
              hint={`${t.title}: open on the board`}
            />
          ))}
        </GList>
      )}
    </GCard>
  );
}

/** F2 Done today: runs and tasks finished since local midnight, the count and the newest three. */
function DoneTodayCard({ done }: { done: HomeGData['done'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-done-title" data-home-done="">
      <GSectionHeader
        id="hg-done-title"
        size={22}
        title="הושלם היום"
        action={
          done.failed > 0 ? (
            <GTag tone="err" dot title={`${done.failed.toLocaleString('he-IL')} נכשלו היום`}>
              {done.failed.toLocaleString('he-IL')} נכשלו
            </GTag>
          ) : undefined
        }
      />
      {done.count === 0 ? (
        <p className="hg-today-empty">{DONE_TODAY_EMPTY}</p>
      ) : (
        <>
        <GStat value={done.count} label={done.caption} source="ריצות סוכנים ומשימות שהסתיימו מאז חצות" />
        <GList label="הסתיים היום" className="hg-list">
          {done.rows.map((r) => (
            <GRow
              key={`${r.kind}-${r.id}`}
              href={r.href}
              leading={<span className="hg-dot" data-tone={r.ok ? 'ok' : 'err'} role="img" aria-label={r.ok ? 'הסתיים' : 'נכשל'} />}
              title={r.title}
              meta={r.kind === 'task' ? 'Task' : 'Run'}
              trailing={
                <span className="hg-age" title={new Date(r.at).toLocaleString('he-IL')}>
                  {r.age}
                </span>
              }
              hint={r.title}
            />
          ))}
        </GList>
        </>
      )}
    </GCard>
  );
}

/** Agents live (FR-14, H3): the count is every active agent; the list shows four and says how many more. */
function LiveCard({ live }: { live: HomeGData['live'] }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-live-title">
      <GSectionHeader
        id="hg-live-title"
        size={22}
        title={live.bots ? 'בוטים' : 'סוכנים פעילים'}
        action={
          <GTag tone="accent" title={`${live.active.toLocaleString('he-IL')} ${live.bots ? 'בוטים פעילים' : 'סוכנים פעילים'}`}>
            {live.active}
          </GTag>
        }
      />
      {live.bots && live.agents.length === 0 ? (
        <GEmpty kind="unconfigured" title="אין בוטים" body="אין בוט בתמונה." setupHref="/agents" setupHint="אין בוט בתמונה." />
      ) : live.agents.length === 0 ? (
        <GEmpty
          kind="unconfigured"
          title="אין סוכנים פעילים"
          body="אין סוכן פעיל כרגע."
          setupHref="/agents"
          setupHint="אין סוכן פעיל. פותחים את הסוכנים כדי להגדיר."
        />
      ) : (
        <GList label={live.bots ? 'בוטים' : 'סוכנים פעילים'} className="hg-list">
          {live.agents.map((a) => (
            <GRow key={a.id} href={`/agents?agent=${encodeURIComponent(a.id)}`} title={a.name} hint={a.hint ?? `פתיחת ${a.name}`} />
          ))}
          {live.more > 0 && (
            <GRow
              href="/agents"
              title={`+${live.more.toLocaleString('he-IL')} נוספים`}
              hint={`${live.more.toLocaleString('he-IL')} ${live.bots ? 'בוטים נוספים' : 'סוכנים פעילים נוספים'}`}
            />
          )}
        </GList>
      )}
    </GCard>
  );
}

/** Now (FR-15): the current quarter once, then the items. */
function NowCard({ now }: { now: NonNullable<HomeGData['now']> }) {
  return (
    <GCard className="hg-card" aria-labelledby="hg-now-title">
      <GSectionHeader id="hg-now-title" size={22} title="עכשיו" caption={now.quarter} />
      <GList label={`מפת דרכים, ${now.quarter}`} className="hg-list hg-now">
        {now.items.map((it) => (
          <GRow key={it.id} href="/roadmap" title={it.title} hint={it.title} />
        ))}
      </GList>
    </GCard>
  );
}
