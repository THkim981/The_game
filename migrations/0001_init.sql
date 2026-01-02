-- D1 migration: initial schema (derived from server/db.cjs)
-- Notes:
-- - D1 is SQLite-compatible but managed; file-level pragmas like WAL are not applicable.
-- - Foreign keys are supported; keep them for data integrity.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_saves (
  profileId TEXT PRIMARY KEY,
  savedAt INTEGER NOT NULL,
  stateJson TEXT NOT NULL,
  FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profile_stats (
  profileId TEXT PRIMARY KEY,
  updatedAt INTEGER NOT NULL,
  lastActiveGambleMultiplier REAL NOT NULL,
  lastPrestige REAL NOT NULL,
  lastPermLuck INTEGER NOT NULL,
  lastCash REAL NOT NULL DEFAULT 0,
  bestTimeTo1e100Seconds REAL,
  FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profile_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profileId TEXT NOT NULL,
  savedAt INTEGER NOT NULL,
  cash REAL NOT NULL DEFAULT 0,
  stateJson TEXT NOT NULL,
  FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anon_users (
  user_id TEXT PRIMARY KEY,
  best_score REAL,
  updated_at INTEGER NOT NULL
);

-- Helpful indexes (safe in D1). Keep minimal.
CREATE INDEX IF NOT EXISTS idx_snapshots_profile_savedAt ON profile_snapshots(profileId, savedAt DESC);
CREATE INDEX IF NOT EXISTS idx_anon_users_best_score ON anon_users(best_score, updated_at);
