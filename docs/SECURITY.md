# Security notes (2026-11-07)

This is not a claim that the app is secure. `npm audit` is one input. It does not review auth logic, and a clean audit would not mean the product is safe to expose.

## What was checked

- `scripts/serve.mjs` still refuses a non-loopback `GLADOS_HOST` when no operator password is set. `lib/auth-gate.ts` refuses a non-loopback Host in that same state (`tests/auth-gate.test.ts`). This iteration did not bind the server beyond `127.0.0.1` and did not deploy it.
- `npm audit fix` (no `--force`) updated the lockfile only. The reported set went from 21 findings (3 critical, 9 high, 6 moderate, 3 low) to 10 (3 critical, 4 high, 3 moderate).

## Unresolved

These remain because the fix npm offers is a breaking upgrade. They were not force-installed.

| Package | Severity | Why it is still open |
| --- | --- | --- |
| next | critical | Fix is Next.js 16.4.5, a major upgrade. Advisories include Image Optimizer DoS via `remotePatterns` and RSC request deserialization DoS. |
| postcss (nested under next) | high | Same Next 16 upgrade. CSS stringify and source-map path issues. |
| vitest / tinypool | critical | Fix is Vitest 5.1.0. Tinypool prototype-pollution gadgets; Vitest UI file read when the UI server is listening. The UI server is not started here. |
| vite (via vitest) | high | Same Vitest 5 upgrade. |
| zod | high | Fix is Zod 4.6.7. The app is on Zod 3. Memory exhaustion while validating oversized constrained collections. |

Transitive highs that `npm audit fix` could move without a major bump (axios, browserslist, follow-redirects, nodemailer, source-map-js, undici) were included in the lockfile update. Re-run `npm audit` before treating that list as current.

## Not done

No penetration test, no dependency review beyond the audit report, no password was set, and no network exposure was enabled.
