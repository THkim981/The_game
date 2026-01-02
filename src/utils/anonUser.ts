const ANON_USER_ID_KEY = 'anon_user_id'

function isValidAnonUserId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value)
}

function generateAnonUserId(): string {
  // 32-char hex (UUID v4 without hyphens) to satisfy server/profileId constraints.
  const anyCrypto = globalThis.crypto as Crypto | undefined
  if (anyCrypto?.randomUUID) {
    return anyCrypto.randomUUID().replace(/-/g, '').toLowerCase()
  }

  if (anyCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16)
    anyCrypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Worst-case fallback (should be rare in modern browsers)
  const fallback = Math.random().toString(16).slice(2).padEnd(32, '0')
  return fallback.slice(0, 32)
}

export function getOrCreateAnonUserId(): string {
  try {
    const existing = window.localStorage.getItem(ANON_USER_ID_KEY)
    if (isValidAnonUserId(existing)) return existing.toLowerCase()

    const created = generateAnonUserId()
    window.localStorage.setItem(ANON_USER_ID_KEY, created)
    return created
  } catch {
    return generateAnonUserId()
  }
}

export function clearAnonUserId(): void {
  try {
    window.localStorage.removeItem(ANON_USER_ID_KEY)
  } catch {
    // ignore
  }
}
