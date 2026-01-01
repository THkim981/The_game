import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initialBuffs, initialLevels, initialResources, riskTiers, upgradeHelp } from '../constants'
import type { Buff, Resources, RiskTier, Tone, UpgradeKey } from '../types'
import { adjustProbabilities, computePrestigeGain } from './gameCalculations'
import { buildGameActions } from './gameActions'
import { createRollOutcome } from './riskHandlers'
import { useElapsedTimer } from './useElapsedTimer'
import { useGameDerived } from './useGameDerived'
import { useResourceTick } from './useResourceTick'

export function useGameLogic() {
  const [resources, setResources] = useState<Resources>(initialResources)
  const [maxCash, setMaxCash] = useState(initialResources.cash)
  const [runStartMs, setRunStartMs] = useState(() => Date.now())
  const [runMaxCash, setRunMaxCash] = useState(initialResources.cash)
  const [rankPromptOpen, setRankPromptOpen] = useState(false)
  const [rankPromptSeconds, setRankPromptSeconds] = useState<number | null>(null)
  const [levels, setLevels] = useState<Record<UpgradeKey, number>>(initialLevels)
  const [buffs, setBuffs] = useState<Buff[]>(initialBuffs)
  const [permBoost, setPermBoost] = useState(0)
  const [permLuck, setPermLuck] = useState(0)
  const [snapKey, setSnapKey] = useState(0)
  const buffsRef = useRef<Buff[]>([])
  const resourcesRef = useRef<Resources>(initialResources)
  const startTime = useRef(Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [cashHistory, setCashHistory] = useState<number[]>([initialResources.cash])
  const sampleAccumulator = useRef(0)
  const [toast, setToast] = useState<null | { title: string; detail: string; tone: Tone; key: number }>(
    null,
  )
  const toastTimeout = useRef<number | null>(null)
  const [fx, setFx] = useState<null | { tone: Tone; key: number }>(null)
  const [openHelp, setOpenHelp] = useState<UpgradeKey | null>(null)

  const rankTargetCash = 1e100

  resourcesRef.current = resources

  const {
    buffMultiplier,
    incomeMultiplier,
    incomeInsightBonus,
    conversionCosts,
    chipsRatePerSec,
    heatFullChargeSeconds,
    heatRatePerSec,
    effectiveUpgrades,
  } = useGameDerived({ resources, levels, permBoost, buffs })

  useResourceTick({
    levels,
    permBoost,
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

  useEffect(() => {
    setMaxCash((prev) => (resources.cash > prev ? resources.cash : prev))
    setRunMaxCash((prev) => (resources.cash > prev ? resources.cash : prev))
  }, [resources.cash])

  useEffect(() => {
    if (rankPromptOpen) return
    if (rankPromptSeconds !== null) return
    if (runMaxCash < rankTargetCash) return

    const seconds = Math.max(0, (Date.now() - runStartMs) / 1000)
    setRankPromptSeconds(seconds)
    setRankPromptOpen(true)
  }, [rankPromptOpen, rankPromptSeconds, runMaxCash, runStartMs])

  const actions = useMemo(
    () =>
      buildGameActions({
        getResources: () => resourcesRef.current,
        setResources,
        levels,
        setLevels,
        setBuffs,
        buffsRef,
        setPermBoost,
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
      }),
    [
      conversionCosts,
      effectiveUpgrades,
      levels,
      permLuck,
      setFx,
      setOpenHelp,
      setToast,
      setBuffs,
      setLevels,
      setPermBoost,
      setPermLuck,
      setResources,
      setSnapKey,
      toastTimeout,
    ],
  )

  const {
    pushToast,
    triggerFx,
    addBuff,
    handlePurchase,
    handlePurchaseBulk,
    convertCashToChips,
    convertCashToHeat,
    grantResources,
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

    try {
      const key = 'cashRankings'
      const raw = window.localStorage.getItem(key)
      const parsed = raw ? (JSON.parse(raw) as Array<{ seconds: number; recordedAt: string }>) : []
      const next = [...parsed, { seconds: rankPromptSeconds, recordedAt: new Date().toISOString() }]
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore storage failures
    }

    setRankPromptOpen(false)
  }, [rankPromptSeconds])

  const dismissRankTime = useCallback(() => {
    setRankPromptOpen(false)
  }, [])

  const prestigeGain = useMemo(() => computePrestigeGain(resources), [resources])

  const adjustProbs = useCallback(
    (tier: RiskTier) => adjustProbabilities(tier, resources.luck + permLuck),
    [permLuck, resources.luck],
  )

  const rollOutcome = useMemo(
    () =>
      createRollOutcome({
        getResources: () => resourcesRef.current,
        spendResources: (tier) =>
          setResources((prev) => ({ ...prev, chips: prev.chips - tier.cost, heat: 0 })),
        gainInsight: (amount) => setResources((prev) => ({ ...prev, insight: prev.insight + amount })),
        shiftLuck: (delta) =>
          setResources((prev) => ({
            ...prev,
            luck: Math.max(0, Math.min(100, prev.luck + delta)),
          })),
        addBuff,
        addPermBoost: (delta) => setPermBoost((p) => p + delta),
        pushToast,
        triggerFx,
        adjustProbs,
      }),
    [adjustProbs, addBuff, pushToast, triggerFx, setResources, setPermBoost],
  )

  return {
    state: {
      resources,
      levels,
      buffs,
      permBoost,
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
      grantResources,
      performPrestige,
      buyPermanentLuck,
      saveRankTime,
      dismissRankTime,
    },
    data: {
      upgrades: effectiveUpgrades,
      upgradeHelp,
      riskTiers,
    },
  }
}
