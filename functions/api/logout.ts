import { json, isPreflight } from '../_lib/http'
import type { Env } from '../_lib/d1'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 })
  void env
  return json({ error: 'Not found' }, { status: 404 })
}
