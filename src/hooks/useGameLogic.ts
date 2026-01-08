import { useCallback, useMemo, useRef, useState } from 'react'
import { initialBuffs, initialLevels, initialResources, riskTiers, upgradeHelp } from '../constants'
import type { Buff, Resources, RiskTier, Tone, UpgradeKey } from '../types'
import { adjustProbabilities, computePrestigeGain } from './gameCalculations'
import { useElapsedTimer } from './useElapsedTimer'
import { useGameDerived } from './useGameDerived'
import { buildSavedGameState, buildStatsPatch, computeActiveGambleMultiplier } from './profilePersistence'
import { useAutoSaveProfile } from './useAutoSaveProfile'
import { useGameActions } from './useGameActions'
import { useLoadProfileSave } from './useLoadProfileSave'
import { useMaxCashTracking } from './useMaxCashTracking'
import { useRankPrompt } from './useRankPrompt'
import { useResetProgress } from './useResetProgress'
import { useRollOutcome } from './useRollOutcome'
import { useResourceTick } from './useResourceTick'
import { postScore, saveProfileSave, saveProfileStats } from '../utils/profileStorage'
import type { ProfileStats, SavedGameState } from '../utils/profileStorage'

export function useGameLogic(profileId: string) {
  const [resources, setResources] = useState<Resources>(initialResources)
  const [maxCash, setMaxCash] = useState(initialResources.cash)
  const [runStartMs, setRunStartMs] = useState(() => Date.now())
  const [runMaxCash, setRunMaxCash] = useState(initialResources.cash)
  const [rankPromptOpen, setRankPromptOpen] = useState(false)
  const [rankPromptSeconds, setRankPromptSeconds] = useState<number | null>(null)
  const [levels, setLevels] = useState<Record<UpgradeKey, number>>(initialLevels)
  const [buffs, setBuffs] = useState<Buff[]>(initialBuffs)
  const [permLuck, setPermLuck] = useState(0)
  const [snapKey, setSnapKey] = useState(0)
  const buffsRef = useRef<Buff[]>([])
  const resourcesRef = useRef<Resources>(initialResources)
  const startTime = useRef(Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedSecondsRef = useRef(0)
  const [cashHistory, setCashHistory] = useState<number[]>([initialResources.cash])
  const sampleAccumulator = useRef(0)
  const [toast, setToast] = useState<null | { title: string; detail: string; tone: Tone; key: number }>(null)
  const toastTimeout = useRef<number | null>(null)
  const [fx, setFx] = useState<null | { tone: Tone; key: number }>(null)
  const [openHelp, setOpenHelp] = useState<UpgradeKey | null>(null)

  const rankTargetCash = 1e100

  resourcesRef.current = resources
  elapsedSecondsRef.current = elapsedSeconds

  useLoadProfileSave(profileId, {
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
    startTimeRef: startTime,
    setElapsedSeconds,
  })

  const { buffMultiplier, incomeMultiplier, incomeInsightBonus, conversionCosts, chipsRatePerSec, heatFullChargeSeconds, heatRatePerSec, effectiveUpgrades } =
    useGameDerived({ resources, levels, buffs })

  useResourceTick({
    levels,
    chipsRatePerSec,
    heatRatePerSec,
    setResources,
    setMaxCash,
    setCashHistory,
    setBuffs,
    buffsRef,
    sampleAccumulator,
  })

  useElapsedTimer(startTime, setElapsedSeconds)

  useMaxCashTracking({ cash: resources.cash, setMaxCash, setRunMaxCash })

  useRankPrompt({
    profileId,
    enabled: true,
    rankTargetCash,
    runMaxCash,
    runStartMs,
    rankPromptOpen,
    rankPromptSeconds,
    setRankPromptSeconds,
    setRankPromptOpen,
  })

  const getSaveState = useCallback((): SavedGameState => {
    return buildSavedGameState({
      resources: resourcesRef.current,
      levels,
      buffs: buffsRef.current,
      permLuck,
      maxCash,
      cashHistory,
      runStartMs,
      runMaxCash,
      rankPromptSeconds,
      sessionElapsedSeconds: elapsedSecondsRef.current,
    })
  }, [cashHistory, levels, maxCash, permLuck, rankPromptSeconds, runMaxCash, runStartMs])

  const getStatsPatch = useCallback((): Partial<ProfileStats> => {
    return buildStatsPatch({
      activeGambleMultiplier: computeActiveGambleMultiplier(buffMultiplier),
      prestige: resourcesRef.current.prestige,
      permLuck,
      cash: resourcesRef.current.cash,
    })
  }, [buffMultiplier, permLuck])

  useAutoSaveProfile({ profileId, getSaveState, getStatsPatch, intervalMs: 600_000 })

  const actions = useGameActions({
    getResources: () => resourcesRef.current,
    setResources,
    levels,
    setLevels,
    setBuffs,
    buffsRef,
    permLuck,
    setPermLuck,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    conversionCosts,
    effectiveUpgrades,
    initialResources,
    initialLevels,
    onAfterPrestige: () => {
      setRunStartMs(Date.now())
      setRunMaxCash(initialResources.cash)
      setRankPromptOpen(false)
      setRankPromptSeconds(null)
    },
  })

  const {
    pushToast,
    triggerFx,
    addBuff,
    handlePurchase,
    handlePurchaseBulk,
    convertCashToChips,
    convertCashToHeat,
    grantResources,
    setCashAbsolute,
    performPrestige,
    buyPermanentLuck,
    permLuckCap,
    nextPermLuckCost,
  } = actions

  const saveRankTime = useCallback(() => {
    if (rankPromptSeconds === null) {
      setRankPromptOpen(false)
      return
    }

    const safeUpgradeLevel = levels.printer + levels.vault + levels.battery + levels.refinery
    const activeGambleMultiplier = computeActiveGambleMultiplier(buffMultiplier)
    const prestigeElapsedSeconds = Math.max(0, (Date.now() - runStartMs) / 1000)

    void postScore(profileId, rankPromptSeconds, {
      luck: resources.luck + permLuck,
      activeGambleMultiplier,
      elapsedSeconds,
      prestigeElapsedSeconds,
      prestige: resources.prestige,
      cash: resources.cash,
      gold: resources.chips,
      insight: resources.insight,
      heat: resources.heat,
      safeUpgradeLevel,
    }).catch(() => {
      // ignore
    })

    setRankPromptOpen(false)
  }, [buffMultiplier, elapsedSeconds, levels, permLuck, profileId, rankPromptSeconds, resources, runStartMs])

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

  const resetProgress = useResetProgress({
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
    startTimeRef: startTime,
    setElapsedSeconds,
    sampleAccumulatorRef: sampleAccumulator,
    toastTimeoutRef: toastTimeout,
    setOpenHelp,
    setToast,
    setFx,
    bumpSnapKey: () => setSnapKey((k) => k + 1),
  })

  const dismissRankTime = useCallback(() => {
    setRankPromptOpen(false)
  }, [])

  const prestigeGain = useMemo(() => computePrestigeGain(resources), [resources])

  const adjustProbs = useCallback(
    (tier: RiskTier) => adjustProbabilities(tier, resources.luck + permLuck),
    [permLuck, resources.luck],
  )

  const rollOutcome = useRollOutcome({
    resourcesRef,
    setResources,
    addBuff,
    pushToast,
    triggerFx,
    adjustProbs,
  })

  return {
    state: {
      resources,
      levels,
      buffs,
      permLuck,
      cashHistory,
      maxCash,
      toast,
      fx,
      openHelp,
    },
    derived: {
      incomeMultiplier,
      buffMultiplier,
      conversionCosts,
      incomeInsightBonus,
      elapsedSeconds,
      adjustProbs,
      prestigeGain,
      snapKey,
      chipsRatePerSec,
      heatFullChargeSeconds,
      heatRatePerSec,
      permLuckCap,
      nextPermLuckCost,
      maxCash,
      rankPromptOpen,
      rankPromptSeconds,
    },
    actions: {
      setOpenHelp,
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome,
      convertCashToChips,
      convertCashToHeat,
      setCashAbsolute,
      grantResources,
      performPrestige,
      buyPermanentLuck,
      saveRankTime,
      dismissRankTime,
      manualSave,
      resetProgress,
    },
    data: {
      upgrades: effectiveUpgrades,
      upgradeHelp,
      riskTiers,
    },
  }
}
