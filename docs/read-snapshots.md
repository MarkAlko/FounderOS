# Calendar, inbox, and knowledge snapshots

Three more read-only files, same rules as `docs/monday-snapshot.md` and `docs/bots-snapshot.md`.
FounderOS does not call Google, the mailbox, or Notion, and it does not send mail.
A relay POSTs one JSON file. The screens read it. Do not commit the file.

## Enable

`MONDAY_SNAPSHOT=1` turns all three readers on. Or set the specific flag:

- `CALENDAR_SNAPSHOT=1`
- `INBOX_SNAPSHOT=1`
- `KNOWLEDGE_SNAPSHOT=1`

Until the file exists and parses, that screen stays on the demo data.

## Where the files are written

Same directory as `monday-snapshot.json`: `$GLADOS_STORE` during a trial, otherwise `$GLADOS_DATA_DIR`, otherwise `/var/data`.

| File | Route |
| --- | --- |
| `calendar-snapshot.json` | `POST /api/snapshot/calendar` |
| `inbox-snapshot.json` | `POST /api/snapshot/inbox` |
| `knowledge-snapshot.json` | `POST /api/snapshot/knowledge` |

`Authorization: Bearer <SNAPSHOT_INGEST_TOKEN>`. Missing token: 404. Wrong token: 401. Body over 5 MiB: 413. A key matching `phone`, `email`, `token`, or `password`: 400 refused. Any other shape or extra key: 400 invalid. The write is atomic, mode `0600`.

There is no GET and no session-cookie fallback.

## Calendar

`calendar` is exactly `Holdings`. There is no attendee list and no address. `attendeesCount` is a number.

```json
{
  "generatedAt": "2026-11-12T16:00:00.000Z",
  "calendar": "Holdings",
  "events": [
    {
      "id": "e1",
      "title": "דוגמה",
      "start": "2026-11-12T08:00:00.000Z",
      "end": "2026-11-12T09:00:00.000Z",
      "allDay": false,
      "location": "",
      "attendeesCount": 0
    }
  ]
}
```

Home, and the inbox today and week widgets, read these events. Times on the home card use Asia/Jerusalem.

## Inbox

`mailbox` is exactly `business`. `fromName` is a display name. `snippet` is at most 160 characters. Do not send an address.

```json
{
  "generatedAt": "2026-11-12T16:00:00.000Z",
  "mailbox": "business",
  "threads": [
    {
      "id": "t1",
      "subject": "דוגמה",
      "fromName": "שם לדוגמה",
      "receivedAt": "2026-11-12T16:00:00.000Z",
      "unread": true,
      "labels": [],
      "snippet": "שורה קצרה"
    }
  ]
}
```

The inbox page lists these threads and does not offer a working reply. The disabled control says `תשובות נשלחות מתוך התיבה עצמה`.

## Knowledge

`source` is exactly `Notion`. `summary` is at most 400 characters.

```json
{
  "generatedAt": "2026-11-12T16:00:00.000Z",
  "source": "Notion",
  "pages": [
    {
      "id": "p1",
      "title": "דוגמה",
      "url": "https://example.com/page",
      "section": "כללי",
      "updatedAt": "2026-11-12T16:00:00.000Z",
      "summary": "תקציר קצר"
    }
  ]
}
```

The brain page and the knowledge page list the pages grouped by `section`, with a search over title, section, and summary.

The rows above are a shape example. They are not a customer export.
