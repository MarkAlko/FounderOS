# Bots snapshot

FounderOS does not call the bots, and it does not send them actions.
A relay you run elsewhere POSTs one JSON file. The agents page, the home
agents widget, and the org agent list read that file. The file is machine
state. Do not commit it, and do not put a real export in this repository.

## Enable

Either of these turns the reader on. It works while `GLADOS_TRIAL=1` is also set.

- `BOTS_SNAPSHOT=1`
- `MONDAY_SNAPSHOT=1`

The reader stays on the demo agents until `bots-snapshot.json` exists and
parses. An empty list is empty. It does not fall back to the demo roster.
Everything that is not the agent list stays on the demo data.

## Where the file is written

Same directory as `monday-snapshot.json`.

| Process | Path |
| --- | --- |
| `GLADOS_TRIAL=1` and `GLADOS_STORE` set | `$GLADOS_STORE/bots-snapshot.json` |
| `GLADOS_TRIAL=1` and no store | `/var/data/bots-snapshot.json` |
| otherwise, `GLADOS_DATA_DIR` set | `$GLADOS_DATA_DIR/bots-snapshot.json` |
| otherwise | `/var/data/bots-snapshot.json` |

The write is atomic: a temp file in that directory, then rename. Mode `0600`.

## Ingest

`POST /api/snapshot/bots`

```
Authorization: Bearer <SNAPSHOT_INGEST_TOKEN>
Content-Type: application/json
```

The token is the same variable as `POST /api/snapshot/monday`.

- `SNAPSHOT_INGEST_TOKEN` unset or blank → `404 {"error":"not found"}`.
- Header missing or not equal to the token → `401 {"error":"unauthorized"}`.
- Body larger than 5 MiB (`5242880` bytes) → `413 {"error":"too large"}`.
- Any object key matching `phone`, `email`, `token`, or `password` → `400 {"error":"refused"}`.
- Body is not the schema below, including any extra key → `400 {"error":"invalid"}`.
- Success → `200 {"ok":true,"bots":N,"errors":N}`.

There is no GET. A session cookie is not accepted in place of the bearer token.

## Schema

Every object is strict. `routines`, `recentWork`, and `openItems` may be omitted and then become `[]`. `lastActiveAt` is an ISO date string or `null`. `generatedAt` must parse as a date.

`category` is one of:

`mail`, `calendar`, `Monday`, `quotes`, `Notion/knowledge`, `WhatsApp`, `website`, `marketing`, `meetings`, `management`, `personal`, `other`.

`status` is `active`, `idle`, or `unknown`.

```json
{
  "generatedAt": "2026-11-12T16:00:00.000Z",
  "bots": [
    {
      "id": "b1",
      "name": "דוגמה",
      "role": "תפקיד לדוגמה",
      "category": "mail",
      "lastActiveAt": "2026-11-12T16:00:00.000Z",
      "status": "active",
      "routines": [{ "name": "סיכום", "schedule": "כל בוקר" }],
      "recentWork": ["טיוטה לדוגמה"],
      "openItems": ["פריט לדוגמה"]
    }
  ],
  "errors": [{ "bot": "דוגמה", "reason": "אין קובץ" }]
}
```

Do not send `phone`, `email`, `token`, or `password` fields. A personal bot may include routines in the file; the screen shows only that bot's name, role, and status.

Caps: 500 bots, 40 routines, 40 recent lines, and 40 open items per bot, 100 errors, and 5 MiB for the whole body.

The row above is a shape example. It is not a customer export.

## What the screens do

When the flag is on and the file parses, the agents page, the home agents widget, and the org agent list show these bots instead of the demo roster. Cards are grouped by category, with a status dot, last activity in Asia/Jerusalem, and a detail drawer for routines, recent work, and open items. Filters cover category and status. A count summary sits above the groups.

Personal bots show name, role, and status only.

The badge is:

`תמונת מצב של הבוטים · עודכן <date and time in Asia/Jerusalem, he-IL>`

The page help says this is a read-only snapshot of the MRK Grok bots, refreshed on a schedule, and that no action is sent to a bot.
