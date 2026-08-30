# Deploying AlphaStack

The repo is deploy-ready: `vercel.json` is committed, the build is verified, and the
app boots with **zero required configuration**. Everything below is about making
state persist and unlocking the optional tiers.

Repository: <https://github.com/Army161/alphastack> (private)

---

## 1. Connect the repo to Vercel (~2 minutes)

Go to <https://vercel.com/new>, pick **Army161/alphastack**, and click Deploy.
Vercel auto-detects Next.js; `vercel.json` supplies the rest.

Or, from this directory:

```bash
npx vercel login && npx vercel --prod
```

> **Why this step is manual.** Deploying requires authenticating as you. The Vercel
> MCP token available in this environment has read scope but not
> `project:create`, and Vercel's anonymous "temporary deployment" builder fails to
> package Next.js serverless functions. Neither is something to work around —
> logging in with your own account is the correct path.

---

## 2. Environment variables

Set these in **Project → Settings → Environment Variables**.

### Required for persistence

| Variable | Value | Why |
|---|---|---|
| `AUTH_SECRET` | 32+ random bytes | Signs session cookies. Generate with the command below. |
| `DATABASE_URL` | `libsql://<db>.turso.io` | Serverless filesystems are read-only and ephemeral. |
| `DATABASE_AUTH_TOKEN` | Turso token | Paired with the URL above. |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Without `DATABASE_URL`** the app still runs — every module, the agent, the REST
API and the MCP endpoint are stateless and work normally. Only accounts, saved
positions and alert history are affected, and the Launchpad shows an explicit
banner saying so. Nothing fails silently.

Turso setup (free tier is ample):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create alphastack
turso db show alphastack --url          # -> DATABASE_URL
turso db tokens create alphastack       # -> DATABASE_AUTH_TOKEN
```

The schema bootstraps itself on first request — no migration step.

### Optional

| Variable | Effect if unset |
|---|---|
| `ANTHROPIC_API_KEY` | ChatOS runs in local reasoning mode: intent routed to the real engines, results formatted directly. Setting it enables multi-tool LLM synthesis. |
| `COINGECKO_API_KEY` | Uses the keyless public tier (~10 req/min). The built-in rate limiter and circuit breaker keep it inside the budget; a Pro key removes the constraint. |
| `COINGLASS_API_KEY` | Liquidation totals stay modelled and are labelled `LIQ · MODELLED` in the Radar UI. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_DESK` | Upgrades run in local evaluation mode and grant the plan without payment. |
| `ENABLE_LIVE_DATA` | Live by default. Set to `0` to pin the platform to the deterministic model. |

---

## 3. Stripe (only if you want real billing)

1. Create two recurring products — Operator ($49/mo) and Desk ($299/mo).
2. Copy each price ID into `STRIPE_PRICE_PRO` / `STRIPE_PRICE_DESK`.
3. Add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` subscribed to
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

The webhook verifies signatures and returns 501 until both keys are present.

---

## 4. Post-deploy verification

```bash
curl https://<your-domain>/api/health
```

Expect `"status": "ok"` and `"assetsPricedLive": 13`. The response lists every
provider with latency, plus rate-limiter state.

```bash
curl -X POST https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expect 14 tools.

Then connect an MCP client:

```bash
claude mcp add --transport http alphastack https://<your-domain>/api/mcp
```

---

## Security

`npm audit` reports **0 vulnerabilities**. Two things get it there:

- `drizzle-kit` was removed — it pulled a vulnerable `esbuild` and the project
  never used it. Schema creation runs through `scripts/db-init.mjs`, and the app
  also bootstraps its own schema lazily on first request.
- `postcss` and `sharp` are pinned forward via npm `overrides`, patching the
  transitive advisories Next 15.5 would otherwise carry.

Re-check after any dependency bump:

```bash
npm audit
```

---

## Notes on the stack

**Next.js is pinned to 15.5.24, not 16.x.** Next 16 emits a `.segments` build
output that Vercel's builder could not package (`ENOENT … __PAGE__.segment.rsc.func`),
reproduced on both 16.3.3 and 16.2.12. 15.5 is the current stable line, builds
clean, and every feature in this app works on it. Revisit 16 once the builder
catches up — the codebase has no 15-specific APIs.

**Region** is pinned to `iad1` in `vercel.json`, close to the US data providers.
Change it if your users are elsewhere.

**Rate limits.** The free CoinGecko tier is the binding constraint. The app fetches
one batched quote call for all 13 assets and only pulls per-asset history on
focused views (≤3 symbols), with a 12-hour history TTL, a 2.5s inter-call floor,
and a circuit breaker that backs off on 429 instead of hammering. Broader views
use live prices with modelled historical paths, labelled as such per symbol.
