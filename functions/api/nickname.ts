import { json, isPreflight } from '../_lib/http'
import type { Env } from '../_lib/d1'
import { readJson, sanitizeAnonUserId, upsertAnonNickname } from '../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'POST') return json({ error: 'Not found' }, { status: 404 })

  const body = await readJson(request)
  const userId = sanitizeAnonUserId(body?.userId)

  if (!userId) return json({ error: 'Invalid userId' }, { status: 400 })

  try {
    const result = await upsertAnonNickname(env, userId, body?.nickname)
    return json({ ok: true, nickname: result.nickname })
  } catch (err: any) {
    return json({ error: err?.message || 'Invalid nickname' }, { status: 400 })
  }
}
