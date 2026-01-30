import { useCallback } from 'react'

import type { Tone, UpgradeKey } from '../types'
import { computeActiveGambleMultiplier } from './profilePersistence'
import type { ProfileStats, SavedGameState } from '../utils/profileStorage'
import { postScore, saveProfileSave, saveProfileStats } from '../utils/profileStorage'

type UseGameUiActionsParams = {
  outcomeTextDisabled: boolean
  pushToast: (tone: Tone, title: string, detail: string) => void
  setRankPromptOpen: (value: boolean) => void
  rankPromptSeconds: number | null
  elapsedSeconds: number
  profileId: string
  resourcesRef: React.MutableRefObject<{ cash: number; chips: number; heat: number; luck: number; insight: number; prestige: number }>
  levelsRef: React.MutableRefObject<Record<UpgradeKey, number>>
  permLuckRef: React.MutableRefObject<number>
  runStartMsRef: React.MutableRefObject<number>
  derivedRef: React.MutableRefObject<{ buffMultiplier: number }>
  getSaveState: () => SavedGameState
  getStatsPatch: () => Partial<ProfileStats>
}

export function useGameUiActions({
  outcomeTextDisabled,
  pushToast,
  setRankPromptOpen,
  rankPromptSeconds,
  elapsedSeconds,
  profileId,
  resourcesRef,
  levelsRef,
  permLuckRef,
  runStartMsRef,
  derivedRef,
  getSaveState,
  getStatsPatch,
}: UseGameUiActionsParams) {
  const pushToastFiltered = useCallback(
    (tone: Tone, title: string, detail: string) => {
      if (!outcomeTextDisabled) {
        pushToast(tone, title, detail)
        return
      }

      if (title === '성공' || title === '실패' || title === '대성공!' || title === '대실패') return

      pushToast(tone, title, detail)
    },
    [outcomeTextDisabled, pushToast],
  )

  const saveRankTime = useCallback(
    (nickname?: string) => {
      if (rankPromptSeconds === null) {
        setRankPromptOpen(false)
        return
      }

      if (rankPromptSeconds < 1) {
        pushToast('bad', '랭킹 저장 불가', '1초 미만 기록은 등록할 수 없습니다.')
        setRankPromptOpen(false)
        return
      }

      const levelsSnapshot = levelsRef.current
      const resourcesSnapshot = resourcesRef.current
      const safeUpgradeLevel =
        levelsSnapshot.printer + levelsSnapshot.vault + levelsSnapshot.battery + levelsSnapshot.refinery
      const activeGambleMultiplier = computeActiveGambleMultiplier(derivedRef.current.buffMultiplier)
      const prestigeElapsedSeconds = Math.max(0, (Date.now() - runStartMsRef.current) / 1000)

      void postScore(
        profileId,
        rankPromptSeconds,
        {
          luck: resourcesSnapshot.luck + permLuckRef.current,
          activeGambleMultiplier,
          elapsedSeconds,
          prestigeElapsedSeconds,
          prestige: resourcesSnapshot.prestige,
          cash: resourcesSnapshot.cash,
          gold: resourcesSnapshot.chips,
          insight: resourcesSnapshot.insight,
          heat: resourcesSnapshot.heat,
          safeUpgradeLevel,
        },
        nickname,
      ).catch((e: unknown) => {
        const message = e instanceof Error ? e.message : '랭킹 저장 실패'
        pushToast('bad', '랭킹 저장 실패', message)
      })

      setRankPromptOpen(false)
    },
    [elapsedSeconds, levelsRef, permLuckRef, profileId, pushToast, rankPromptSeconds, resourcesRef, runStartMsRef, setRankPromptOpen, derivedRef],
  )

  const manualSave = useCallback(async () => {
    try {
      await saveProfileStats(profileId, getStatsPatch())
      const saved = getSaveState()
      await saveProfileSave(profileId, saved)

      pushToast('good', '수동 저장', '저장 완료')
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장 실패'
      pushToast('bad', '수동 저장', message)
    }
  }, [getSaveState, getStatsPatch, profileId, pushToast])

  const dismissRankTime = useCallback(() => {
    setRankPromptOpen(false)
  }, [setRankPromptOpen])

  return {
    pushToastFiltered,
    saveRankTime,
    manualSave,
    dismissRankTime,
  }
}
