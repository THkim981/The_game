import { useCallback, useMemo, useRef } from 'react'
import { BASE_CHIP_RATE, BASE_HEAT_RATE, HEAT_MAX, initialLevels, initialResources, riskTiers, upgradeHelp, upgrades } from '../constants'
import type { AutoBuyTarget, Buff, Resources, RiskTier, UpgradeKey } from '../types'
import { adjustProbabilities, computePrestigeGain } from './gameCalculations'
import { useGameDerived } from './useGameDerived'
import { buildSavedGameState, buildStatsPatch, computeActiveGambleMultiplier } from './profilePersistence'
import { useGameActions } from './useGameActions'
import { buildGameLogicResult } from './buildGameLogicResult'
import { useRankPrompt } from './useRankPrompt'
import { useRollOutcome } from './useRollOutcome'
import { useGameTickLoop } from './useGameTickLoop'
import { useProfileLoadRef } from './useProfileLoadRef'
import { useGameStateRefs } from './useGameStateRefs'
import { useResetProgressRef } from './useResetProgressRef'
import { useGameUiActions } from './useGameUiActions'
import type { ProfileStats, SavedGameState } from '../utils/profileStorage'

export type GameLogicOptions = {
  outcomeTextDisabled?: boolean
}

export function useGameLogicCore(profileId: string, options?: GameLogicOptions) {
  const outcomeTextDisabled = Boolean(options?.outcomeTextDisabled)
  const {
    refs: {
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
      autoBuyTargetsRef,
      autoRiskKeyRef,
    },
    state: {
      resources,
      levels,
      buffs,
      permLuck,
      maxCash,
      cashHistory,
      runStartMs,
      runMaxCash,
      elapsedSeconds,
      gamblePerSec,
      rankPromptOpen,
      rankPromptSeconds,
      snapKey,
      toast,
      fx,
      openHelp,
    },
    setters: {
      setResources,
      setLevels,
      setBuffs,
      setPermLuck,
      setMaxCash,
      setCashHistory,
      setRunStartMs,
      setRunMaxCash,
      setElapsedSeconds,
      setGamblePerSec,
      setRankPromptOpen,
      setRankPromptSeconds,
      setSnapKey,
      setToast,
      setFx,
      setOpenHelp,
    },
    toastTimeout,
  } = useGameStateRefs()

  const rankTargetCash = 1e100

  const upgradeMap = useMemo(() => new Map(upgrades.map((upgrade) => [upgrade.key, upgrade])), [])
  const riskTierMap = useMemo(() => new Map(riskTiers.map((tier) => [tier.key, tier])), [])

  const derivedRef = useRef<{
    buffMultiplier: number
    incomeMultiplier: number
    incomeInsightBonus: number
    conversionCosts: { multiplier: number; cashToChips: number; cashToHeat: number }
    chipsRatePerSec: number
    heatRatePerSec: number
    heatFullChargeSeconds: number
  }>({
    buffMultiplier: 1,
    incomeMultiplier: 1,
    incomeInsightBonus: 1,
    conversionCosts: { multiplier: 1, cashToChips: 120, cashToHeat: 90 },
    chipsRatePerSec: BASE_CHIP_RATE,
    heatRatePerSec: BASE_HEAT_RATE,
    heatFullChargeSeconds: HEAT_MAX / BASE_HEAT_RATE,
  })

  const flushSnapshot = useCallback(() => {
    setResources({ ...resourcesRef.current })
    setLevels({ ...levelsRef.current })
    setBuffs([...buffsRef.current])
    setPermLuck(permLuckRef.current)
    setMaxCash(maxCashRef.current)
    setRunStartMs(runStartMsRef.current)
    setRunMaxCash(runMaxCashRef.current)
    setCashHistory([...cashHistoryRef.current])
    setElapsedSeconds(elapsedSecondsRef.current)
    setGamblePerSec(gamblePerSecRef.current)
  }, [])

  useProfileLoadRef({
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
  })

  const { buffMultiplier, incomeMultiplier, incomeInsightBonus, conversionCosts, chipsRatePerSec, heatFullChargeSeconds, heatRatePerSec } =
    useGameDerived({ resources, levels, buffs })

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
      levels: levelsRef.current,
      buffs: buffsRef.current,
      permLuck: permLuckRef.current,
      maxCash: maxCashRef.current,
      cashHistory: cashHistoryRef.current,
      runStartMs: runStartMsRef.current,
      runMaxCash: runMaxCashRef.current,
      rankPromptSeconds,
      sessionElapsedSeconds: elapsedSecondsRef.current,
    })
  }, [rankPromptSeconds])

  const getStatsPatch = useCallback((): Partial<ProfileStats> => {
    const derived = derivedRef.current
    return buildStatsPatch({
      activeGambleMultiplier: computeActiveGambleMultiplier(derived.buffMultiplier),
      prestige: resourcesRef.current.prestige,
      permLuck: permLuckRef.current,
      cash: resourcesRef.current.cash,
    })
  }, [])

  const setResourcesRef = useCallback((updater: (prev: Resources) => Resources) => {
    resourcesRef.current = updater(resourcesRef.current)
  }, [])

  const setLevelsRef = useCallback((updater: (prev: Record<UpgradeKey, number>) => Record<UpgradeKey, number>) => {
    levelsRef.current = updater(levelsRef.current)
  }, [])

  const setBuffsRef = useCallback((updater: (prev: Buff[]) => Buff[]) => {
    buffsRef.current = updater(buffsRef.current)
  }, [])

  const setPermLuckRef = useCallback((value: number) => {
    permLuckRef.current = value
  }, [])

  const getConversionCosts = useCallback(() => derivedRef.current.conversionCosts, [])

  const actions = useGameActions({
    getResources: () => resourcesRef.current,
    setResources: setResourcesRef,
    getLevels: () => levelsRef.current,
    setLevels: setLevelsRef,
    setBuffs: setBuffsRef,
    getPermLuck: () => permLuckRef.current,
    setPermLuck: setPermLuckRef,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    getConversionCosts,
    effectiveUpgrades: upgrades,
    initialResources,
    initialLevels,
    onAfterPrestige: () => {
      const now = Date.now()
      runStartMsRef.current = now
      runMaxCashRef.current = initialResources.cash
      startTimeRef.current = now
      elapsedSecondsRef.current = 0
      sampleAccumulatorRef.current = 0
      maxCashRef.current = initialResources.cash
      cashHistoryRef.current = [initialResources.cash]
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
  } = actions

  const { pushToastFiltered, saveRankTime, manualSave, dismissRankTime } = useGameUiActions({
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
  })

  const resetProgress = useResetProgressRef({
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
    bumpSnapKey: () => setSnapKey((k) => k + 1),
    flushSnapshot,
  })

  const prestigeGain = useMemo(() => computePrestigeGain(resources), [resources])

  const adjustProbs = useCallback((tier: RiskTier) => {
    const totalLuck = resourcesRef.current.luck + permLuckRef.current
    return adjustProbabilities(tier, totalLuck)
  }, [])

  const rollOutcome = useRollOutcome({
    resourcesRef,
    setResources: setResourcesRef,
    addBuff,
    pushToast: pushToastFiltered,
    triggerFx,
    adjustProbs,
  })

  const rollOutcomeTracked = useCallback(
    (tier: RiskTier) => {
      gambleCountRef.current += 1
      rollOutcome(tier)
    },
    [rollOutcome],
  )

  const requestSnapshot = useCallback(() => {
    flushSnapshot()
  }, [flushSnapshot])

  const setAutoBuyTargets = useCallback((targets: AutoBuyTarget[]) => {
    autoBuyTargetsRef.current = targets
  }, [])

  const setAutoRiskKey = useCallback((key: RiskTier['key'] | null) => {
    autoRiskKeyRef.current = key
  }, [])

  useGameTickLoop({
    profileId,
    resourcesRef,
    levelsRef,
    buffsRef,
    maxCashRef,
    cashHistoryRef,
    runMaxCashRef,
    elapsedSecondsRef,
    startTimeRef,
    sampleAccumulatorRef,
    gambleSampleMsRef,
    gambleCountRef,
    gamblePerSecRef,
    autoBuyTargetsRef,
    autoRiskKeyRef,
    derivedRef,
    upgradeMap,
    riskTierMap,
    rollOutcomeTracked,
    flushSnapshot,
    getSaveState,
    getStatsPatch,
  })

  return buildGameLogicResult({
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
      gamblePerSec,
      adjustProbs,
      prestigeGain,
      snapKey,
      chipsRatePerSec,
      heatFullChargeSeconds,
      heatRatePerSec,
      permLuckCap,
      nextPermLuckCost: Math.ceil(5 * Math.pow(1.2, permLuck)),
      maxCash,
      rankPromptOpen,
      rankPromptSeconds,
    },
    actions: {
      setOpenHelp,
      setAutoBuyTargets,
      setAutoRiskKey,
      requestSnapshot,
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome: rollOutcomeTracked,
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
      upgrades,
      upgradeHelp,
      riskTiers,
    },
  })
}
