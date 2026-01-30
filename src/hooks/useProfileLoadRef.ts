import { useEffect } from 'react'

import type { Buff, Resources, UpgradeKey } from '../types'
import type { SavedGameState } from '../utils/profileStorage'
import { loadProfileSave } from '../utils/profileStorage'

type LoadProfileRefsParams = {
  profileId: string
  resourcesRef: React.MutableRefObject<Resources>
  levelsRef: React.MutableRefObject<Record<UpgradeKey, number>>
  buffsRef: React.MutableRefObject<Buff[]>
  permLuckRef: React.MutableRefObject<number>
  maxCashRef: React.MutableRefObject<number>
  cashHistoryRef: React.MutableRefObject<number[]>
  runStartMsRef: React.MutableRefObject<number>
  runMaxCashRef: React.MutableRefObject<number>
  elapsedSecondsRef: React.MutableRefObject<number>
  startTimeRef: React.MutableRefObject<number>
  setRankPromptOpen: (value: boolean) => void
  setRankPromptSeconds: (value: number | null) => void
  flushSnapshot: () => void
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

export function useProfileLoadRef({
  profileId,
  resourcesRef,
  levelsRef,
  buffsRef,
  permLuckRef,
  maxCashRef,
  cashHistoryRef,
  runStartMsRef,
  runMaxCashRef,
  elapsedSecondsRef,
  startTimeRef,
  setRankPromptOpen,
  setRankPromptSeconds,
  flushSnapshot,
}: LoadProfileRefsParams) {
  useEffect(() => {
    let cancelled = false

    loadProfileSave(profileId)
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) return

        const buffs = sanitizeBuffs(loaded.buffs)
        resourcesRef.current = loaded.resources
        levelsRef.current = loaded.levels as Record<UpgradeKey, number>
        buffsRef.current = buffs
        permLuckRef.current = loaded.permLuck
        maxCashRef.current = loaded.maxCash
        cashHistoryRef.current = loaded.cashHistory.length > 0 ? loaded.cashHistory : [loaded.resources.cash]
        runStartMsRef.current = loaded.runStartMs
        runMaxCashRef.current = loaded.runMaxCash
        setRankPromptOpen(false)
        setRankPromptSeconds(loaded.rankPromptSeconds)

        const restoredElapsedSeconds = restoreElapsedSeconds(loaded)
        elapsedSecondsRef.current = restoredElapsedSeconds
        startTimeRef.current = Date.now() - restoredElapsedSeconds * 1000

        flushSnapshot()
      })
      .catch(() => {
        // ignore load failures
      })

    return () => {
      cancelled = true
    }
  }, [
    profileId,
    resourcesRef,
    levelsRef,
    buffsRef,
    permLuckRef,
    maxCashRef,
    cashHistoryRef,
    runStartMsRef,
    runMaxCashRef,
    elapsedSecondsRef,
    startTimeRef,
    setRankPromptOpen,
    setRankPromptSeconds,
    flushSnapshot,
  ])
}
