import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import {
  addSnapshot,
  ensureProfile,
  getSave,
  numberOrUndefined,
  readJson,
  sanitizeProfileId,
  upsertSave,
} from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })

  const profileId = sanitizeProfileId((params as any)?.id)
  if (!profileId) return json({ error: 'Invalid profileId' }, { status: 400 })

  const method = request.method.toUpperCase()

  if (method === 'GET') {
    await ensureProfile(env, profileId)
    return json({ state: await getSave(env, profileId) })
  }

  if (method === 'PUT') {
    const body = await readJson(request)
    const state = body?.state
    if (!state || typeof state !== 'object') return json({ error: 'Missing state' }, { status: 400 })

    await ensureProfile(env, profileId)
    const meta = await upsertSave(env, profileId, state)
    const cash = numberOrUndefined((state as any)?.resources?.cash) ?? 0
    await addSnapshot(env, profileId, state, cash)
    return json({ ok: true, ...meta })
  }

  return json({ error: 'Not found' }, { status: 404 })
}
