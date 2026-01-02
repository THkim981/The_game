import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import { ensureProfile, getStats, readJson, sanitizeProfileId, upsertStats } from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })

  const profileId = sanitizeProfileId((params as any)?.id)
  if (!profileId) return json({ error: 'Invalid profileId' }, { status: 400 })

  const method = request.method.toUpperCase()
  if (method === 'GET') {
    await ensureProfile(env, profileId)
    return json(await getStats(env, profileId))
  }

  if (method === 'PUT') {
    await ensureProfile(env, profileId)
    const body = await readJson(request)
    const patch: any = {}
    if (typeof body?.lastActiveGambleMultiplier === 'number') patch.lastActiveGambleMultiplier = body.lastActiveGambleMultiplier
    if (typeof body?.lastPrestige === 'number') patch.lastPrestige = body.lastPrestige
    if (typeof body?.lastPermLuck === 'number') patch.lastPermLuck = body.lastPermLuck
    if (typeof body?.lastCash === 'number') patch.lastCash = body.lastCash
    if (typeof body?.bestTimeTo1e100Seconds === 'number') patch.bestTimeTo1e100Seconds = body.bestTimeTo1e100Seconds

    return json(await upsertStats(env, profileId, patch))
  }

  return json({ error: 'Not found' }, { status: 404 })
}
