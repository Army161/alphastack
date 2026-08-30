# AlphaStack — Crypto Intelligence OS

An agent-first SaaS platform. Seven crypto intelligence products in one workspace,
each with its own dashboard, controls and alerts, all driveable by a single agent
that has typed tool access to every engine — and served over MCP so Claude Desktop
and Claude Code get the identical surface.

Every module was derived from a specific analytical framework, then implemented as a
real scoring engine rather than a chart wrapper.

---

## The seven modules

| Module | What it is | The core idea |
|---|---|---|
| **Exhaustion** | Seller Exhaustion Score (SES) | Six weighted capitulation factors, z-scored, plus a whale-absorption override: when the largest known holder distributes and price *fails* to make a lower low, the market has proven it can absorb known supply. |
| **Radar** | Leverage crowding & liquidation levels | Turns "stay off leverage" into a measurable system — crowding index, funding stress, magnet levels, cascade sizing, four alert triggers. |
| **Terminal** | Thesis-fit screener | Grades every asset 0–100 against five weighted selection criteria (ETF rail, regulatory clarity, policy engagement, real volume, survivorship floor). Answers "does this belong in the basket", not "did it pump". |
| **Ladder** | Exit rules engine | Executes the rules you wrote when calm, at the moment you are not. Price rungs, Fed-pivot macro override, drift bands, and a discipline score tracking acted-vs-skipped. |
| **Sentinel** | Solidity security scanner | 15 exploit-class rules with guard detection, then an adversarial pass that tries to *refute* each finding. Only survivors ship — refuted candidates stay visible. |
| **Verdict** | KOL accountability ledger | Every dated, numeric public call — extracted, stored, auto-resolved against price. Measures calibration, not just accuracy. Includes a live transcript extractor. |
| **Catalyst** | Event calendar & macro regime | Dated binary events scored for impact, direction and time-decay into one net skew, plus the Fed pivot monitor. |

Plus **ChatOS** — the agent layer with 14 tools across all seven modules, and a
**Launchpad** portfolio dashboard where every card shows a live metric and links
straight into its product.

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArmy161%2Falphastack&env=AUTH_SECRET&envDescription=Session%20signing%20secret%20-%2032%2B%20random%20bytes&project-name=alphastack&repository-name=alphastack)

The app boots with **zero required configuration** — every module, the agent, the
REST API and the MCP endpoint are stateless. Add `DATABASE_URL` (Turso) to make
accounts and saved positions persist. Full checklist in **[DEPLOY.md](DEPLOY.md)**.

## Quick start

```bash
npm install
cp .env.example .env.local     # generate an AUTH_SECRET
npm run db:init                # optional — the app also bootstraps lazily
npm run dev
```

Open <http://localhost:3000> and click **Try the live demo** — a pre-seeded account
with a portfolio, exit ladder and alert history, on the Operator plan.

Everything works with **zero configuration**, including live market data.

## Live data

Six providers, all keyless on their free tiers, each degrading independently — a
dead upstream downgrades one block and is labelled in the UI, never taking the
app down.

| Provider | Supplies |
|---|---|
| **CoinGecko** | Spot prices, market caps, 24h change, daily history |
| **OKX** | Open interest, funding rate, long/short account ratio |
| **Hyperliquid** | Perp funding, OI and oracle price — native coverage of HYPE |
| **FRED** | Effective fed funds + 2y/10y Treasuries, driving the macro regime |
| **DefiLlama** | Chain TVL |
| **Alternative.me** | Fear & Greed index |

Every figure carries **provenance**: the UI shows `PRICE · COINGECKO` or
`LIQ · MODELLED` next to the numbers, and `/api/health` reports provider status,
latency and rate-limiter state.

Engineering that makes free tiers viable: a TTL cache with stale-while-revalidate
and single-flight dedup, a per-host rate limiter with an exponential-backoff
circuit breaker, one batched quote call for the whole universe, and per-asset
history fetched only on focused views with a 12-hour TTL.

Optional upgrades:

| Env var | Effect when set |
|---|---|
| `ANTHROPIC_API_KEY` | ChatOS switches from local intent-routing to full multi-tool LLM synthesis |
| `DATABASE_URL` | Persistent storage (Turso libSQL). Without it on serverless, state is per-instance |
| `COINGECKO_API_KEY` | Pro tier — removes the ~10 req/min rate limit |
| `COINGLASS_API_KEY` | Real liquidation totals instead of modelled |
| `STRIPE_SECRET_KEY` + price IDs | Real checkout and subscription webhooks instead of local plan granting |
| `ENABLE_LIVE_DATA=0` | Pins the platform to the deterministic model |

---

## Stack

- **Next.js 15.5** (App Router, RSC, server actions) · **React 19** · **TypeScript**
- **Tailwind CSS v4** with a token-based dark design system
- **Drizzle ORM** over **libSQL/SQLite** — a local file by default, swap `DATABASE_URL` for Turso in production
- **jose** + **bcryptjs** for cookie sessions and password hashing (no third-party auth dependency)
- **Stripe** for subscriptions · **Recharts** for charts · **Anthropic SDK** for the agent
- **@modelcontextprotocol/sdk** for the stdio MCP bridge

---

## Architecture

```
src/
  lib/
    modules/          Seven scoring engines — pure functions, no I/O
      exhaustion.ts   SES: 6 factors + whale-absorption override
      radar.ts        Crowding index + magnet-level clustering
      terminal.ts     Thesis-fit scoring + semantic layer
      ladder.ts       Rules engine + macro regime + drift bands
      sentinel.ts     15-rule corpus + adversarial verification
      verdict.ts      Prediction resolution + calibration + extractor
      catalyst.ts     Impact/decay-weighted event scoring
      registry.ts     Module metadata driving nav, Launchpad and gating
    agent/
      tools.ts        14 typed tool definitions — ONE source of truth
      runtime.ts      Anthropic tool-calling loop + deterministic fallback
    data/
      market.ts       Live-first market context, model fallback, provenance
      live.ts         Orchestrates the shared snapshot across providers
      cache.ts        TTL cache: stale-while-revalidate + single-flight
      universe.ts     Tracked assets and cycle reference levels
      providers/      coingecko · derivatives (OKX/Hyperliquid) · macro (FRED,
                      DefiLlama, Fear&Greed) · limiter (rate limit + breaker)
    db/               Drizzle schema, client, idempotent DDL bootstrap
    auth/             Session JWT, server actions, demo seeding
    billing/plans.ts  Plan definitions and limit enforcement
  app/
    (app)/            Authenticated workspace — one route per module
    api/
      agent/chat      NDJSON streaming agent endpoint
      v1/tools        REST: GET catalogue, POST invoke (Bearer or session)
      mcp             JSON-RPC 2.0 Model Context Protocol endpoint
      stripe/*        Checkout session + signed webhook
mcp-server/index.mjs  stdio MCP bridge for Claude Desktop / Claude Code
```

**The single-definition principle.** `lib/agent/tools.ts` defines all 14 tools once.
ChatOS, the REST API and the MCP server all consume that one definition, so the
agent's capabilities and the platform's capabilities can never drift apart.

**No free-form SQL.** The agent calls typed functions over a fixed semantic layer.
It cannot invent a price because it has to call `get_quote` to know one — which is
what makes every answer reproducible and citable.

---

## Connecting an MCP client

Claude Code:

```bash
claude mcp add --transport http alphastack http://localhost:3000/api/mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "alphastack": {
      "command": "node",
      "args": ["/abs/path/to/alphastack/mcp-server/index.mjs"],
      "env": { "ALPHASTACK_URL": "http://localhost:3000" }
    }
  }
}
```

Raw JSON-RPC:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

REST:

```bash
curl -X POST http://localhost:3000/api/v1/tools \
  -H "Authorization: Bearer ask_live_..." \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_exhaustion_score","input":{"asset":"BTC"}}'
```

---

## Monetisation

Three plans (`lib/billing/plans.ts`), enforced server-side:

- **Scout — free.** All seven modules visible but throttled: 48h-delayed scores, top-5 universe, 3 scans/month, 20 agent messages/day. The free tier's job is to prove the models work.
- **Operator — $49/mo.** Live everything, full universe, unlimited scans and rungs, the transcript extractor, unlimited alerts, 2 API keys and MCP access.
- **Desk — $299/mo.** Continuous contract monitoring via CI webhook, 5 seats, full data export, 100k API calls, custom KOL lists, Slack/Discord/Telegram routing.

Four monetisation surfaces are wired: the freemium gate, per-plan usage metering,
API/MCP access sold as a tier, and the deliberately public KOL leaderboard as a
zero-marginal-cost acquisition funnel.

Without Stripe keys the checkout route runs in local evaluation mode and grants the
plan directly, so the entire gated surface can be exercised end to end.

---

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run db:init     # apply schema (idempotent)
npm run mcp         # run the stdio MCP bridge
```

---

## Disclosure

AlphaStack is an analysis and research tool. It does not provide financial,
investment or trading advice, and nothing it outputs is a recommendation to buy or
sell any asset. The Ladder module is a rules engine that executes only rules the
user defines; it never places orders and is not connected to any exchange.

Live market data is on by default. Where a provider cannot supply a figure the
platform falls back to a **deterministic model** and labels it `MODELLED` in the
UI rather than presenting it as real. Two figures are always estimates and say so:
liquidation totals without a Coinglass key, and market-wide open interest, which
is grossed up from a single venue's book by that venue's approximate share.
