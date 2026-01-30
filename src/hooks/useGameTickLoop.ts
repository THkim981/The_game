import { useEffect } from 'react'

import {
  AUTO_SAVE_MS,
  BASE_CHIP_RATE,
  BASE_HEAT_RATE,
  BASE_INCOME,
  CASH_MAX,
  HEAT_MAX,
  SNAPSHOT_MS,
  TICK_MS,
} from '../constants'
import type { AutoBuyTarget, Buff, Resources, RiskTier, Upgrade, UpgradeKey } from '../types'
import {
  computeBulkCost,
  computeConversionCostMultiplier,
  computeConversionCosts,
  computeIncomeMultiplier,
  computeMaxAffordableBulk,
  getIncomeComponents,
} from './gameCalculations'
import type { ProfileStats, SavedGameState } from '../utils/profileStorage'
import { saveProfileSave, saveProfileStats } from '../utils/profileStorage'

type DerivedState = {
  buffMultiplier: number
  incomeMultiplier: number
  incomeInsightBonus: number
  conversionCosts: { multiplier: number; cashToChips: number; cashToHeat: number }
  chipsRatePerSec: number
  heatRatePerSec: number
  heatFullChargeSeconds: number
}

type TickLoopParams = {
  profileId: string
  resourcesRef: React.MutableRefObject<Resources>
  levelsRef: React.MutableRefObject<Record<UpgradeKey, number>>
  buffsRef: React.MutableRefObject<Buff[]>
  maxCashRef: React.MutableRefObject<number>
  cashHistoryRef: React.MutableRefObject<number[]>
  runMaxCashRef: React.MutableRefObject<number>
  elapsedSecondsRef: React.MutableRefObject<number>
  startTimeRef: React.MutableRefObject<number>
  sampleAccumulatorRef: React.MutableRefObject<number>
  gambleSampleMsRef: React.MutableRefObject<number>
  gambleCountRef: React.MutableRefObject<number>
  gamblePerSecRef: React.MutableRefObject<number>
  autoBuyTargetsRef: React.MutableRefObject<AutoBuyTarget[]>
  autoRiskKeyRef: React.MutableRefObject<RiskTier['key'] | null>
  derivedRef: React.MutableRefObject<DerivedState>
  upgradeMap: Map<UpgradeKey, Upgrade>
  riskTierMap: Map<RiskTier['key'], RiskTier>
  rollOutcomeTracked: (tier: RiskTier) => void
  flushSnapshot: () => void
  getSaveState: () => SavedGameState
  getStatsPatch: () => Partial<ProfileStats>
}

export function useGameTickLoop({
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
}: TickLoopParams) {
  useEffect(() => {
    let lastTick = Date.now()
    let lastSnapshot = 0
    let lastAutoSave = 0

    const id = window.setInterval(() => {
      const now = Date.now()
      const deltaMs = now - lastTick
      lastTick = now
      const deltaSec = Math.max(0, deltaMs / 1000)

      if (buffsRef.current.some((buff) => Number.isFinite(buff.expiresAt) && buff.expiresAt <= now)) {
        buffsRef.current = buffsRef.current.filter(
          (buff) => !Number.isFinite(buff.expiresAt) || buff.expiresAt > now,
        )
      }

      const buffMultiplier = buffsRef.current.reduce((acc, buff) => acc * buff.multiplier, 1)
      const incomeComponents = getIncomeComponents({
        levels: levelsRef.current,
        resources: resourcesRef.current,
        buffMultiplier,
      })
      const incomeMultiplier = computeIncomeMultiplier({
        levels: levelsRef.current,
        resources: resourcesRef.current,
        buffMultiplier,
      })
      const conversionCostMultiplier = computeConversionCostMultiplier({
        buffMultiplier,
        printer: incomeComponents.printer,
        vault: incomeComponents.vault,
      })
      const conversionCosts = computeConversionCosts(conversionCostMultiplier)
      const prestigeRateBonus = 1 + 0.02 * resourcesRef.current.prestige
      const chipsRatePerSec = BASE_CHIP_RATE * (1 + 0.10 * levelsRef.current.refinery) * prestigeRateBonus
      const heatRatePerSec = BASE_HEAT_RATE * (1 + 0.03 * levelsRef.current.battery) * prestigeRateBonus
      const heatFullChargeSeconds = heatRatePerSec <= 0 ? Number.POSITIVE_INFINITY : HEAT_MAX / heatRatePerSec

      derivedRef.current = {
        buffMultiplier,
        incomeMultiplier,
        incomeInsightBonus: incomeComponents.insightBonus,
        conversionCosts,
        chipsRatePerSec,
        heatRatePerSec,
        heatFullChargeSeconds,
      }

      const prevResources = resourcesRef.current
      const nextCash = Math.min(CASH_MAX, prevResources.cash + BASE_INCOME * incomeMultiplier * deltaSec)
      const nextChips = prevResources.chips + chipsRatePerSec * deltaSec
      const nextHeat = Math.max(0, Math.min(HEAT_MAX, prevResources.heat + heatRatePerSec * deltaSec))
      resourcesRef.current = { ...prevResources, cash: nextCash, chips: nextChips, heat: nextHeat }

      if (nextCash > maxCashRef.current) maxCashRef.current = nextCash
      if (nextCash > runMaxCashRef.current) runMaxCashRef.current = nextCash

      sampleAccumulatorRef.current += deltaMs
      if (sampleAccumulatorRef.current >= 1000) {
        sampleAccumulatorRef.current = 0
        const nextHistory = [...cashHistoryRef.current, nextCash]
        const maxPoints = 120
        cashHistoryRef.current = nextHistory.length > maxPoints ? nextHistory.slice(nextHistory.length - maxPoints) : nextHistory
      }

      elapsedSecondsRef.current = Math.floor((now - startTimeRef.current) / 1000)

      gambleSampleMsRef.current += deltaMs
      if (gambleSampleMsRef.current >= 1000) {
        const windowSec = gambleSampleMsRef.current / 1000
        const rate = windowSec > 0 ? gambleCountRef.current / windowSec : 0
        gamblePerSecRef.current = rate
        gambleCountRef.current = 0
        gambleSampleMsRef.current = 0
      }

      const autoTargets = autoBuyTargetsRef.current
      if (autoTargets.length > 0) {
        for (const target of autoTargets) {
          if (target.kind === 'upgrade') {
            const upgrade = upgradeMap.get(target.key)
            if (!upgrade) continue

            const level = levelsRef.current[upgrade.key] ?? 0
            const locked = upgrade.maxLevel ? level >= upgrade.maxLevel : false

            if (target.type === 'single') {
              if (locked) continue
              const cost = upgrade.baseCost * Math.pow(upgrade.growth, level)
              const { cash } = resourcesRef.current
              if (cash >= cost) {
                resourcesRef.current = { ...resourcesRef.current, cash: cash - cost }
                levelsRef.current = { ...levelsRef.current, [upgrade.key]: level + 1 }
              }
            }

            if (target.type === 'bulk') {
              const maxPurchase = locked
                ? 0
                : upgrade.maxLevel
                  ? Math.max(0, Math.min(10, upgrade.maxLevel - level))
                  : 10
              if (maxPurchase <= 0) continue

              const { cash } = resourcesRef.current
              const affordableCount = computeMaxAffordableBulk({
                cash,
                baseCost: upgrade.baseCost,
                growth: upgrade.growth,
                startLevel: level,
                maxCount: maxPurchase,
              })
              if (affordableCount <= 0) continue

              const totalCost = computeBulkCost({
                baseCost: upgrade.baseCost,
                growth: upgrade.growth,
                startLevel: level,
                count: affordableCount,
              })

              resourcesRef.current = { ...resourcesRef.current, cash: cash - totalCost }
              levelsRef.current = { ...levelsRef.current, [upgrade.key]: level + affordableCount }
            }
            continue
          }

          if (target.key === 'cashToChips') {
            const cost = derivedRef.current.conversionCosts.cashToChips
            if (cost <= 0) continue
            const { cash, chips } = resourcesRef.current
            const count = Math.floor(cash / cost)
            if (count <= 0) continue
            resourcesRef.current = {
              ...resourcesRef.current,
              cash: cash - cost * count,
              chips: chips + count * 10,
            }
            continue
          }

          if (target.key === 'cashToHeat') {
            const cost = derivedRef.current.conversionCosts.cashToHeat
            if (cost <= 0) continue
            const { cash, heat } = resourcesRef.current
            const heatRoom = Math.max(0, HEAT_MAX - heat)
            const maxHeatCount = Math.floor(heatRoom / 10)
            if (maxHeatCount <= 0) continue
            const cashCount = Math.floor(cash / cost)
            const count = Math.min(maxHeatCount, cashCount)
            if (count <= 0) continue
            resourcesRef.current = {
              ...resourcesRef.current,
              cash: cash - cost * count,
              heat: Math.min(HEAT_MAX, heat + count * 10),
            }
          }
        }
      }

      const autoRiskKey = autoRiskKeyRef.current
      if (autoRiskKey) {
        const tier = riskTierMap.get(autoRiskKey)
        if (tier) {
          const snapshot = resourcesRef.current
          if (snapshot.heat >= HEAT_MAX && snapshot.chips >= tier.cost) {
            rollOutcomeTracked(tier)
          }
        }
      }

      if (now - lastAutoSave >= AUTO_SAVE_MS) {
        lastAutoSave = now
        try {
          void saveProfileSave(profileId, getSaveState()).catch(() => {
            // ignore
          })

          void saveProfileStats(profileId, getStatsPatch()).catch(() => {
            // ignore
          })
        } catch {
          // ignore storage failures
        }
      }

      if (now - lastSnapshot >= SNAPSHOT_MS) {
        lastSnapshot = now
        flushSnapshot()
      }
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [
    autoBuyTargetsRef,
    autoRiskKeyRef,
    buffsRef,
    cashHistoryRef,
    derivedRef,
    elapsedSecondsRef,
    flushSnapshot,
    gambleCountRef,
    gamblePerSecRef,
    gambleSampleMsRef,
    getSaveState,
    getStatsPatch,
    levelsRef,
    maxCashRef,
    profileId,
    resourcesRef,
    riskTierMap,
    rollOutcomeTracked,
    runMaxCashRef,
    sampleAccumulatorRef,
    startTimeRef,
    upgradeMap,
  ])
}
