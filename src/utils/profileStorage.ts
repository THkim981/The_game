import { getOrCreateAnonUserId } from './anonUser'

export type ProfileId = string

function resolveApiUrl(input: string): string {
  // Allow deployments where API is hosted on a different origin.
  const base = (import.meta as ImportMeta).env?.VITE_API_BASE as string | undefined
  if (!base) return input
  try {
    return new URL(input, base).toString()
  } catch {
    return input
  }
}

export type AuthResult = {
  token: string
  userId: number
  username: string
  profileId: string
}

export type SavedGameState = {
  version: 1
  savedAt: number

  resources: {
    cash: number
    chips: number
    heat: number
    luck: number
    insight: number
    prestige: number
  }
  levels: Record<string, number>
  buffs: Array<{ id: string; multiplier: number; expiresAt: number }>
  permBoost: number
  permLuck: number
  maxCash: number
  cashHistory: number[]

  runStartMs: number
  runMaxCash: number
  rankPromptSeconds: number | null

  // Elapsed wall-clock seconds (kept across refresh).
  sessionElapsedSeconds?: number
}

export type ProfileStats = {
  version: 1
  updatedAt: number
  lastActiveGambleMultiplier: number
  lastPrestige: number
  lastPermLuck: number
  lastCash: number
  bestTimeTo1e100Seconds: number | null
}

export type ProfileSnapshot = {
  id: number
  savedAt: number
  cash: number
  state: SavedGameState | null
}

type ApiError = Error & { status?: number; body?: string }

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const anonUserId = getOrCreateAnonUserId()
  const url = resolveApiUrl(input)
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(anonUserId ? { 'X-User-Id': anonUserId } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = text
    try {
      const parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null
      if (parsed?.error) message = parsed.error
      else if (parsed?.message) message = parsed.message
    } catch {
      // ignore JSON parse errors
    }

    const error = new Error(message || `API ${res.status}`) as ApiError
    error.status = res.status
    error.body = text
    throw error
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (res.status === 204) return undefined as T

  if (/\bapplication\/(.+\+)?json\b/i.test(contentType)) {
    return (await res.json()) as T
  }

  const text = await res.text().catch(() => '')
  throw new Error(
    `Expected JSON but got '${contentType || 'unknown'}' from ${url}. ` +
      `Is the API server running and reachable?` +
      (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')
        ? ` (Received HTML)`
        : ''),
  )
}

export async function loadProfileSave(profileId: ProfileId): Promise<SavedGameState | null> {
  const res = await apiFetch<{ state: SavedGameState | null }>(`/api/profile/${encodeURIComponent(profileId)}/save`)
  return res.state
}

export async function saveProfileSave(profileId: ProfileId, state: SavedGameState): Promise<void> {
  await apiFetch(`/api/profile/${encodeURIComponent(profileId)}/save`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
}

export async function loadProfileStats(profileId: ProfileId): Promise<ProfileStats> {
  return apiFetch(`/api/profile/${encodeURIComponent(profileId)}/stats`)
}

export async function saveProfileStats(profileId: ProfileId, stats: Partial<ProfileStats>): Promise<ProfileStats> {
  return apiFetch(`/api/profile/${encodeURIComponent(profileId)}/stats`, {
    method: 'PUT',
    body: JSON.stringify(stats),
  })
}

export async function updateBestTimeTo1e100(profileId: ProfileId, seconds: number): Promise<ProfileStats> {
  return apiFetch(`/api/profile/${encodeURIComponent(profileId)}/best-time`, {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  })
}

export async function loadProfileSnapshots(profileId: ProfileId, limit = 10): Promise<ProfileSnapshot[]> {
  const res = await apiFetch<{ snapshots: ProfileSnapshot[] }>(
    `/api/profile/${encodeURIComponent(profileId)}/snapshots?limit=${limit}`,
  )
  return res.snapshots
}

export async function resetProfile(profileId: ProfileId): Promise<void> {
  await apiFetch(`/api/profile/${encodeURIComponent(profileId)}/reset`, {
    method: 'POST',
  })
}

export type RankingEntry = {
  userId: string
  bestScoreSeconds: number
  updatedAt: number

  luck?: number | null
  activeGambleMultiplier?: number | null
  elapsedSeconds?: number | null
  prestigeElapsedSeconds?: number | null
  prestige?: number | null
  cash?: number | null
  gold?: number | null
  insight?: number | null
  heat?: number | null
  safeUpgradeLevel?: number | null
}

export type ScoreMeta = {
  luck: number
  activeGambleMultiplier: number
  elapsedSeconds: number
  prestigeElapsedSeconds: number
  prestige: number
  cash: number
  gold: number
  insight: number
  heat: number
  safeUpgradeLevel: number
}

export async function postScore(
  userId: string,
  scoreSeconds: number,
  meta: ScoreMeta,
): Promise<{ ok: true; bestScoreSeconds: number }> {
  return apiFetch('/api/score', {
    method: 'POST',
    body: JSON.stringify({ userId, score: scoreSeconds, ...meta }),
  })
}

export async function getRanking(limit = 10): Promise<RankingEntry[]> {
  const res = await apiFetch<{ ranking: RankingEntry[] }>(`/api/ranking?limit=${limit}`)
  return res.ranking
}
