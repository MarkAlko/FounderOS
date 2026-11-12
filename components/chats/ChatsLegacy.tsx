'use client';

/**
 * /chats under the Bennett Legacy style (pages/chats.md §8): FounderOS's Chats
 * (shots/founderos-v1/chats-1440.png). The one FO page without a slab: the
 * `// EVERY CONVERSATION` eyebrow and an uppercase CHATS title over one
 * rounded shell holding the conversation rail and the open thread. FO's mic
 * and voice buttons are not ported (no dictation wired, no dead controls).
 * Same state hook as the other trees (useChats.ts); Legacy kit and --l-* only.
 */
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUp, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Search, Wrench } from 'lucide-react';
import { Badge, Chip, ConductorEmblem, Dot, Kbd, LAvatar, LSampleChip, LSkeleton, LUnconfigured, Pressable } from '@/components/legacy';
import { relativeTime } from '@/lib/wizard/helpers';
import type { ChatsView } from '@/lib/chats-view';
import { useChats, WIZARD, type ChatsState } from './useChats';

export function ChatsLegacy({ view, initialView }: { view: ChatsView; initialView: 'rail' | 'thread' }) {
  const c = useChats(view, { initialView });
  return (
    <div data-l="ChatsLegacy" className="l-page l-ch-page">
      <div className="l-ch-title l-rise" style={{ ['--l-rise-i' as string]: 0 }}>
        <div className="min-w-0">
          <div className="l-eyebrow">{'// Every conversation'}</div>
          <h1 className="l-ch-h1">שיחות</h1>
        </div>
        {view.sample && (
          <span title={view.mode === 'filming' ? 'Sample data: Filming threads' : 'Sample data: sample threads (?sample=1)'}>
            <LSampleChip />
          </span>
        )}
      </div>
      <div data-l="ChatShell" className="l-ch-shell l-rise" style={{ ['--l-rise-i' as string]: 1 }}>
        <div className="l-ch-grid" data-view={c.mobileView} data-collapsed={c.collapsed || undefined}>
          <Rail c={c} />
          <Strip c={c} />
          <Thread c={c} />
        </div>
      </div>
    </div>
  );
}

function Face({ id, src, name, size }: { id: string; src: string | null; name: string; size: number }) {
  return id === WIZARD ? <ConductorEmblem size={size} /> : <LAvatar src={src} name={name} size={size} />;
}

function Rail({ c }: { c: ChatsState }) {
  const empty = c.allThreadsCount <= 1 && !c.search.trim();
  const startNew = () => {
    c.setPicking(true);
    c.back();
  };
  return (
    <aside className="l-ch-rail">
      <div className="l-ch-rail-head">
        <span className="l-ch-label">{c.picking ? 'New chat' : 'Conversations'}</span>
        {c.picking ? (
          <Pressable tone="ghost" className="l-btn-icon-xs" onClick={() => c.setPicking(false)} aria-label="חזרה לשיחות" title="חזרה לשיחות (Esc)">
            <ArrowLeft size={12} strokeWidth={1.7} aria-hidden />
          </Pressable>
        ) : (
          <Pressable tone="ghost" className="l-btn-icon-xs l-ch-wide-only" onClick={c.toggleRail} aria-label="כיווץ רשימת השיחות">
            <PanelLeftClose size={12} strokeWidth={1.7} aria-hidden />
          </Pressable>
        )}
      </div>
      <div className="l-ch-search-row">
        <label className="l-ch-search">
          <Search size={12} strokeWidth={1.7} aria-hidden />
          <input
            type="search"
            value={c.search}
            onChange={(e) => c.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && c.search) {
                e.preventDefault();
                c.setSearch('');
              }
            }}
            placeholder={c.picking ? 'search agents' : 'search threads'}
            aria-label={c.picking ? 'Search agents' : 'Search threads'}
          />
        </label>
        {!c.picking && (
          <Pressable tone="ghost" className="l-btn-icon-sm l-ch-new" onClick={startNew} aria-label="שיחה חדשה" aria-expanded={c.picking} title="שיחה חדשה">
            <Plus size={13} strokeWidth={1.8} aria-hidden />
          </Pressable>
        )}
      </div>
      <div className="l-ch-rail-list">
        {c.picking ? (
          c.roster.length > 0 ? (
            <ul aria-label="סוכנים בלי שרשור">
              {c.roster.map((r) => (
                <li key={r.id}>
                  <Pressable tone="row" className="l-ch-row" onClick={() => c.select(r.id)}>
                    <Face id={r.id} src={r.avatar} name={r.name} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="l-ch-row-name">{r.name}</span>
                      <span className="l-ch-row-sub">{r.description || 'Agent'}</span>
                    </span>
                  </Pressable>
                </li>
              ))}
            </ul>
          ) : c.rosterTotal === 0 && c.view.agentCount === 0 ? (
            <p className="l-ch-note">
              No agents yet.{' '}
              <Link href="/agents" className="l-link">
                Open Agents
              </Link>
            </p>
          ) : (
            <p className="l-ch-note">{c.rosterTotal === 0 ? 'Every agent already has a thread.' : 'No agent matches that search.'}</p>
          )
        ) : (
          <>
            <ul aria-label="שיחות">
              {c.threads.map((t) => (
                <li key={t.agentId}>
                  <Pressable tone="row" kind="r" className="l-ch-row" aria-pressed={t.agentId === c.selected} onClick={() => c.select(t.agentId)}>
                    <span className="l-ch-row-led" aria-hidden>
                      <Dot state={t.agentId === WIZARD || t.messageCount > 0 ? 'ok' : 'off'} />
                    </span>
                    <Face id={t.agentId} src={t.avatar} name={t.name} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="l-ch-row-name">{t.name}</span>
                        {t.pinned && <span className="l-ch-pin">נעוץ</span>}
                        {t.lastAt && <span className="l-ch-time">{relativeTime(t.lastAt, c.now)}</span>}
                      </span>
                      <span className="l-ch-row-sub">{t.lastMessage ?? (t.pinned ? t.role : 'No messages yet')}</span>
                    </span>
                  </Pressable>
                </li>
              ))}
            </ul>
            {empty && <p className="l-ch-note">עדיין אין שיחות ישירות. לחצו שיחה חדשה ובחרו סוכן.</p>}
            {!empty && c.threads.length === 0 && <p className="l-ch-note">אין שרשור שמתאים לחיפוש.</p>}
          </>
        )}
      </div>
    </aside>
  );
}

function Strip({ c }: { c: ChatsState }) {
  return (
    <aside className="l-ch-strip">
      <Pressable tone="ghost" className="l-btn-icon-sm" onClick={c.toggleRail} aria-label="הצגת רשימת השיחות">
        <PanelLeftOpen size={13} strokeWidth={1.7} aria-hidden />
      </Pressable>
      <ul aria-label="שיחות" className="flex flex-col items-center gap-2">
        {c.threads.map((t) => (
          <li key={t.agentId}>
            <Pressable tone="ghost" className="l-ch-strip-btn" title={t.name} aria-label={`Open ${t.name}`} aria-pressed={t.agentId === c.selected} onClick={() => c.select(t.agentId)}>
              <Face id={t.agentId} src={t.avatar} name={t.name} size={26} />
            </Pressable>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Thread({ c }: { c: ChatsState }) {
  const h = c.header;
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [c.selected, c.messages.length, c.pending.length, c.routed.length, c.status]);
  useEffect(() => {
    if (field.current && !c.draft) field.current.style.height = 'auto';
  }, [c.draft]);
  const composer = c.view.composer;
  const nothing = c.status === 'ready' && c.messages.length === 0 && c.pending.length === 0 && c.routed.length === 0;
  const submit = () => c.send(c.draft);
  const modelText = c.view.model.state === 'configured' ? 'model ready' : 'model not configured';

  return (
    <section className="l-ch-thread" aria-label={`Conversation with ${h.name}`}>
      <header className="l-ch-head">
        <Pressable tone="ghost" className="l-btn-icon-sm l-ch-narrow-only" onClick={c.back} aria-label="חזרה לשיחות">
          <ArrowLeft size={14} strokeWidth={1.7} aria-hidden />
        </Pressable>
        <Face id={h.agentId} src={h.avatar} name={h.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Dot state={h.wizard ? (c.view.model.state === 'configured' ? 'ok' : 'warn') : 'ok'} />
            <span className="l-ch-name">{h.name}</span>
            <Chip>{h.wizard ? `board · ${modelText}` : 'direct line'}</Chip>
          </div>
          <p className="l-ch-role">
            {h.wizard
              ? `your conductor · hands each message to the agent best placed to answer${h.projectName ? ` · latest project ${h.projectName}` : ''}`
              : `${h.role || 'agent'} · can read your data here, not change it`}
          </p>
        </div>
        <Pressable href={h.wizard ? '/wizard' : `/agents?agent=${encodeURIComponent(h.agentId)}`} className="l-ch-open">
          {h.wizard ? 'Open Wizard' : 'Open agent'}
        </Pressable>
      </header>

      <div ref={scroller} className="l-ch-msgs" aria-live="polite">
        {c.status === 'loading' && c.messages.length === 0 && <LSkeleton lines={3} />}
        {c.status === 'error' && (
          <div className="l-ch-alert" role="alert">
            <Dot state="err" /> {c.error ?? 'Could not load the thread.'}
            <Pressable onClick={c.reload}>
              <RotateCcw size={11} strokeWidth={1.8} aria-hidden /> Retry
            </Pressable>
          </div>
        )}
        {nothing && (
          <div className="l-ch-empty">
            <p className="l-lead">{h.wizard ? 'No Wizard conversation yet' : `No messages with ${h.name} yet`}</p>
            <p className="l-caption">{h.wizard ? 'Your latest Wizard project shows here. Ask below and the Wizard routes it.' : 'Ask what it can see. It reads its connectors to answer.'}</p>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {c.messages.map((m) =>
            m.role === 'tool' ? (
              <div key={m.id} className="l-ch-tool">
                <Wrench size={11} strokeWidth={1.7} aria-hidden /> read {m.tools.join(', ') || 'a tool'}
              </div>
            ) : m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="l-ch-bubble">
                  <p>{m.content}</p>
                  <span className="l-ch-stamp">{relativeTime(m.createdAt, c.now)}</span>
                </div>
              </div>
            ) : (
              <div key={m.id} className="l-ch-reply">
                <Face id={h.agentId} src={h.avatar} name={h.name} size={24} />
                <div className="min-w-0">
                  <p>{m.content}</p>
                  <span className="l-ch-stamp">{relativeTime(m.createdAt, c.now)}</span>
                </div>
              </div>
            ),
          )}
          {c.routed.map((r) => (
            <div key={r.key} className="flex flex-col gap-4">
              <div className="flex justify-end">
                <div className="l-ch-bubble">
                  <p>{r.text}</p>
                </div>
              </div>
              <div className="l-ch-reply">
                <LAvatar src={r.routedAvatar} name={r.routedName} size={24} />
                <div className="min-w-0">
                  <p>{r.reply}</p>
                  <span className="l-ch-stamp">
                    Answered by {r.routedName}{' '}
                    <button type="button" className="l-link" onClick={() => c.select(r.routedTo)}>
                      Open thread
                    </button>
                  </span>
                </div>
              </div>
            </div>
          ))}
          {c.pending.map((p) => (
            <div key={p.key} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <div className="l-ch-bubble" data-state={p.state}>
                  <p>{p.text}</p>
                  {p.state === 'sending' && <span className="l-ch-stamp">שולח</span>}
                </div>
              </div>
              {p.state === 'sending' ? (
                <div className="l-ch-reply items-center">
                  <ConductorEmblem size={24} thinking={h.wizard} />
                  <span className="l-caption mt-0">חושב</span>
                </div>
              ) : (
                <div className="l-ch-alert" role="alert">
                  <Dot state="err" /> Not sent. {p.error}
                  <Pressable onClick={() => c.retry(p.key)}>
                    <RotateCcw size={11} strokeWidth={1.8} aria-hidden /> Retry
                  </Pressable>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="l-ch-foot">
        {composer.reason === 'not_configured' && <LUnconfigured what="The model key agent chat uses" href={c.view.model.setupHref} hint="Add the AI Gateway key the agent chat uses" />}
        {composer.reason === 'sample' && (
          <p className="l-ch-note">
            <Badge tone="warn">מדגם</Badge> Sample threads. Sending is off in this preview.
          </p>
        )}
        <div data-l="Composer" className="l-ch-composer" data-disabled={!composer.enabled || undefined}>
          <textarea
            ref={field}
            value={c.draft}
            rows={1}
            disabled={!composer.enabled}
            aria-label={`Message ${h.name}`}
            placeholder={`Message ${h.wizard ? 'the Wizard' : h.name}…`}
            onChange={(e) => {
              c.setDraft(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="l-ch-composer-row">
            <span className="l-ch-hint">
              {composer.enabled ? (
                <>
                  <Kbd size="sm">אנטר</Kbd> שולח · <Kbd size="sm">שיפט+אנטר</Kbd> breaks
                </>
              ) : null}
            </span>
            <Pressable tone="ghost" className="l-btn-icon-sm l-ch-send" onClick={submit} disabled={!composer.enabled || c.busy || !c.draft.trim()} aria-label="שליחה">
              <ArrowUp size={14} strokeWidth={2} aria-hidden />
            </Pressable>
          </div>
        </div>
      </div>
    </section>
  );
}
