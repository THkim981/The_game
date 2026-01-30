import type { Resources, RiskTier, UpgradeKey } from '../types'
import { clamp } from '../utils/number'

export function getIncomeComponents(params: {
  levels: Record<UpgradeKey, number>
  resources: Resources
  buffMultiplier: number
}) {
  const { levels, resources, buffMultiplier } = params
  const printer = 1 + 0.1 * levels.printer
  const vault = 1 + 0.05 * levels.vault
  const insightBonus = 1 + Math.log10(1 + resources.insight)
  const prestigeBonus = 1 + 0.05 * Math.log10(1 + resources.prestige)
  const total =
    printer * vault * buffMultiplier * insightBonus * prestigeBonus

  return { printer, vault, insightBonus, prestigeBonus, buffMultiplier, total }
}

export function computeIncomeMultiplier(params: {
  levels: Record<UpgradeKey, number>
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

  const baseJackpot = baseProbs.jackpot
  const baseSuccess = baseProbs.success
  const baseGood = baseJackpot + baseSuccess

  // Luck 1당 (대성공+성공) 합을 약 +0.2%p 올림 (최대 100%)
  const bonusGood = 0.002 * boundedLuck
  const targetGood = clamp(baseGood + bonusGood, 0, 1)

  const scale = baseGood <= 0 ? 0 : targetGood / baseGood
  const jackpot = baseJackpot * scale
  const success = baseSuccess * scale
  const remainder = 1 - targetGood

  const failWeight = baseProbs.fail + baseProbs.crash
  const failShare = failWeight === 0 ? 0.5 : baseProbs.fail / failWeight
  const fail = remainder * failShare
  const crash = remainder * (1 - failShare)

  return { jackpot, success, fail, crash }
}

export function computeBulkCost(params: {
  baseCost: number
  growth: number
  startLevel: number
  count: number
}) {
  const { baseCost, growth, startLevel, count } = params
  if (count <= 0) return 0
  if (growth === 1) return baseCost * count
  const startCost = baseCost * Math.pow(growth, startLevel)
  const factor = (Math.pow(growth, count) - 1) / (growth - 1)
  return startCost * factor
}

export function computeMaxAffordableBulk(params: {
  cash: number
  baseCost: number
  growth: number
  startLevel: number
  maxCount: number
}) {
  const { cash, baseCost, growth, startLevel, maxCount } = params
  if (maxCount <= 0) return 0
  const firstCost = baseCost * Math.pow(growth, startLevel)
  if (cash < firstCost) return 0
  if (growth === 1) return Math.min(maxCount, Math.floor(cash / baseCost))

  const numerator = 1 + (cash * (growth - 1)) / firstCost
  if (numerator <= 1) return 0
  const maxN = Math.floor(Math.log(numerator) / Math.log(growth))
  return Math.max(0, Math.min(maxCount, maxN))
}
