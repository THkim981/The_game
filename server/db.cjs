const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const Database = require('better-sqlite3')

function resolveDbPath() {
  const explicitPath = process.env.SQLITE_PATH || process.env.DB_PATH
  if (explicitPath && String(explicitPath).trim().length > 0) {
    return path.resolve(String(explicitPath).trim())
  }

  const explicitDir = process.env.SQLITE_DIR || process.env.DATA_DIR
  const dataDir = explicitDir && String(explicitDir).trim().length > 0
    ? path.resolve(String(explicitDir).trim())
    : path.join(process.cwd(), 'server', 'data')

  return path.join(dataDir, 'app.sqlite')
}

const dbPath = resolveDbPath()
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    salt TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    userId INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
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
    lastCash REAL NOT NULL,
    bestTimeTo1e100Seconds REAL,
    FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
  );

    CREATE TABLE IF NOT EXISTS profile_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileId TEXT NOT NULL,
      savedAt INTEGER NOT NULL,
      cash REAL NOT NULL,
      stateJson TEXT NOT NULL,
      FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
    );

  CREATE TABLE IF NOT EXISTS anon_users (
    user_id TEXT PRIMARY KEY,
    best_score REAL,
    updated_at INTEGER NOT NULL
  );
`)

// Lightweight migrations for existing local DB files
const profileStatsCols = db.prepare('PRAGMA table_info(profile_stats)').all().map((c) => c.name)
if (!profileStatsCols.includes('lastCash')) {
  db.exec('ALTER TABLE profile_stats ADD COLUMN lastCash REAL NOT NULL DEFAULT 0')
}
  const snapshotCols = db.prepare('PRAGMA table_info(profile_snapshots)').all().map((c) => c.name)
  if (!snapshotCols.length) {
    db.exec(
      `CREATE TABLE IF NOT EXISTS profile_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profileId TEXT NOT NULL,
        savedAt INTEGER NOT NULL,
        cash REAL NOT NULL,
        stateJson TEXT NOT NULL,
        FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE CASCADE
      );`
    )
  } else {
    if (!snapshotCols.includes('cash')) {
      db.exec('ALTER TABLE profile_snapshots ADD COLUMN cash REAL NOT NULL DEFAULT 0')
    }
  }

function ensureProfile(profileId) {
  const now = Date.now()
  const existing = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
  if (!existing) {
    db.prepare('INSERT INTO profiles (id, createdAt, updatedAt) VALUES (?, ?, ?)').run(profileId, now, now)
  } else {
    db.prepare('UPDATE profiles SET updatedAt = ? WHERE id = ?').run(now, profileId)
  }
}

function getStats(profileId) {
  const row = db.prepare('SELECT * FROM profile_stats WHERE profileId = ?').get(profileId)
  if (!row) {
    return {
      version: 1,
      updatedAt: Date.now(),
      lastActiveGambleMultiplier: 1,
      lastPrestige: 0,
      lastPermLuck: 0,
      lastCash: 0,
      bestTimeTo1e100Seconds: null,
    }
  }
  return {
    version: 1,
    updatedAt: row.updatedAt,
    lastActiveGambleMultiplier: row.lastActiveGambleMultiplier,
    lastPrestige: row.lastPrestige,
    lastPermLuck: row.lastPermLuck,
    lastCash: row.lastCash ?? 0,
    bestTimeTo1e100Seconds: row.bestTimeTo1e100Seconds ?? null,
  }
}

function upsertStats(profileId, stats) {
  const prev = getStats(profileId)
  const merged = {
    ...prev,
    ...stats,
    version: 1,
    updatedAt: Date.now(),
  }

  db.prepare(
    `INSERT INTO profile_stats (profileId, updatedAt, lastActiveGambleMultiplier, lastPrestige, lastPermLuck, lastCash, bestTimeTo1e100Seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       updatedAt = excluded.updatedAt,
       lastActiveGambleMultiplier = excluded.lastActiveGambleMultiplier,
       lastPrestige = excluded.lastPrestige,
       lastPermLuck = excluded.lastPermLuck,
       lastCash = excluded.lastCash,
       bestTimeTo1e100Seconds = excluded.bestTimeTo1e100Seconds`
  ).run(
    profileId,
    merged.updatedAt,
    merged.lastActiveGambleMultiplier,
    merged.lastPrestige,
    merged.lastPermLuck,
    merged.lastCash,
    merged.bestTimeTo1e100Seconds,
  )

  return merged
}

function upsertBestTime(profileId, seconds) {
  const prev = getStats(profileId)
  const nextBest = prev.bestTimeTo1e100Seconds == null ? seconds : Math.min(prev.bestTimeTo1e100Seconds, seconds)
  return upsertStats(profileId, { bestTimeTo1e100Seconds: nextBest })
}

function getSave(profileId) {
  const row = db.prepare('SELECT stateJson FROM game_saves WHERE profileId = ?').get(profileId)
  if (!row) return null
  try {
    return JSON.parse(row.stateJson)
  } catch {
    return null
  }
}

function upsertSave(profileId, state) {
  const now = Date.now()
  db.prepare(
    `INSERT INTO game_saves (profileId, savedAt, stateJson)
     VALUES (?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       savedAt = excluded.savedAt,
       stateJson = excluded.stateJson`
  ).run(profileId, now, JSON.stringify(state))
  return { savedAt: now }
}

function addSnapshot(profileId, state, cash) {
  const now = Date.now()
  db.prepare(
    `INSERT INTO profile_snapshots (profileId, savedAt, cash, stateJson)
     VALUES (?, ?, ?, ?)`
  ).run(profileId, now, cash, JSON.stringify(state))

  // keep only latest 10 per profile
  db.prepare(
    `DELETE FROM profile_snapshots
     WHERE id NOT IN (
       SELECT id FROM profile_snapshots WHERE profileId = ? ORDER BY savedAt DESC LIMIT 10
     ) AND profileId = ?`
  ).run(profileId, profileId)

  return { savedAt: now }
}

function getSnapshots(profileId, limit = 10) {
  const rows = db.prepare(
    `SELECT id, savedAt, cash, stateJson FROM profile_snapshots
     WHERE profileId = ?
     ORDER BY savedAt DESC
     LIMIT ?`
  ).all(profileId, limit)
  return rows.map((row) => ({
    id: row.id,
    savedAt: row.savedAt,
    cash: row.cash,
    state: safeParse(row.stateJson),
  }))
}

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function registerUser(username, password) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) throw new Error('Username already exists')

  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)
  const now = Date.now()

  const result = db.prepare(
    'INSERT INTO users (username, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?)'
  ).run(username, passwordHash, salt, now)

  return { userId: result.lastInsertRowid, username }
}

function loginUser(username, password) {
  const user = db.prepare('SELECT id, username, passwordHash, salt FROM users WHERE username = ?').get(username)
  if (!user) throw new Error('Invalid username or password')

  const hash = hashPassword(password, user.salt)
  if (hash !== user.passwordHash) throw new Error('Invalid username or password')

  const token = generateToken()
  const now = Date.now()
  const expiresAt = now + 30 * 365 * 24 * 60 * 60 * 1000 // 30 years

  db.prepare('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)').run(
    token,
    user.id,
    now,
    expiresAt,
  )

  // Create/link profile
  const profileId = `user_${user.id}`
  const existingProfile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
  if (!existingProfile) {
    db.prepare('INSERT INTO profiles (id, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run(
      profileId,
      user.id,
      now,
      now,
    )
  } else {
    db.prepare('UPDATE profiles SET userId = ?, updatedAt = ? WHERE id = ?').run(user.id, now, profileId)
  }

  return { token, userId: user.id, username: user.username, profileId }
}

function verifySession(token) {
  const session = db.prepare(
    `SELECT s.userId, s.expiresAt, u.username
     FROM sessions s
     JOIN users u ON s.userId = u.id
     WHERE s.token = ?`,
  ).get(token)

  if (!session) return null
  if (session.expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }

  const profileId = `user_${session.userId}`
  return { userId: session.userId, username: session.username, profileId }
}

function logoutSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

function upsertAnonBestScore(userId, seconds) {
  const cleaned = String(userId ?? '').trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(cleaned)) throw new Error('Invalid userId')
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid score')

  const now = Date.now()
  const prev = db.prepare('SELECT best_score FROM anon_users WHERE user_id = ?').get(cleaned)
  const prevBest = prev?.best_score

  // Lower time is better.
  if (prevBest != null && typeof prevBest === 'number' && seconds >= prevBest) {
    return { ok: true, updated: false, bestScoreSeconds: prevBest, updatedAt: now }
  }

  db.prepare(
    `INSERT INTO anon_users (user_id, best_score, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       best_score = excluded.best_score,
       updated_at = excluded.updated_at`
  ).run(cleaned, seconds, now)

  return { ok: true, updated: true, bestScoreSeconds: seconds, updatedAt: now }
}

function getAnonRanking(limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10))
  const rows = db.prepare(
    `SELECT user_id, best_score, updated_at
     FROM anon_users
     WHERE best_score IS NOT NULL
     ORDER BY best_score ASC, updated_at ASC
     LIMIT ?`
  ).all(safeLimit)

  return rows.map((r) => ({
    userId: r.user_id,
    bestScoreSeconds: r.best_score,
    updatedAt: r.updated_at,
  }))
}

function resetProfile(profileId) {
  // Keep the profile row but clear all persisted progress/records for a fresh start.
  ensureProfile(profileId)

  db.prepare('DELETE FROM game_saves WHERE profileId = ?').run(profileId)
  db.prepare('DELETE FROM profile_stats WHERE profileId = ?').run(profileId)
  db.prepare('DELETE FROM profile_snapshots WHERE profileId = ?').run(profileId)

  // If profileId is also an anon userId, clear ranking entry too.
  db.prepare('DELETE FROM anon_users WHERE user_id = ?').run(String(profileId ?? '').trim().toLowerCase())

  return { ok: true }
}

module.exports = {
  db,
  ensureProfile,
  getStats,
  upsertStats,
  upsertBestTime,
  getSave,
  upsertSave,
  addSnapshot,
  getSnapshots,
  upsertAnonBestScore,
  getAnonRanking,
  resetProfile,
  registerUser,
  loginUser,
  verifySession,
  logoutSession,
}
