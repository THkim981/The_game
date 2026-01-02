export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

export function readBearerToken(request: Request): string | null {
  const raw = request.headers.get('Authorization') ?? ''
  const match = raw.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function isPreflight(request: Request): boolean {
  return request.method.toUpperCase() === 'OPTIONS'
}
