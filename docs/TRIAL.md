# Trial process

A protected trial is a long-running Node 22 process. This repository does not publish a URL. Do not put connector keys in the environment.

The demo database is disposable. Leave `GLADOS_STORE` unset and the process uses `demo-data/` on its own disk. A missing `glados.db` is rebuilt from the demo company on startup, including a cold start on empty ephemeral storage. No mounted volume is required. Edits are not kept across a fresh disk. If `GLADOS_STORE` is set, it must be a writable directory that is not the real `data/` tree; an existing database there is left in place for that process lifetime. `GLADOS_DATA_DIR` is ignored while `GLADOS_TRIAL=1`.

## Process environment

Set these in the host's secret store, not in git.

- `GLADOS_TRIAL=1`
- `GLADOS_PASSWORD_HASH`
- `GLADOS_SESSION_SECRET`
- `GLADOS_HOST=0.0.0.0` only together with the password variables. `scripts/serve.mjs` exits otherwise.
- `PORT` is the platform port. The start script reads it. Do not hard-code 4100 on the host.
- `GLADOS_COOKIE_SECURE=1` so the session cookie is marked Secure behind HTTPS.
- `GLADOS_DEFAULT_MODE=demo`
- Node 22. `.node-version` is `22.23.4`.

Build: `npm ci && npm run build`
Start: `npm run start` (`node scripts/serve.mjs start`)

Health check: `GET /api/health` returns `{ "ok": true }` with no cookie and no secrets. Every other page redirects to `/login`. Every other API returns 401 until login.

The proxy must send `x-forwarded-proto` and `x-forwarded-host`. Login and CSRF compare the browser origin to those headers.

The middleware allows signed-in reads and demo workflow saves, and refuses sends, key writes, tool runs, cron, and file preview.

## Next.js

The image-optimizer RCEs (GHSA-2464-fhr4-w9xw, GHSA-2xp9-vwfh-vxw4) affect Next.js 14.2.35. The patched maintenance line is 15.5.28 and later. This tree runs 15.5.29. The `use cache` typed-array RCE (GHSA-673q-mjm6-r5xr) applies only to Next.js 16.0.0 through 16.4.0, which this app does not use. Image optimization stays off. That is extra isolation, not the patch.

Zod 3 still has a high advisory about memory use on oversized collections. Vitest and tinypool critical advisories are dev-only and are not started by `npm run start`. Neither `npm audit` nor this upgrade means the process is globally secure.

Generate the secret values on the host:

```bash
node scripts/prepare-trial-secret.mjs
```

The command prints only the file path. By default that path is `~/founderos-trial.env`, mode 600. Do not point it at a shared mount that ignores permission bits. Hand the file to the operator outside the repository and outside chat, then delete the copy from the build machine.

## What stays unfixed

Zod 3 can exhaust memory while validating a huge constrained collection. A password does not close that. Vitest 2 and tinypool have critical advisories that matter only if the Vitest UI server is running. The production start command does not run them. Do not treat a quiet `npm audit` as a security review.
