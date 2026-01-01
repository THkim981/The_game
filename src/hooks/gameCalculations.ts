import type { Buff, Resources, RiskTier, UpgradeKey } from '../types'
import { clamp } from '../utils/number'

export function getIncomeComponents(params: {
  levels: Record<UpgradeKey, number>
  permBoost: number
  resources: Resources
  buffMultiplier: number
}) {
  const { levels, permBoost, resources, buffMultiplier } = params
  const printer = 1 + 0.1 * levels.printer
  const vault = 1 + 0.05 * levels.vault
  const insightBonus = 1 + 0.12 * Math.log10(1 + resources.insight)
  const prestigeBonus = 1 + 0.05 * Math.log10(1 + resources.prestige)
  const total =
    printer * vault * (1 + permBoost) * buffMultiplier * insightBonus * prestigeBonus

  return { printer, vault, insightBonus, prestigeBonus, buffMultiplier, permBoost, total }
}

export function computeIncomeMultiplier(params: {
  levels: Record<UpgradeKey, number>
  permBoost: number
  resources: Resources
  buffMultiplier: number
}) {
  return getIncomeComponents(params).total
}

export function computeConversionCostMultiplier(params: {
  buffMultiplier: number
  printer: number
  vault: number
}) {
  const { buffMultiplier, printer, vault } = params
  const activeBuff = Math.max(1, buffMultiplier)
  const baseScaled = Math.pow(activeBuff, 0.98)
  const incomeBoost = Math.max(1, printer * vault)
  const boostScaled = Math.pow(incomeBoost, 0.98)
  return Math.max(1, baseScaled * boostScaled)
}

export function computeConversionCosts(multiplier: number) {
  return {
    multiplier,
    cashToChips: 120 * multiplier,
    cashToHeat: 90 * multiplier,
  }
}

export function computePrestigeGain(snapshot: Resources) {
  const totalValue = snapshot.cash + snapshot.chips * 1_000 + snapshot.insight * 10_000
  const logv = Math.log10(1 + totalValue)
  const raw = Math.max(0, logv - 8)
  const gain = Math.floor(Math.pow(raw, 1.4))
  return gain
}

export function adjustProbabilities(tier: RiskTier, totalLuck: number) {
  const { baseProbs } = tier
  const boundedLuck = clamp(totalLuck, 0, 100)
  const luckRatio = boundedLuck / 100
  const jackpotBase = baseProbs.jackpot * (1 + 0.3 * luckRatio)
  const successBase = baseProbs.success * (1 + 0.6 * luckRatio)

  const weightedTotal = jackpotBase + successBase
  const neutral = 0

  let jackpot = jackpotBase
  let success = successBase
  let remainder = 1 - weightedTotal

  if (remainder < 0) {
    const scale = 1 / weightedTotal
    jackpot *= scale
    success *= scale
    remainder = 0
  }

  const failWeight = baseProbs.fail + baseProbs.crash
  const failShare = failWeight === 0 ? 0.5 : baseProbs.fail / failWeight
  const fail = remainder * failShare
  const crash = remainder * (1 - failShare)

  return { jackpot, success, neutral, fail, crash }
}
