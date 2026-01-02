// Minimal Cloudflare Pages Functions types for editor/TS tooling.
// The actual runtime types are provided by Cloudflare during build/deploy.

export {}

declare global {
  type PagesFunction<Env = unknown, Params extends Record<string, string> = Record<string, string>> = (
    context: {
      request: Request
      env: Env
      params: Params
      next: (request?: Request) => Promise<Response>
    },
  ) => Response | Promise<Response>
}
