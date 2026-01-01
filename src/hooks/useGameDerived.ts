import { useMemo } from 'react'
import { BASE_CHIP_RATE, BASE_HEAT_RATE, HEAT_MAX, upgrades } from '../constants'
import type { Buff, Resources, UpgradeKey } from '../types'
import { computeConversionCosts, computeConversionCostMultiplier, computeIncomeMultiplier, getIncomeComponents } from './gameCalculations'

interface DerivedParams {
  resources: Resources
  levels: Record<UpgradeKey, number>
  permBoost: number
  buffs: Buff[]
}

export function useGameDerived({ resources, levels, permBoost, buffs }: DerivedParams) {
  const buffMultiplier = useMemo(() => buffs.reduce((acc, buff) => acc * buff.multiplier, 1), [buffs])

  const incomeComponents = useMemo(
    () => getIncomeComponents({ levels, permBoost, resources, buffMultiplier }),
    [buffMultiplier, levels, permBoost, resources],
  )

  const incomeMultiplier = useMemo(
    () => computeIncomeMultiplier({ levels, permBoost, resources, buffMultiplier }),
    [buffMultiplier, levels, permBoost, resources],
  )

  const conversionCostMultiplier = useMemo(
    () =>
      computeConversionCostMultiplier({
        buffMultiplier,
        printer: incomeComponents.printer,
        vault: incomeComponents.vault,
      }),
    [buffMultiplier, incomeComponents.printer, incomeComponents.vault],
  )

  const conversionCosts = useMemo(() => computeConversionCosts(conversionCostMultiplier), [conversionCostMultiplier])

  const prestigeRateBonus = useMemo(() => 1 + 0.02 * resources.prestige, [resources.prestige])

  const chipsRatePerSec = useMemo(
    () => BASE_CHIP_RATE * (1 + 0.10 * levels.refinery) * prestigeRateBonus,
    [levels.refinery, prestigeRateBonus],
  )

  const heatRatePerSec = useMemo(
    () => BASE_HEAT_RATE * (1 + 0.03 * levels.battery) * prestigeRateBonus,
    [levels.battery, prestigeRateBonus],
  )

  const heatFullChargeSeconds = useMemo(() => {
    if (heatRatePerSec <= 0) return Number.POSITIVE_INFINITY
    return HEAT_MAX / heatRatePerSec
  }, [heatRatePerSec])

  const effectiveUpgrades = upgrades

  return {
    buffMultiplier,
    incomeMultiplier,
    incomeInsightBonus: incomeComponents.insightBonus,
    conversionCosts,
    chipsRatePerSec,
    heatRatePerSec,
    heatFullChargeSeconds,
    effectiveUpgrades,
  }
}
