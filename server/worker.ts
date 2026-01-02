// Local dev helper Worker.
// This is NOT used by Cloudflare Pages deployment directly.
// Pages uses the /functions directory.

import type { Env } from '../functions/_lib/d1'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // For local dev, prefer Pages Functions (`wrangler pages dev`).
    // This worker exists only so `wrangler dev` doesn't fail due to missing main.
    return new Response(
      'This project is intended to run on Cloudflare Pages Functions.\n' +
        'Use: npm run cf:dev\n',
      { status: 501 },
    )
  },
}
