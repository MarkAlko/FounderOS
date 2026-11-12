import { calendarBadgeText, calendarWindow, jerusalemClock, type WindowEvent } from '@/lib/snapshot-copy';

function Row({ event }: { event: WindowEvent }) {
  return (
    <li className="text-[12.5px]" style={{ color: 'var(--text)' }}>
      <span style={{ color: 'var(--text-3)' }}>{event.allDay ? 'כל היום' : jerusalemClock(event.start)}</span>
      {' · '}
      {event.title}
      {event.location ? ` · ${event.location}` : ''}
      {event.attendeesCount > 0 ? ` · ${event.attendeesCount.toLocaleString('he-IL')} משתתפים` : ''}
    </li>
  );
}

/** Today and the rest of this week, from the Holdings calendar snapshot. */
export function CalendarWindow({ generatedAt, events, now = new Date() }: { generatedAt: string; events: WindowEvent[]; now?: Date }) {
  const { today, week } = calendarWindow(events, now);
  return (
    <section className="mb-4 rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} data-calendar-snapshot="">
      <p className="mb-3 inline-flex rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
        {calendarBadgeText(generatedAt)}
      </p>
      <h2 className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
        היום · {today.length.toLocaleString('he-IL')}
      </h2>
      {today.length === 0 ? (
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          אין אירועים היום
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {today.map((event) => (
            <Row key={event.id} event={event} />
          ))}
        </ul>
      )}
      <h2 className="mt-3 text-[13px] font-medium" style={{ color: 'var(--text)' }}>
        השבוע · {week.length.toLocaleString('he-IL')}
      </h2>
      {week.length === 0 ? (
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          אין אירועים נוספים השבוע
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {week.map((event) => (
            <Row key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
