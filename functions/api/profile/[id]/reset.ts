import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import { resetProfile, sanitizeProfileId } from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'POST') return json({ error: 'Not found' }, { status: 404 })

  const profileId = sanitizeProfileId((params as any)?.id)
  if (!profileId) return json({ error: 'Invalid profileId' }, { status: 400 })

  try {
    return json(await resetProfile(env, profileId))
  } catch (err: any) {
    return json({ error: err?.message || 'Reset failed' }, { status: 500 })
  }
}
