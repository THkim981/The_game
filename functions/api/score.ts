import { json, isPreflight } from '../_lib/http'
import type { Env } from '../_lib/d1'
import { readJson, sanitizeAnonUserId, upsertAnonBestScore } from '../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'POST') return json({ error: 'Not found' }, { status: 404 })

  const body = await readJson(request)
  const userId = sanitizeAnonUserId(body?.userId)
  const score = body?.score

  if (!userId) return json({ error: 'Invalid userId' }, { status: 400 })
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return json({ error: 'Invalid score' }, { status: 400 })
  }

  // meta fields are accepted for forward-compatibility but not persisted (matches previous server behavior).
  try {
    const result = await upsertAnonBestScore(env, userId, score)
    return json({ ok: true, bestScoreSeconds: result.bestScoreSeconds })
  } catch (err: any) {
    return json({ error: err?.message || 'Invalid score' }, { status: 400 })
  }
}
