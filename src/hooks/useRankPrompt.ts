import { useEffect } from 'react'
import type { ProfileId } from '../utils/profileStorage'
import { updateBestTimeTo1e100 } from '../utils/profileStorage'

type RankPromptParams = {
  profileId: ProfileId
  enabled: boolean
  rankTargetCash: number
  runMaxCash: number
  runStartMs: number
  rankPromptOpen: boolean
  rankPromptSeconds: number | null
  setRankPromptSeconds: (v: number) => void
  setRankPromptOpen: (v: boolean) => void
}

export function useRankPrompt(params: RankPromptParams) {
  const {
    profileId,
    enabled,
    rankTargetCash,
    runMaxCash,
    runStartMs,
    rankPromptOpen,
    rankPromptSeconds,
    setRankPromptSeconds,
    setRankPromptOpen,
  } = params

  const minSecondsForRanking = 1

  useEffect(() => {
    if (!enabled) return
    if (rankPromptOpen) return
    if (rankPromptSeconds !== null) return
    if (runMaxCash < rankTargetCash) return

    const seconds = Math.max(0, (Date.now() - runStartMs) / 1000)
    setRankPromptSeconds(seconds)

    // Exclude sub-1s runs: don't open the "record registration" modal and don't persist to DB.
    if (seconds < minSecondsForRanking) {
      setRankPromptOpen(false)
      return
    }

    setRankPromptOpen(true)

    void updateBestTimeTo1e100(profileId, seconds).catch(() => {
      // ignore
    })
  }, [
    enabled,
    profileId,
    rankPromptOpen,
    rankPromptSeconds,
    rankTargetCash,
    runMaxCash,
    runStartMs,
    setRankPromptOpen,
    setRankPromptSeconds,
  ])
}
