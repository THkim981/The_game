import { json, isPreflight } from './_lib/http'
import { d1First, d1Run, type Env } from './_lib/d1'

function sanitizeAnonUserId(input: unknown): string | null {
  const raw = String(input ?? '').trim().toLowerCase()
  return /^[a-f0-9]{32}$/.test(raw) ? raw : null
}

async function readJson(request: Request): Promise<any> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function sanitizeNickname(input: unknown): string | null {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  const compact = raw.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim()
  const limited = compact.slice(0, 12)
  return limited.length > 0 ? limited : null
}

async function upsertAnonBestScore(env: Env, userId: string, seconds: number, nickname?: unknown) {
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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  if (isPreflight(request)) return new Response(null, { status: 204 })

  if (request.method.toUpperCase() !== 'POST') return json({ error: 'Not found' }, { status: 404 })

  const body = await readJson(request)
  const userId = sanitizeAnonUserId(body?.userId)
  const score = body?.score
  const nickname = body?.nickname

  if (!userId) return json({ error: 'Invalid userId' }, { status: 400 })
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return json({ error: 'Invalid score' }, { status: 400 })
  }

  try {
    const result = await upsertAnonBestScore(env, userId, score, nickname)
    return json({ ok: true, bestScoreSeconds: result.bestScoreSeconds })
  } catch (err: any) {
    return json({ error: err?.message || 'Invalid score' }, { status: 400 })
  }
}
