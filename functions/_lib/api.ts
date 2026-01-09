import { d1All, d1First, d1Run, type Env } from './d1'

export function sanitizeProfileId(input: unknown): string | null {
  const raw = String(input ?? '').trim()
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)
  return cleaned.length > 0 ? cleaned : null
}

export function sanitizeAnonUserId(input: unknown): string | null {
  const raw = String(input ?? '').trim().toLowerCase()
  return /^[a-f0-9]{32}$/.test(raw) ? raw : null
}

export function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

export async function readJson(request: Request): Promise<any> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function ensureProfile(env: Env, profileId: string): Promise<void> {
  const now = Date.now()
  await d1Run(
    env.DB,
    `INSERT INTO profiles (id, createdAt, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updatedAt = excluded.updatedAt`,
    [profileId, now, now],
  )
}

type ProfileStatsRow = {
  profileId: string
  updatedAt: number
  lastActiveGambleMultiplier: number
  lastPrestige: number
  lastPermLuck: number
  lastCash: number | null
  bestTimeTo1e100Seconds: number | null
}

export function defaultStats() {
  return {
    version: 1 as const,
    updatedAt: Date.now(),
    lastActiveGambleMultiplier: 1,
    lastPrestige: 0,
    lastPermLuck: 0,
    lastCash: 0,
    bestTimeTo1e100Seconds: null as number | null,
  }
}

export async function getStats(env: Env, profileId: string) {
  const row = await d1First<ProfileStatsRow>(env.DB, 'SELECT * FROM profile_stats WHERE profileId = ?', [profileId])
  if (!row) return defaultStats()
  return {
    version: 1 as const,
    updatedAt: row.updatedAt,
    lastActiveGambleMultiplier: row.lastActiveGambleMultiplier,
    lastPrestige: row.lastPrestige,
    lastPermLuck: row.lastPermLuck,
    lastCash: row.lastCash ?? 0,
    bestTimeTo1e100Seconds: row.bestTimeTo1e100Seconds ?? null,
  }
}

export async function upsertStats(env: Env, profileId: string, statsPatch: any) {
  const prev = await getStats(env, profileId)
  const merged = {
    ...prev,
    ...statsPatch,
    version: 1 as const,
    updatedAt: Date.now(),
  }

  await d1Run(
    env.DB,
    `INSERT INTO profile_stats (
        profileId, updatedAt, lastActiveGambleMultiplier, lastPrestige, lastPermLuck, lastCash, bestTimeTo1e100Seconds
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       updatedAt = excluded.updatedAt,
       lastActiveGambleMultiplier = excluded.lastActiveGambleMultiplier,
       lastPrestige = excluded.lastPrestige,
       lastPermLuck = excluded.lastPermLuck,
       lastCash = excluded.lastCash,
       bestTimeTo1e100Seconds = excluded.bestTimeTo1e100Seconds`,
    [
      profileId,
      merged.updatedAt,
      merged.lastActiveGambleMultiplier,
      merged.lastPrestige,
      merged.lastPermLuck,
      merged.lastCash,
      merged.bestTimeTo1e100Seconds,
    ],
  )

  return merged
}

export async function upsertBestTime(env: Env, profileId: string, seconds: number) {
  const prev = await getStats(env, profileId)
  const nextBest = prev.bestTimeTo1e100Seconds == null ? seconds : Math.min(prev.bestTimeTo1e100Seconds, seconds)
  return upsertStats(env, profileId, { bestTimeTo1e100Seconds: nextBest })
}

export async function getSave(env: Env, profileId: string) {
  const row = await d1First<{ stateJson: string }>(env.DB, 'SELECT stateJson FROM game_saves WHERE profileId = ?', [profileId])
  if (!row) return null
  try {
    return JSON.parse(row.stateJson)
  } catch {
    return null
  }
}

export async function upsertSave(env: Env, profileId: string, state: unknown) {
  const now = Date.now()
  await d1Run(
    env.DB,
    `INSERT INTO game_saves (profileId, savedAt, stateJson)
     VALUES (?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       savedAt = excluded.savedAt,
       stateJson = excluded.stateJson`,
    [profileId, now, JSON.stringify(state)],
  )
  return { savedAt: now }
}

export async function addSnapshot(env: Env, profileId: string, state: unknown, cash: number) {
  const now = Date.now()
  await d1Run(
    env.DB,
    `INSERT INTO profile_snapshots (profileId, savedAt, cash, stateJson)
     VALUES (?, ?, ?, ?)`,
    [profileId, now, cash, JSON.stringify(state)],
  )

  await d1Run(
    env.DB,
    `DELETE FROM profile_snapshots
     WHERE id NOT IN (
       SELECT id FROM profile_snapshots WHERE profileId = ? ORDER BY savedAt DESC LIMIT 10
     ) AND profileId = ?`,
    [profileId, profileId],
  )

  return { savedAt: now }
}

function safeParse(jsonText: string): any {
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

export async function getSnapshots(env: Env, profileId: string, limit = 10) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 10))
  const rows = await d1All<{ id: number; savedAt: number; cash: number; stateJson: string }>(
    env.DB,
    `SELECT id, savedAt, cash, stateJson FROM profile_snapshots
     WHERE profileId = ?
     ORDER BY savedAt DESC
     LIMIT ?`,
    [profileId, safeLimit],
  )
  return rows.map((r) => ({ id: r.id, savedAt: r.savedAt, cash: r.cash, state: safeParse(r.stateJson) }))
}

export async function resetProfile(env: Env, profileId: string) {
  await ensureProfile(env, profileId)
  await d1Run(env.DB, 'DELETE FROM game_saves WHERE profileId = ?', [profileId])
  await d1Run(env.DB, 'DELETE FROM profile_stats WHERE profileId = ?', [profileId])
  await d1Run(env.DB, 'DELETE FROM profile_snapshots WHERE profileId = ?', [profileId])
  await d1Run(env.DB, 'DELETE FROM anon_users WHERE user_id = ?', [String(profileId ?? '').trim().toLowerCase()])
  return { ok: true }
}

function sanitizeNickname(input: unknown): string | null {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  const compact = raw.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim()
  const limited = compact.slice(0, 12)
  return limited.length > 0 ? limited : null
}

export async function upsertAnonBestScore(env: Env, userId: string, seconds: number, nickname?: unknown) {
  const cleaned = String(userId ?? '').trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(cleaned)) throw new Error('Invalid userId')
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid score')

  const safeNickname = sanitizeNickname(nickname)

  const now = Date.now()
  const prev = await d1First<{ best_score: number | null; nickname: string | null }>(
    env.DB,
    'SELECT best_score, nickname FROM anon_users WHERE user_id = ?',
    [cleaned],
  )
  const prevBest = prev?.best_score

  if (prevBest != null && typeof prevBest === 'number' && seconds >= prevBest) {
    const prevNick = typeof prev?.nickname === 'string' ? prev.nickname.trim() : ''
    const nextNick = typeof safeNickname === 'string' ? safeNickname.trim() : ''
    if (nextNick && nextNick !== prevNick) {
      await d1Run(env.DB, 'UPDATE anon_users SET nickname = ?, updated_at = ? WHERE user_id = ?', [nextNick, now, cleaned])
    }
    return { ok: true, updated: false, bestScoreSeconds: prevBest, updatedAt: now }
  }

  await d1Run(
    env.DB,
    `INSERT INTO anon_users (user_id, best_score, updated_at, nickname)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       best_score = excluded.best_score,
       updated_at = excluded.updated_at,
       nickname = COALESCE(excluded.nickname, anon_users.nickname)`,
    [cleaned, seconds, now, safeNickname],
  )

  return { ok: true, updated: true, bestScoreSeconds: seconds, updatedAt: now }
}

export async function getAnonRanking(env: Env, limit = 10, offset = 0) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10))
  const safeOffset = Math.max(0, Math.min(100_000, Number(offset) || 0))
  const rows = await d1All<{ user_id: string; nickname: string | null; best_score: number; updated_at: number }>(
    env.DB,
    `SELECT user_id, nickname, best_score, updated_at
     FROM anon_users
     WHERE best_score IS NOT NULL
     ORDER BY best_score ASC, updated_at ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset],
  )

  return rows.map((r) => ({
    userId: r.user_id,
    nickname: r.nickname ?? null,
    bestScoreSeconds: r.best_score,
    updatedAt: r.updated_at,
  }))
}

export async function upsertAnonNickname(env: Env, userId: string, nickname?: unknown) {
  const cleaned = String(userId ?? '').trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(cleaned)) throw new Error('Invalid userId')

  const safeNickname = sanitizeNickname(nickname)
  const now = Date.now()

  await d1Run(
    env.DB,
    `INSERT INTO anon_users (user_id, best_score, updated_at, nickname)
     VALUES (?, NULL, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       nickname = excluded.nickname`,
    [cleaned, now, safeNickname],
  )

  return { ok: true, nickname: safeNickname }
}
