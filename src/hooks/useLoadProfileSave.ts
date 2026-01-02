import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import type { Buff, Resources, UpgradeKey } from '../types'
import type { ProfileId, SavedGameState } from '../utils/profileStorage'
import { loadProfileSave } from '../utils/profileStorage'

type LoadTargets = {
  setResources: (r: Resources) => void
  setLevels: (l: Record<UpgradeKey, number>) => void
  setBuffs: (b: Buff[]) => void
  buffsRef: MutableRefObject<Buff[]>
  setPermBoost: (v: number) => void
  setPermLuck: (v: number) => void
  setMaxCash: (v: number) => void
  setCashHistory: (v: number[]) => void
  setRunStartMs: (v: number) => void
  setRunMaxCash: (v: number) => void
  setRankPromptOpen: (v: boolean) => void
  setRankPromptSeconds: (v: number | null) => void
  startTimeRef: MutableRefObject<number>
  setElapsedSeconds: (v: number) => void
}

const FAR_FUTURE_MS = 8_640_000_000_000_000 // ~= max JS Date

function sanitizeBuffs(input: SavedGameState['buffs']): Array<{ id: string; multiplier: number; expiresAt: number }> {
  if (!Array.isArray(input)) return []
  return input
    .map((b) => {
      const id = typeof b?.id === 'string' ? b.id : `${Date.now()}-restored`
      const multiplier = typeof b?.multiplier === 'number' && Number.isFinite(b.multiplier) ? b.multiplier : 1
      const expiresAtRaw = (b as any)?.expiresAt
      const expiresAt = typeof expiresAtRaw === 'number' && Number.isFinite(expiresAtRaw) ? expiresAtRaw : FAR_FUTURE_MS
      return { id, multiplier, expiresAt }
    })
    .filter((b) => b.multiplier > 0)
}

function restoreElapsedSeconds(loaded: SavedGameState): number {
  const raw = loaded.sessionElapsedSeconds
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.max(0, raw)
}

export function useLoadProfileSave(profileId: ProfileId, targets: LoadTargets) {
  useEffect(() => {
    let cancelled = false

    loadProfileSave(profileId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) return

        targets.setResources(loaded.resources)
        targets.setLevels(loaded.levels as Record<UpgradeKey, number>)
        const buffs = sanitizeBuffs(loaded.buffs)
        targets.setBuffs(buffs)
        targets.buffsRef.current = buffs
        targets.setPermBoost(loaded.permBoost)
        targets.setPermLuck(loaded.permLuck)
        targets.setMaxCash(loaded.maxCash)
        targets.setCashHistory(loaded.cashHistory.length > 0 ? loaded.cashHistory : [loaded.resources.cash])
        targets.setRunStartMs(loaded.runStartMs)
        targets.setRunMaxCash(loaded.runMaxCash)
        targets.setRankPromptOpen(false)
        targets.setRankPromptSeconds(loaded.rankPromptSeconds)

        const restoredElapsedSeconds = restoreElapsedSeconds(loaded)
        targets.startTimeRef.current = Date.now() - restoredElapsedSeconds * 1000
        targets.setElapsedSeconds(restoredElapsedSeconds)
      })
      .catch(() => {
        // ignore load failures
      })

    return () => {
      cancelled = true
    }
  }, [profileId])
}
