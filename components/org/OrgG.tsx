'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Inbox } from 'lucide-react';
import { GAsk, GButton, GCard, GHeroCard, GList, GPage, GRow, GSectionHeader, GSegmented, GSheet, GTag } from '@/components/g';
import { openWizard } from '@/lib/wizard-dock';
import type { AgentDirectory } from '@/lib/agent-directory';
import type { Broadcast } from '@/lib/schemas';
import { AgentFace } from '@/components/agents/AgentFace';
import { AgentSheetHost } from '@/components/agents/AgentSheet';
import { openAgentSheet } from '@/components/agents/agent-param';

/**
 * /org under the GladOS style (glados-ui SPEC S04 §4.7, X5). Same hierarchy
 * and venture lens as the Classic page; kit presentation: the venture
 * switcher is a segmented control (F-O1), the life-area legend, the spark
 * tiles and the per-department tool chips are cut (F-O2, F-O4, AC04.30), the
 * Wizard is the one hero and its broadcast goes through the Wizard dock
 * (F0.1, F-O3), every agent row opens the AgentSheet (AC04.29), and the
 * department columns wrap instead of overflowing (F-O5, AC04.28).
 */
export type OrgAgentRow = { id: string; name: string; role: string; status: string; instance: string; depth: number; ventureColors: string[] };
export type OrgColumn = { id: string; name: string; area: string | null; leads: OrgAgentRow[]; workers: OrgAgentRow[] };
export type OrgVenture = { id: string; label: string; color: string; kind: string; detail: string; focus: string[]; brainTag: string };

const tone = (s: string) => (s === 'active' ? 'ok' : s === 'planned' ? 'outline' : 'idle');

function Row({ a, dir, dim, lead }: { a: OrgAgentRow; dir: AgentDirectory; dim: boolean; lead: boolean }) {
  return (
      <GRow
        className={`wg-org-row wg-org-d${Math.min(3, a.depth)}${dim ? ' is-dim' : ''}`}
        onClick={() => openAgentSheet(a.id)}
        leading={<AgentFace src={dir.avatars[a.id]} name={a.name} size={lead ? 28 : 22} />}
        title={
          <span className="wg-org-name">
            <span className="wg-dot" data-tone={tone(a.status)} aria-label={a.status} />
            {a.name}
            {a.ventureColors.map((c, i) => (
              // venture colours are data (ventures.json), shown only as 6px dots (S04 §5.4)
              <span key={i} className="wg-org-vdot" style={{ background: c }} aria-hidden />
            ))}
          </span>
        }
        meta={lead ? a.role : undefined}
        trailing={lead ? <GTag size="xs">{a.instance}</GTag> : undefined}
        hint={`${a.role} · פתיחת פרופיל`}
      />
  );
}

export function OrgG({
  dir,
  columns,
  ventures,
  venture,
  ventureAgents,
  operatorName,
  routedCount,
  lastBroadcast,
}: {
  dir: AgentDirectory;
  columns: OrgColumn[];
  ventures: OrgVenture[];
  venture: OrgVenture | null;
  ventureAgents: string[] | null;
  operatorName: string;
  routedCount: number;
  lastBroadcast: Broadcast | null;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState('');
  const [replies, setReplies] = useState(false);
  const lens = ventureAgents ? new Set(ventureAgents) : null;
  const dim = (id: string) => (lens ? !lens.has(id) : false);
  const names = Object.fromEntries(dir.agents.map((a) => [a.id, a.name]));

  return (
    <GPage className="wg-page">
      <GSectionHeader
        size="page"
        title="ארגון"
        caption="מי עובד אצל מי, ובאיזה מיזם"
        action={
          ventures.length > 0 ? (
            <GSegmented
              label="מיזם"
              value={venture?.id ?? 'all'}
              onChange={(v) => router.push(v === 'all' ? '/org' : `/org?venture=${encodeURIComponent(v)}`)}
              options={[{ value: 'all', label: 'כל המיזמים' }, ...ventures.map((v) => ({ value: v.id, label: v.label }))]}
            />
          ) : undefined
        }
      />

      {venture && (
        <GCard className="wg-org-focus">
          <span className="wg-org-focus-head">
            <span className="wg-org-vdot" style={{ background: venture.color }} aria-hidden />
            {venture.label} · מיקוד הנהלה
          </span>
          <ul className="wg-org-focus-list">
            {venture.focus.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <span className="wg-cap">
            {venture.kind} · {venture.detail} · תגית מנוע #{venture.brainTag} ·{' '}
            {lens && lens.size > 0 ? `${lens.size.toLocaleString('he-IL')} סוכנים במיזם` : `אין עדיין סוכנים ל־${venture.label}`}
          </span>
        </GCard>
      )}

      <div className="wg-org-top">
        <GTag className="wg-org-op">{operatorName === 'Operator' ? 'מפעיל' : `מפעיל · ${operatorName}`}</GTag>
        <div className="wg-org-head">
          <GCard href="/brain" className="wg-org-sys" aria-label="מנוע הידע">
            <Brain size={18} strokeWidth={1.6} aria-hidden />
            <span className="wg-org-sys-title">מנוע הידע</span>
            <span className="wg-cap">מאגר ידע</span>
          </GCard>
          <div className="wg-org-wizard">
            <GHeroCard
              variant="a"
              size="sm"
              caption="אשף"
              value={routedCount}
              label={`האשף מנתב עבודה אל ${routedCount.toLocaleString('he-IL')} סוכנים`}
              status={`מנתב עבודה אל ${routedCount.toLocaleString('he-IL')} סוכנים`}
              title="הסוכן־על. פותח את עוגן האשף."
              onClick={() => openWizard({ source: 'org-hero' })}
            />
            <GAsk
              value={ask}
              onValueChange={setAsk}
              label="שאלה לאשף"
              placeholder="שאלה לאשף"
              onSubmit={(text) => {
                openWizard({ text, source: 'org-ask' });
                setAsk('');
              }}
            />
            {lastBroadcast && (
              <GButton size="sm" onClick={() => setReplies(true)} title={`שידור אחרון: ${lastBroadcast.message}`}>
                שידור אחרון · {lastBroadcast.replies.filter((r) => r.ok).length}/{lastBroadcast.replies.length} ענו
              </GButton>
            )}
          </div>
          <GCard href="/inbox" className="wg-org-sys" aria-label="הזנת תקשורת, תיבה מאוחדת">
            <Inbox size={18} strokeWidth={1.6} aria-hidden />
            <span className="wg-org-sys-title">הזנת תקשורת</span>
            <span className="wg-cap">דוא״ל, WhatsApp, Slack</span>
          </GCard>
        </div>
      </div>

      <GSectionHeader size={22} title="מחלקות" caption="כל מחלקה מדווחת לאשף" />
      <div className="wg-org-cols">
        {columns.map((col) => (
          <GCard key={col.id} p={16} as="section" className="wg-org-col" aria-label={col.name}>
            <div className="wg-org-col-head">
              <span className="wg-org-col-name">{col.name}</span>
              {col.area && !col.name.toLowerCase().startsWith(col.area.toLowerCase().slice(0, 5)) && <GTag size="xs">{col.area}</GTag>}
            </div>
            {col.leads.length === 0 && col.workers.length === 0 ? (
              <p className="wg-cap">הסוכנים יופיעו כאן כשהמחלקה תעלה לאוויר.</p>
            ) : (
              <>
                {col.leads.length > 0 && (
                  <GList label={`מובילי ${col.name}`}>
                    {col.leads.map((a) => (
                      <Row key={a.id} a={a} dir={dir} dim={dim(a.id)} lead />
                    ))}
                  </GList>
                )}
                {col.workers.length > 0 && (
                  <GList label={`צוות ${col.name}`}>
                    {col.workers.map((a) => (
                      <Row key={a.id} a={a} dir={dir} dim={dim(a.id)} lead={false} />
                    ))}
                  </GList>
                )}
              </>
            )}
          </GCard>
        ))}
      </div>

      <GSheet open={replies} onClose={() => setReplies(false)} width={560} title="שידור אחרון" caption={lastBroadcast ? `“${lastBroadcast.message}”` : undefined}>
        {lastBroadcast && (
          <GList divided label="תשובות">
            {lastBroadcast.replies.map((r) => (
              <GRow
                key={r.id}
                leading={<span className="wg-dot" data-tone={r.ok ? 'ok' : 'err'} aria-label={r.ok ? 'ענה' : 'נכשל'} />}
                title={names[r.agentId] ?? r.agentId}
                meta={r.reply}
                onClick={() => {
                  setReplies(false);
                  openAgentSheet(r.agentId);
                }}
              />
            ))}
          </GList>
        )}
      </GSheet>
      <AgentSheetHost dir={dir} />
    </GPage>
  );
}
