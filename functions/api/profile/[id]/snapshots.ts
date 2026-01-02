import { json, isPreflight } from '../../../_lib/http'
import type { Env } from '../../../_lib/d1'
import { ensureProfile, getSnapshots, sanitizeProfileId } from '../../../_lib/api'

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  if (request.method.toUpperCase() !== 'GET') return json({ error: 'Not found' }, { status: 404 })

  const profileId = sanitizeProfileId((params as any)?.id)
  if (!profileId) return json({ error: 'Invalid profileId' }, { status: 400 })

  await ensureProfile(env, profileId)
  const url = new URL(request.url)
  const limit = url.searchParams.get('limit') ?? '10'
  return json({ snapshots: await getSnapshots(env, profileId, Number(limit)) })
}
