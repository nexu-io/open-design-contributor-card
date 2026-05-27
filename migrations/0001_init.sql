CREATE TABLE IF NOT EXISTS contributors (
  login TEXT PRIMARY KEY,
  avatar_url TEXT,
  last_announced_tier TEXT NOT NULL,
  last_known_score INTEGER NOT NULL,
  last_checked_at TEXT NOT NULL,
  last_announced_at TEXT,
  score_version TEXT NOT NULL,
  last_rank INTEGER NOT NULL DEFAULT 0,
  last_total_contributors INTEGER NOT NULL DEFAULT 0,
  last_vaunt_score INTEGER,
  last_weighted_score INTEGER NOT NULL DEFAULT 0,
  last_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_events (
  event_id TEXT PRIMARY KEY,
  delivery_id TEXT,
  recipient_login TEXT NOT NULL,
  tier_key TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  scenario TEXT NOT NULL,
  surface TEXT NOT NULL,
  thread_number INTEGER,
  thread_url TEXT,
  comment_url TEXT,
  card_object_key TEXT NOT NULL,
  share_url TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  total_contributors INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_events_recipient_created_at
  ON card_events(recipient_login, created_at DESC);

CREATE TABLE IF NOT EXISTS ingestion_events (
  delivery_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  action TEXT,
  actor_login TEXT,
  outcome TEXT NOT NULL,
  card_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS share_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  lang TEXT,
  destination TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_clicks_event_kind_created_at
  ON share_clicks(event_id, kind, created_at DESC);
