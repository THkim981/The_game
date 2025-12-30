import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BASE_CHIP_RATE,
  BASE_HEAT_RATE,
  BASE_INCOME,
  HEAT_MAX,
  TICK_MS,
  initialBuffs,
  initialLevels,
  initialResources,
  riskTiers,
  upgradeHelp,
  upgrades,
} from '../constants'
import type { Buff, Resources, RiskTier, Tone, UpgradeKey } from '../types'
import { clamp } from '../utils/number'
import { formatNumber } from '../utils/number'

export function useGameLogic() {
  const [resources, setResources] = useState<Resources>(initialResources)
  const [levels, setLevels] = useState<Record<UpgradeKey, number>>(initialLevels)
  const [buffs, setBuffs] = useState<Buff[]>(initialBuffs)
  const [permBoost, setPermBoost] = useState(0)
  const [snapKey, setSnapKey] = useState(0)
  const buffsRef = useRef<Buff[]>([])
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
  const safeLevelScore = useMemo(
    () => levels.printer + levels.vault + levels.autoCollector,
    [levels.autoCollector, levels.printer, levels.vault],
  )

  const incomeMultiplier = useMemo(() => {
    const printer = 1 + 0.1 * levels.printer
    const vault = 1 + 0.05 * levels.vault
    const auto = 1 + 0.05 * Math.min(levels.autoCollector, 20)
    const bankBonus = 0.1 * Math.log10(1 + resources.cash / 1000) * (1 + 0.07 * levels.interest)
    const insightBonus = 1 + 0.12 * Math.log10(1 + resources.insight)
    const prestigeBonus = 1 + 0.05 * Math.log10(1 + resources.prestige)
    const totalBuff = buffsRef.current.reduce((acc, buff) => acc * buff.multiplier, 1)

    const baseMultiplier =
      printer * vault * auto * (1 + permBoost) * totalBuff * (1 + bankBonus) * insightBonus * prestigeBonus
    return baseMultiplier
  }, [
    levels.autoCollector,
    levels.interest,
    levels.printer,
    levels.vault,
    permBoost,
    resources.cash,
    resources.prestige,
    resources.insight,
  ])

  const buffMultiplier = useMemo(() => buffs.reduce((acc, buff) => acc * buff.multiplier, 1), [buffs])

  useEffect(() => {
    const deltaSec = TICK_MS / 1000

    const tick = () => {
      setBuffs((prev) => {
        const now = Date.now()
        const next = prev.filter((buff) => buff.expiresAt > now)
        buffsRef.current = next
        return next
      })

      let nextCashValue = 0

      setResources((prev) => {
        const printer = 1 + 0.1 * levels.printer
        const vault = 1 + 0.05 * levels.vault
        const auto = 1 + 0.05 * Math.min(levels.autoCollector, 20)
        const bankBonus = 0.1 * Math.log10(1 + prev.cash / 1000) * (1 + 0.07 * levels.interest)
        const insightBonus = 1 + 0.12 * Math.log10(1 + prev.insight)
        const prestigeBonus = 1 + 0.05 * Math.log10(1 + prev.prestige)
        const totalBuff = buffsRef.current.reduce((acc, buff) => acc * buff.multiplier, 1)

        const baseMultiplier =
          printer * vault * auto * (1 + permBoost) * totalBuff * (1 + bankBonus) * insightBonus * prestigeBonus
        const income = BASE_INCOME * baseMultiplier

        const chipsRate = BASE_CHIP_RATE * (1 + 0.05 * levels.refinery)
        const heatRate = BASE_HEAT_RATE * (1 + 0.1 * levels.battery)

        const nextCash = prev.cash + income * deltaSec
        const nextChips = prev.chips + chipsRate * deltaSec
        const nextHeat = clamp(prev.heat + heatRate * deltaSec, 0, HEAT_MAX)

        nextCashValue = nextCash

        return {
          ...prev,
          cash: nextCash,
          chips: nextChips,
          heat: nextHeat,
        }
      })

      sampleAccumulator.current += TICK_MS
      if (sampleAccumulator.current >= 1000) {
        sampleAccumulator.current = 0
        setCashHistory((history) => {
          const next = [...history, nextCashValue]
          const maxPoints = 120
          return next.length > maxPoints ? next.slice(next.length - maxPoints) : next
        })
      }
    }

    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [levels.autoCollector, levels.battery, levels.interest, levels.printer, levels.refinery, levels.vault, permBoost])

  useEffect(() => {
    const id = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsedSeconds(seconds)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const handlePurchase = (key: UpgradeKey) => {
    const upgrade = upgrades.find((u) => u.key === key)!
    const currentLevel = levels[key] ?? 0

    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return
    const cost = upgrade.baseCost * Math.pow(upgrade.growth, currentLevel)
    if (resources.cash < cost) return

    setResources((prev) => ({ ...prev, cash: prev.cash - cost }))
    setLevels((prev) => ({ ...prev, [key]: currentLevel + 1 }))
  }

  const handlePurchaseBulk = (key: UpgradeKey, quantity: number) => {
    const upgrade = upgrades.find((u) => u.key === key)!
    const currentLevel = levels[key] ?? 0
    const maxPurchase = upgrade.maxLevel ? Math.max(0, Math.min(quantity, upgrade.maxLevel - currentLevel)) : quantity
    if (maxPurchase <= 0) return

    let totalCost = 0
    for (let i = 0; i < maxPurchase; i += 1) {
      totalCost += upgrade.baseCost * Math.pow(upgrade.growth, currentLevel + i)
    }
    if (resources.cash < totalCost) return

    setResources((prev) => ({ ...prev, cash: prev.cash - totalCost }))
    setLevels((prev) => ({ ...prev, [key]: prev[key] + maxPurchase }))
  }

  const convertCashToChips = () => {
    const baseCost = 120
    const cost = baseCost * Math.pow(1.06, safeLevelScore)
    if (resources.cash < cost) return

    setResources((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      chips: prev.chips + 10,
    }))
    pushToast('good', '칩 교환', `-${formatNumber(cost)} C → +10 G`)
  }

  const convertCashToHeat = () => {
    const baseCost = 90
    const cost = baseCost * Math.pow(1.06, safeLevelScore)
    if (resources.cash < cost) return

    setResources((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      heat: clamp(prev.heat + 10, 0, HEAT_MAX),
    }))
    pushToast('warn', 'Heat 충전', `-${formatNumber(cost)} C → Heat +10`)
  }

  const grantResources = (delta: Partial<Resources>) => {
    setResources((prev) => ({
      cash: Math.max(0, prev.cash + (delta.cash ?? 0)),
      chips: Math.max(0, prev.chips + (delta.chips ?? 0)),
      heat: clamp(prev.heat + (delta.heat ?? 0), 0, HEAT_MAX),
      luck: clamp(prev.luck + (delta.luck ?? 0), 0, 100),
      insight: Math.max(0, prev.insight + (delta.insight ?? 0)),
      prestige: Math.max(0, prev.prestige + (delta.prestige ?? 0)),
    }))
  }

  const calculatePrestigeGain = (snapshot: Resources) => {
    const totalValue = snapshot.cash + snapshot.chips * 1_000 + snapshot.insight * 10_000
    const logv = Math.log10(1 + totalValue)
    const raw = Math.max(0, logv - 8) // threshold around 1e8 effective value
    const gain = Math.floor(Math.pow(raw, 1.4))
    return gain
  }

  const performPrestige = () => {
    const gain = calculatePrestigeGain(resources)
    if (gain <= 0) return

    setResources({ ...initialResources, prestige: resources.prestige + gain })
    setLevels(initialLevels)
    setBuffs(initialBuffs)
    setPermBoost(0)
    setSnapKey((k) => k + 1)
    setOpenHelp(null)
    setFx(null)
    setToast({ tone: 'good', title: '프리스티지!', detail: `+${gain} Shard 획득`, key: Date.now() })
  }

  const addBuff = (multiplier: number, minutes: number) => {
    const expiresAt = Date.now() + minutes * 60 * 1000
    const buff: Buff = { id: `${Date.now()}-${Math.random()}`, multiplier, expiresAt }
    setBuffs((prev) => {
      const next = [...prev, buff]
      buffsRef.current = next
      return next
    })
  }

  const adjustProbs = (tier: RiskTier) => {
    const { baseProbs } = tier
    const luckRatio = resources.luck / 100
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

  const pushToast = (tone: Tone, title: string, detail: string) => {
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current)
    const key = Date.now()
    setToast({ tone, title, detail, key })
    toastTimeout.current = window.setTimeout(() => setToast(null), 2600)
  }

  const triggerFx = (tone: Tone) => {
    setFx({ tone, key: Date.now() })
    window.setTimeout(() => setFx(null), 900)
  }

  const applyOutcome = (tier: RiskTier, outcome: keyof RiskTier['baseProbs']) => {
    const { reward } = tier
    const insightGain = tier.cost * reward.insightFactor[outcome]

    if (outcome === 'jackpot') {
      addBuff(reward.jackpotBuff, reward.buffMinutes)
      if (reward.permBoost) setPermBoost((p) => p + reward.permBoost)
      setResources((prev) => ({ ...prev, insight: prev.insight + insightGain }))
      setResources((prev) => ({ ...prev, luck: clamp(prev.luck - 35, 0, 100) }))
      pushToast('good', '대성공!', `부스트 x${reward.jackpotBuff.toFixed(1)} / Insight +${(
        insightGain
      ).toFixed(1)}`)
      triggerFx('good')
      return
    }

    if (outcome === 'success') {
      addBuff(reward.successBuff, reward.buffMinutes)
      setResources((prev) => ({
        ...prev,
        insight: prev.insight + insightGain,
        luck: clamp(prev.luck - 35, 0, 100),
      }))
      pushToast('good', '성공', `부스트 x${reward.successBuff.toFixed(2)} / Insight +${(
        insightGain
      ).toFixed(1)}`)
      triggerFx('good')
      return
    }

    if (outcome === 'fail') {
      setResources((prev) => ({
        ...prev,
        insight: prev.insight + insightGain,
        luck: clamp(prev.luck + 22, 0, 100),
      }))
      pushToast('bad', '실패', `Insight +${insightGain.toFixed(1)} · Luck 상승`)
      triggerFx('bad')
      return
    }

    if (outcome === 'crash') {
      setResources((prev) => ({
        ...prev,
        insight: prev.insight + insightGain,
        luck: clamp(prev.luck + 40, 0, 100),
      }))
      pushToast('bad', '대실패', `쿨다운 · Insight +${insightGain.toFixed(1)} · Luck 크게 상승`)
      triggerFx('bad')
    }
  }

  const rollOutcome = (tier: RiskTier) => {
    if (resources.heat < HEAT_MAX || resources.chips < tier.cost) return

    const probs = adjustProbs(tier)
    const roll = Math.random()
    let cursor = probs.jackpot
    let outcome: keyof RiskTier['baseProbs'] = 'jackpot'
    if (roll > cursor) {
      cursor += probs.success
      outcome = roll <= cursor ? 'success' : outcome
    }
    if (roll > cursor) {
      cursor += probs.fail
      outcome = roll <= cursor ? 'fail' : 'crash'
    }

    setResources((prev) => ({
      ...prev,
      chips: prev.chips - tier.cost,
      heat: 0,
    }))

    applyOutcome(tier, outcome)
  }

  return {
    state: {
      resources,
      levels,
      buffs,
      permBoost,
      cashHistory,
      toast,
      fx,
      openHelp,
    },
    derived: {
      incomeMultiplier,
      buffMultiplier,
      elapsedSeconds,
      adjustProbs,
      prestigeGain: calculatePrestigeGain(resources),
      snapKey,
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
    },
    data: {
      upgrades,
      upgradeHelp,
      riskTiers,
    },
  }
}
