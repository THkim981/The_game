import { useCallback } from 'react'

import { initialBuffs, initialLevels, initialResources } from '../constants'
import type { Buff, Resources, Tone, UpgradeKey } from '../types'
import { resetProfile } from '../utils/profileStorage'

type ResetParams = {
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
  sampleAccumulatorRef: React.MutableRefObject<number>
  gambleSampleMsRef: React.MutableRefObject<number>
  gambleCountRef: React.MutableRefObject<number>
  gamblePerSecRef: React.MutableRefObject<number>
  setRankPromptOpen: (value: boolean) => void
  setRankPromptSeconds: (value: number | null) => void
  setOpenHelp: (value: UpgradeKey | null) => void
  setToast: (value: null | { title: string; detail: string; tone: Tone; key: number }) => void
  setFx: (value: null | { tone: Tone; key: number }) => void
  toastTimeout: React.MutableRefObject<number | null>
  bumpSnapKey: () => void
  flushSnapshot: () => void
}

export function useResetProgressRef({
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
  sampleAccumulatorRef,
  gambleSampleMsRef,
  gambleCountRef,
  gamblePerSecRef,
  setRankPromptOpen,
  setRankPromptSeconds,
  setOpenHelp,
  setToast,
  setFx,
  toastTimeout,
  bumpSnapKey,
  flushSnapshot,
}: ResetParams) {
  return useCallback(() => {
    try {
      window.localStorage.removeItem('cashRankings')
    } catch {
      // ignore
    }

    void resetProfile(profileId).catch(() => {
      // ignore
    })

    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current)
      toastTimeout.current = null
    }

    resourcesRef.current = initialResources
    levelsRef.current = initialLevels
    buffsRef.current = initialBuffs
    permLuckRef.current = 0
    maxCashRef.current = initialResources.cash
    cashHistoryRef.current = [initialResources.cash]

    const now = Date.now()
    runStartMsRef.current = now
    runMaxCashRef.current = initialResources.cash
    startTimeRef.current = now
    elapsedSecondsRef.current = 0
    sampleAccumulatorRef.current = 0
    gambleSampleMsRef.current = 0
    gambleCountRef.current = 0
    gamblePerSecRef.current = 0

    setRankPromptOpen(false)
    setRankPromptSeconds(null)

    setOpenHelp(null)
    setToast(null)
    setFx(null)
    bumpSnapKey()

    flushSnapshot()
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
    sampleAccumulatorRef,
    gambleSampleMsRef,
    gambleCountRef,
    gamblePerSecRef,
    setRankPromptOpen,
    setRankPromptSeconds,
    setOpenHelp,
    setToast,
    setFx,
    toastTimeout,
    bumpSnapKey,
    flushSnapshot,
  ])
}
