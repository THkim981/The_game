import { useCallback, useMemo, useRef, useState } from 'react'
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
    },
    data: {
      upgrades: effectiveUpgrades,
      upgradeHelp,
      riskTiers,
    },
  }
}
