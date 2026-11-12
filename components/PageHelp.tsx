'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { matchPageHelp, type HelpMode } from '@/lib/page-help';

const MODE: Record<HelpMode, string> = {
  demo: 'הדגמה',
  live: 'חי',
  none: 'לא מחובר',
};

export function PageHelp({ filming }: { filming: boolean }) {
  const pathname = usePathname() || '/';
  const help = matchPageHelp(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="page-help-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <span aria-hidden>?</span>
        הסבר על העמוד
      </button>
      {open && help && (
        <div className="page-help-scrim" onClick={() => setOpen(false)}>
          <aside
            className="page-help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="page-help-head">
              <div>
                <p className="page-help-kicker">הסבר על העמוד</p>
                <h2 id="page-help-title">{help.title}</h2>
              </div>
              <button type="button" className="page-help-close" onClick={() => setOpen(false)} aria-label="סגירה">
                סגירה
              </button>
            </header>
            <p className="page-help-mode">{filming ? 'מצב נוכחי: הדגמה. אין חשבון מחובר ואין שליחה.' : 'מצב נוכחי: נתונים מקומיים לפי מה שמוגדר במכונה.'}</p>
            <section>
              <h3>מה העמוד עושה</h3>
              <p>{help.what}</p>
            </section>
            <section>
              <h3>למי הוא מחובר</h3>
              <ul>
                {help.connected.map((link) => (
                  <li key={link.source}>
                    <strong>{link.source}</strong>
                    <span>{link.role}</span>
                    <em>{MODE[link.mode]}</em>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>איך הוא פועל</h3>
              <ol>
                {help.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
