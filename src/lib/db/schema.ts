import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  riskProfile: text("risk_profile").default("balanced"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const moduleState = sqliteTable("module_state", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  lastOpenedAt: integer("last_opened_at", { mode: "timestamp_ms" }),
  openCount: integer("open_count").notNull().default(0),
});

export const holdings = sqliteTable("holdings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: real("quantity").notNull(),
  costBasis: real("cost_basis").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const ladderRungs = sqliteTable("ladder_rungs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  triggerPrice: real("trigger_price").notNull(),
  sellPct: real("sell_pct").notNull(),
  note: text("note"),
  status: text("status").notNull().default("armed"),
  triggeredAt: integer("triggered_at", { mode: "timestamp_ms" }),
  actedAt: integer("acted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
  kind: text("kind").notNull(),
  config: text("config").notNull().default("{}"),
  channel: text("channel").notNull().default("inapp"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: text("module_id").notNull(),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const exhaustionSnapshots = sqliteTable("exhaustion_snapshots", {
  id: text("id").primaryKey(),
  day: text("day").notNull(),
  asset: text("asset").notNull().default("BTC"),
  score: real("score").notNull(),
  regime: text("regime").notNull(),
  factors: text("factors").notNull(),
  narrative: text("narrative"),
  price: real("price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const radarSnapshots = sqliteTable("radar_snapshots", {
  id: text("id").primaryKey(),
  ts: integer("ts", { mode: "timestamp_ms" }).notNull(),
  asset: text("asset").notNull().default("BTC"),
  crowdingIndex: real("crowding_index").notNull(),
  fundingZ: real("funding_z").notNull(),
  oiUsd: real("oi_usd").notNull(),
  longShort: real("long_short").notNull(),
  price: real("price").notNull(),
  levels: text("levels").notNull(),
  liq24h: real("liq_24h").notNull(),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  kolId: text("kol_id").notNull(),
  kolName: text("kol_name").notNull(),
  asset: text("asset").notNull(),
  direction: text("direction").notNull(),
  targetPrice: real("target_price"),
  deadline: text("deadline").notNull(),
  confidence: text("confidence").notNull().default("medium"),
  quote: text("quote").notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  madeOn: text("made_on").notNull(),
  priceAtCall: real("price_at_call").notNull(),
  status: text("status").notNull().default("open"),
  resolvedPrice: real("resolved_price"),
  errorPct: real("error_pct"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const kols = sqliteTable("kols", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull().default("youtube"),
  followers: integer("followers").notNull().default(0),
  avatarHue: integer("avatar_hue").notNull().default(200),
});

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  target: text("target").notNull(),
  chain: text("chain").notNull().default("ethereum"),
  status: text("status").notNull().default("queued"),
  riskScore: real("risk_score"),
  findings: text("findings").notNull().default("[]"),
  linesScanned: integer("lines_scanned").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const catalysts = sqliteTable("catalysts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  date: text("date").notNull(),
  impact: text("impact").notNull().default("medium"),
  direction: text("direction").notNull().default("bullish"),
  status: text("status").notNull().default("scheduled"),
  detail: text("detail").notNull(),
  source: text("source"),
});

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("New thread"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const usage = sqliteTable("usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  day: text("day").notNull(),
  metric: text("metric").notNull(),
  count: integer("count").notNull().default(0),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  hash: text("hash").notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
});
