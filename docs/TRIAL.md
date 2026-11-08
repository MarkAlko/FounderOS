# Trial hosting

This repository cannot open a public URL by itself. Cursor Cloud Agents only forward ports to the agent's own localhost, and that forward dies with the VM. There is no tunnel in this setup.

## Supported way to get an HTTPS address

Use Cursor Apps, private or team visibility, so Cursor sign-in sits in front of the app. In the Agents window, choose Publish. Do not choose Public. Public sharing is off for teams unless an admin turns it on, and this app should not be public while the Next.js advisories below are unfixed.

Publishing is a person action. This agent has no publish API and must not create a hosting account.

If Cursor Apps' disk is ephemeral, demo edits will not survive a restart, because the app stores them in SQLite files. A durable trial needs a long-running Node 22 process and a persistent writable directory for `demo-data/`. Vercel serverless does not provide that. A small VM with a disk does. The parent connects that account. Do not put connector keys on it.

## Process environment

Set these in the host's secret store, not in git:

- `GLADOS_TRIAL=1`
- `GLADOS_PASSWORD_HASH`
- `GLADOS_SESSION_SECRET`
- `GLADOS_HOST` only if the password variables are set. `scripts/serve.mjs` exits otherwise, including when the host is not loopback.
- `GLADOS_DEFAULT_MODE=demo`

`GLADOS_TRIAL=1` forces the demo dataset and ignores `GLADOS_DATA_DIR`. The middleware then allows signed-in reads and demo workflow saves, and refuses sends, key writes, tool runs, cron, and file preview.

Generate the two secret values on the host:

```bash
node scripts/prepare-trial-secret.mjs
```

The command prints only the file path. By default that path is `~/founderos-trial.env`, mode 600. Do not point it at a shared mount that ignores permission bits. Hand the file to the operator outside the repository and outside chat, then delete the copy from the build machine.

## What stays unfixed

`npm audit` still reports a critical Next.js issue whose fix is Next.js 16, and a high Zod issue whose fix is Zod 4. Image optimization is turned off so the remotePatterns DoS path is not enabled. That is not a patch for the RSC advisory. Do not publish this trial on the open internet until those upgrades land. Cursor sign-in reduces who can reach it. It does not remove the bug.
