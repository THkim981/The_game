import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import { ensureProfile, getStats, readJson, sanitizeProfileId, upsertStats } from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (isPreflight(request)) return new Response(null, { status: 204 })

    if (!env?.DB) {
      return json(
        {
          error: 'D1 binding missing',
          hint: 'In Cloudflare Pages project settings, bind a D1 database to variable name "DB" for both Production and Preview.',
        },
        { status: 500 },
      )
    }

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
      if (typeof body?.bestTimeTo1e100Seconds === 'number') {
        const v = body.bestTimeTo1e100Seconds
        if (!Number.isFinite(v) || v < 1) return json({ error: 'Invalid bestTimeTo1e100Seconds' }, { status: 400 })
        patch.bestTimeTo1e100Seconds = v
      }

      return json(await upsertStats(env, profileId, patch))
    }

    return json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json(
      {
        error: 'Internal Server Error',
        message,
        hint: 'Most common causes are: (1) Pages is bound to a different D1 database than you migrated, or (2) migrations were not applied to the bound database.',
      },
      { status: 500 },
    )
  }
}
