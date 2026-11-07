# Next integrations

This iteration does not add Monday, and it does not pretend calendar or any other connector is connected.

A later read-only stage can add them only if all of the following hold:

- Tokens and API keys stay on the server (`lib/creds.ts` / `.env.local`). The browser never receives the secret.
- The first screen with no key is an explicit not-configured state and a setup link. A missing key is never rendered as Connected.
- The first operations are reads: calendar events, Monday board items. No sends, no writes, no webhooks that post outward.
- Demo or filming mode may show labeled sample rows. It must not flip the connector state to connected.
- Google Calendar already has a connector id (`calendar`). It stays not configured until real CalDAV or API credentials exist. Monday has no connector in this increment.
