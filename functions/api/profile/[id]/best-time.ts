import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import { ensureProfile, readJson, sanitizeProfileId, upsertBestTime } from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'POST') return json({ error: 'Not found' }, { status: 404 })

  const profileId = sanitizeProfileId((params as any)?.id)
  if (!profileId) return json({ error: 'Invalid profileId' }, { status: 400 })

  const body = await readJson(request)
  const seconds = body?.seconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 1) {
    return json({ error: 'Invalid seconds' }, { status: 400 })
  }

  await ensureProfile(env, profileId)
  return json(await upsertBestTime(env, profileId, seconds))
}
