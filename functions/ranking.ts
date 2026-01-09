import { json, isPreflight } from './_lib/http'
import { d1All, type Env } from './_lib/d1'

async function getAnonRanking(env: Env, limit = 10) {
  const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 5000))
  const rows = await d1All<{ user_id: string; best_score: number; updated_at: number }>(
    env.DB,
    `SELECT user_id, best_score, updated_at
     FROM anon_users
     WHERE best_score IS NOT NULL
     ORDER BY best_score ASC, updated_at ASC
     LIMIT ?`,
    [safeLimit],
  )

  return rows.map((r) => ({
    userId: r.user_id,
    bestScoreSeconds: r.best_score,
    updatedAt: r.updated_at,
  }))
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  if (isPreflight(request)) return new Response(null, { status: 204 })

  const url = new URL(request.url)
  if (request.method.toUpperCase() !== 'GET') return json({ error: 'Not found' }, { status: 404 })

  const limitParam = url.searchParams.get('limit')
  const limit = limitParam === null ? 5000 : Math.max(1, Math.min(5000, Number(limitParam) || 5000))
  const ranking = await getAnonRanking(env, limit)
  return json({ ranking })
}
