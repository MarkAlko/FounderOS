# Monday snapshot

FounderOS does not call Monday in this mode, and it does not write back.
A relay you run elsewhere pulls Monday and POSTs one JSON file. The screens
read that file. The file is machine state. Do not commit it, and do not put
a real export in this repository.

## Enable

Either of these turns the reader on. It works while `GLADOS_TRIAL=1` is also set.

- `MONDAY_SNAPSHOT=1`
- `FUNNEL_PROVIDER=snapshot`

The reader stays on the demo data until `monday-snapshot.json` exists and
parses. An empty snapshot is empty. It does not fall back to the demo company.

## Where the file is written

| Process | Path |
| --- | --- |
| `GLADOS_TRIAL=1` and `GLADOS_STORE` set | `$GLADOS_STORE/monday-snapshot.json` |
| `GLADOS_TRIAL=1` and no store | `/var/data/monday-snapshot.json` |
| otherwise, `GLADOS_DATA_DIR` set | `$GLADOS_DATA_DIR/monday-snapshot.json` |
| otherwise | `/var/data/monday-snapshot.json` |

A trial ignores `GLADOS_DATA_DIR`, same as the database. The write is atomic:
a temp file in that directory, then rename. Mode `0600`.

## Ingest

`POST /api/snapshot/monday`

```
Authorization: Bearer <SNAPSHOT_INGEST_TOKEN>
Content-Type: application/json
```

- `SNAPSHOT_INGEST_TOKEN` unset or blank → `404 {"error":"not found"}`.
- Header missing or not equal to the token → `401 {"error":"unauthorized"}`.
  The compare hashes both sides and uses a constant-time compare.
- Body larger than 5 MiB (`5242880` bytes), by `Content-Length` or by the
  bytes read → `413 {"error":"too large"}`.
- Body contains `7890955175` anywhere → `400 {"error":"refused"}`.
  That is the bank board. It is refused as an id, a name, or any other field.
- Body is not the schema below, including any extra key → `400 {"error":"invalid"}`.
- Success → `200 {"ok":true,"tasks":N,"leads":N,"quotes":N,"boards":N}`.

The route does not accept a session cookie in place of the bearer token.
There is no GET. There is no write to Monday.

Set `SNAPSHOT_INGEST_TOKEN` only in the host secret store. Do not commit it.

## Schema

Every object is strict. Extra keys are invalid. Strings may be empty where a
column was blank. `generatedAt`, `createdAt`, `updatedAt`, and `sentAt` must
parse as a date (`Date.parse`). Amounts are numbers, not currency strings.

Do not send `phone`, `email`, item rows, or per-item finance. Those keys are
rejected. Finance is counts and totals only.

```json
{
  "generatedAt": "2026-11-12T16:00:00.000Z",
  "tasks": [
    {
      "id": "t1",
      "name": "דוגמה",
      "board": "משימות",
      "group": "היום",
      "status": "בעבודה",
      "owner": "",
      "dueDate": "",
      "priority": "",
      "updatedAt": "2026-11-12T16:00:00.000Z"
    }
  ],
  "leads": [
    {
      "id": "l1",
      "name": "דוגמה",
      "board": "לידים",
      "group": "חדש",
      "status": "חדש",
      "source": "",
      "city": "",
      "workType": "",
      "company": "",
      "createdAt": "2026-11-12T16:00:00.000Z",
      "updatedAt": "2026-11-12T16:00:00.000Z"
    }
  ],
  "quotes": [
    {
      "id": "q1",
      "client": "דוגמה",
      "board": "הצעות",
      "status": "נשלח",
      "amount": 0,
      "company": "",
      "sentAt": "2026-11-12T16:00:00.000Z",
      "updatedAt": "2026-11-12T16:00:00.000Z"
    }
  ],
  "financeSummary": {
    "boards": [
      {
        "name": "גבייה",
        "byStatus": [
          { "status": "פתוח", "count": 0, "total": 0 }
        ]
      }
    ]
  }
}
```

Task fields: `id`, `name`, `board`, `group`, `status`, `owner`, `dueDate`, `priority`, `updatedAt`.

Lead fields: `id`, `name`, `board`, `group`, `status`, `source`, `city`, `workType`, `company`, `createdAt`, `updatedAt`.
There is no `phone` field and no `email` field.

Quote fields: `id`, `client`, `board`, `status`, `amount`, `company`, `sentAt`, `updatedAt`.

Finance fields: `financeSummary.boards[].name` and `financeSummary.boards[].byStatus[].status`, `count`, `total`.
`items`, `rows`, and any per-item object are rejected.

Caps: 20000 tasks, 20000 leads, 20000 quotes, 50 finance boards, 100 statuses per board, and 5 MiB for the whole body.

The rows above are a shape example. They are not a customer export.

## What the screens do

When the flag is on and the file parses:

- Tasks shows the snapshot tasks.
- The funnel shows the snapshot leads. Statuses map onto the existing stages. Unknown statuses still appear. Lost rows are left out. Email and phone stay empty.
- Clients shows the snapshot quotes (`client`, `company`, `amount`, `status`).
- Finances shows the status totals only.
- Home replaces the demo finance strip with those totals and adds counts for tasks, leads, and quotes.

Each of those screens shows:

`תמונת מצב מ־Monday · עודכן <date and time in Asia/Jerusalem, he-IL>`

The page help says the numbers are a read-only pull from Monday, refreshed on a schedule, and that edits happen in Monday.
