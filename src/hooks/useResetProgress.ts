import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { initialBuffs, initialLevels, initialResources } from '../constants'
import type { Buff, Resources, Tone, UpgradeKey } from '../types'
import { resetProfile } from '../utils/profileStorage'

type ResetParams = {
  profileId: string
  setResources: (r: Resources) => void
  setLevels: (l: Record<UpgradeKey, number>) => void
  setBuffs: (b: Buff[]) => void
  buffsRef: MutableRefObject<Buff[]>
  setPermLuck: (v: number) => void
  setMaxCash: (v: number) => void
  setCashHistory: (v: number[]) => void
  setRunStartMs: (v: number) => void
  setRunMaxCash: (v: number) => void
  setRankPromptOpen: (v: boolean) => void
  setRankPromptSeconds: (v: number | null) => void
  startTimeRef: MutableRefObject<number>
  setElapsedSeconds: (v: number) => void
  sampleAccumulatorRef: MutableRefObject<number>
  toastTimeoutRef: MutableRefObject<number | null>
  setOpenHelp: (v: UpgradeKey | null) => void
  setToast: (v: null | { title: string; detail: string; tone: Tone; key: number }) => void
  setFx: (v: null | { tone: Tone; key: number }) => void
  bumpSnapKey: () => void
}

export function useResetProgress(params: ResetParams) {
  const {
    profileId,
    setResources,
    setLevels,
    setBuffs,
    buffsRef,
    setPermLuck,
    setMaxCash,
    setCashHistory,
    setRunStartMs,
    setRunMaxCash,
    setRankPromptOpen,
    setRankPromptSeconds,
    startTimeRef,
    setElapsedSeconds,
    sampleAccumulatorRef,
    toastTimeoutRef,
    setOpenHelp,
    setToast,
    setFx,
    bumpSnapKey,
  } = params

  return useCallback(() => {
    try {
      window.localStorage.removeItem('cashRankings')
    } catch {
      // ignore
    }

    void resetProfile(profileId).catch(() => {
      // ignore
    })

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }

    setResources(initialResources)
    setLevels(initialLevels)
    setBuffs(initialBuffs)
    buffsRef.current = initialBuffs
    setPermLuck(0)
    setMaxCash(initialResources.cash)
    setCashHistory([initialResources.cash])

    const now = Date.now()
    setRunStartMs(now)
    setRunMaxCash(initialResources.cash)
    setRankPromptOpen(false)
    setRankPromptSeconds(null)

    startTimeRef.current = now
    setElapsedSeconds(0)
    sampleAccumulatorRef.current = 0

    setOpenHelp(null)
    setToast(null)
    setFx(null)
    bumpSnapKey()
  }, [
    profileId,
    setResources,
    setLevels,
    setBuffs,
    buffsRef,
    setPermLuck,
    setMaxCash,
    setCashHistory,
    setRunStartMs,
    setRunMaxCash,
    setRankPromptOpen,
    setRankPromptSeconds,
    startTimeRef,
    setElapsedSeconds,
    sampleAccumulatorRef,
    toastTimeoutRef,
    setOpenHelp,
    setToast,
    setFx,
    bumpSnapKey,
  ])
}
