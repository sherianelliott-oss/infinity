# AGENTS.md

Operational notes for this repo (Next.js digit-trading frontend). The manifests already
describe dependencies and scripts; only the non-obvious setup facts are recorded here.

## Running it (sandbox / Base44)

- `docker compose -f docker-compose.base44.yml up -d` starts the single `web` service
  (`node:22`, Next.js dev server with Turbopack, host port 3000).
- There is **no backend or database**. All state lives in the browser (sessionStorage /
  localStorage) and streams from Deriv's public WebSocket API
  (`wss://api.derivws.com/trading/v1/options/ws/public`). No API key or secret is required
  to render the app or receive live ticks.
- Dependencies are installed **inside the container on startup** (`npm install`) into the
  named volume `node_modules`; the sandbox host has no `node_modules` and should not get one.
  The container healthcheck probes `http://127.0.0.1:3000/` with Node's `fetch`.
- After adding or changing a dependency, `docker compose -f docker-compose.base44.yml restart web`
  (the startup install picks up the new `package.json`).

## Environment variables

- `next dev` does **not** load `.env.production` on its own. The compose file feeds the
  committed public app config (`.env.production`) via `env_file`, followed by
  `/run/base44/app.env` (platform-managed secrets) so dashboard values win.
- `NEXT_PUBLIC_*` values are inlined by Turbopack from `process.env`, so changing them needs a
  container restart, not just a page reload.
- `next.config.js` appends the preview origin (`3000-<BASE44_PUBLIC_HOST_SUFFIX>`) to
  `allowedDevOrigins` **only** when `BASE44_PREVIEW_MODE === '1'`. Both variables must be passed
  into the service's `environment:`. With the flag unset the config keeps Next's default.

## Quirks / gotchas

- `@deriv/core` is a local workspace package (`packages/core`) resolved through the tsconfig
  `paths` alias plus `transpilePackages`; it is not installed from npm.
- `next dev` rewrites `tsconfig.json` (`jsx: react-jsx`, adds `.next/dev/types`) and
  `next-env.d.ts` on first run. That is expected, not a dirty working tree bug.
- `/reports` is auth-gated: an anonymous visitor is redirected to `/`, so it can only be
  exercised with a signed-in session.
- Anonymous browsing is fully functional (live prices, digit stats, payout quotes). The
  "Buy" action and `/reports` require Deriv OAuth login, whose redirect URI must be
  registered for the app id in the Deriv App Registration dashboard. The sandbox preview host
  is normally not registered, so login cannot be completed there.

## How to verify

- `curl -sI http://localhost:3000/` → `200` and HTML referencing the Turbopack dev/HMR client
  (proves live source is served, not a prebuilt bundle).
- Live market data probe inside the container:
  `docker compose -f docker-compose.base44.yml exec -T web node -e "..."` connecting a
  `WebSocket` to the public WS URL and subscribing to `ticks`.
- No test suite is wired up at the repo root (`packages/core` has a `vitest` script but no
  test files); verify through the running UI.
