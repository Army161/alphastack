/**
 * Idempotent schema bootstrap. Runs on `npm run db:init` and lazily on first
 * server boot so the app is never in a "you forgot to migrate" state.
 */
export const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    onboarded_at INTEGER,
    risk_profile TEXT DEFAULT 'balanced',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS module_state (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0,
    last_opened_at INTEGER,
    open_count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quantity REAL NOT NULL,
    cost_basis REAL NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ladder_rungs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    trigger_price REAL NOT NULL,
    sell_pct REAL NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'armed',
    triggered_at INTEGER,
    acted_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    channel TEXT NOT NULL DEFAULT 'inapp',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS exhaustion_snapshots (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    asset TEXT NOT NULL DEFAULT 'BTC',
    score REAL NOT NULL,
    regime TEXT NOT NULL,
    factors TEXT NOT NULL,
    narrative TEXT,
    price REAL NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS radar_snapshots (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    asset TEXT NOT NULL DEFAULT 'BTC',
    crowding_index REAL NOT NULL,
    funding_z REAL NOT NULL,
    oi_usd REAL NOT NULL,
    long_short REAL NOT NULL,
    price REAL NOT NULL,
    levels TEXT NOT NULL,
    liq_24h REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    kol_id TEXT NOT NULL,
    kol_name TEXT NOT NULL,
    asset TEXT NOT NULL,
    direction TEXT NOT NULL,
    target_price REAL,
    deadline TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'medium',
    quote TEXT NOT NULL,
    source_url TEXT,
    source_title TEXT,
    made_on TEXT NOT NULL,
    price_at_call REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_price REAL,
    error_pct REAL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS kols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'youtube',
    followers INTEGER NOT NULL DEFAULT 0,
    avatar_hue INTEGER NOT NULL DEFAULT 200
  )`,
  `CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'ethereum',
    status TEXT NOT NULL DEFAULT 'queued',
    risk_score REAL,
    findings TEXT NOT NULL DEFAULT '[]',
    lines_scanned INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS catalysts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    impact TEXT NOT NULL DEFAULT 'medium',
    direction TEXT NOT NULL DEFAULT 'bullish',
    status TEXT NOT NULL DEFAULT 'scheduled',
    detail TEXT NOT NULL,
    source TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New thread',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    metric TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    hash TEXT NOT NULL,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rungs_user ON ladder_rungs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_exh_day ON exhaustion_snapshots(day)`,
  `CREATE INDEX IF NOT EXISTS idx_radar_ts ON radar_snapshots(ts)`,
  `CREATE INDEX IF NOT EXISTS idx_pred_kol ON predictions(kol_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages(thread_id)`,
];
