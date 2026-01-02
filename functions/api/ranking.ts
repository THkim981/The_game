import { json, isPreflight } from '../_lib/http'
import type { Env } from '../_lib/d1'
import { getAnonRanking } from '../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'GET') return json({ error: 'Not found' }, { status: 404 })

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') ?? 10)))
  const ranking = await getAnonRanking(env, limit)
  return json({ ranking })
}
