-- Extend contributors with profile fields backfilled from open-design/data/contributors.json.
-- These columns are not yet read by the Worker runtime; they are preserved for future use.
ALTER TABLE contributors ADD COLUMN prs_merged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN reviews INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN issues_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN discussions_answered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN streak_weeks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN last_active_at TEXT;
ALTER TABLE contributors ADD COLUMN founding INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contributors ADD COLUMN tier_history_json TEXT;
ALTER TABLE contributors ADD COLUMN profile_generated_at TEXT;

-- Legacy event log preserved verbatim from open-design/data/events.jsonl. Kept separate from
-- card_events to avoid polluting the dedupe/scenario semantics of the new webhook -> card path.
CREATE TABLE IF NOT EXISTS legacy_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  type TEXT NOT NULL,
  user_login TEXT NOT NULL,
  issue_number INTEGER,
  pr_number INTEGER,
  delta INTEGER NOT NULL DEFAULT 0,
  promoted_tier TEXT,
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legacy_events_user_ts
  ON legacy_events(user_login, ts DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_events_type_ts
  ON legacy_events(type, ts DESC);
