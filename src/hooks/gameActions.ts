import { CASH_MAX, HEAT_MAX, initialBuffs } from '../constants'
import type { Buff, Resources, Tone, Upgrade, UpgradeKey } from '../types'
import { formatNumber } from '../utils/number'
import { computePrestigeGain } from './gameCalculations'

export type GameActions = ReturnType<typeof buildGameActions>

interface ActionDeps {
  getResources: () => Resources
  setResources: React.Dispatch<React.SetStateAction<Resources>>
  levels: Record<UpgradeKey, number>
  setLevels: React.Dispatch<React.SetStateAction<Record<UpgradeKey, number>>>
  setBuffs: React.Dispatch<React.SetStateAction<Buff[]>>
  buffsRef: React.MutableRefObject<Buff[]>
  permLuck: number
  setPermLuck: React.Dispatch<React.SetStateAction<number>>
  setSnapKey: React.Dispatch<React.SetStateAction<number>>
  setOpenHelp: React.Dispatch<React.SetStateAction<UpgradeKey | null>>
  setFx: React.Dispatch<React.SetStateAction<{ tone: Tone; key: number } | null>>
  setToast: React.Dispatch<React.SetStateAction<{ tone: Tone; title: string; detail: string; key: number } | null>>
  toastTimeout: React.MutableRefObject<number | null>
  conversionCosts: { cashToChips: number; cashToHeat: number }
  effectiveUpgrades: Upgrade[]
  initialResources: Resources
  initialLevels: Record<UpgradeKey, number>
  onAfterPrestige?: () => void
}

export function buildGameActions({
  getResources,
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
  onAfterPrestige,
}: ActionDeps) {
  const FAR_FUTURE_MS = 8_640_000_000_000_000 // ~= max JS Date
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

  const addBuff = (multiplier: number, _minutes: number) => {
    // 지속 버프: 만료 없음(사실상 영구). 도박 성공/대성공 시 부스트는 '중첩(곱)'됩니다.
    // NOTE: Infinity는 JSON.stringify 시 null이 되어 저장/복원이 깨지므로 far-future timestamp를 사용.
    setBuffs((prev) => {
      const prevProduct = prev.reduce((acc, b) => acc * b.multiplier, 1)
      const nextMultiplier = prevProduct * multiplier
      const next: Buff[] = [
        { id: `${Date.now()}-${Math.random()}`, multiplier: nextMultiplier, expiresAt: FAR_FUTURE_MS },
      ]
      buffsRef.current = next
      return next
    })
  }

  const handlePurchase = (key: UpgradeKey) => {
    const upgrade = effectiveUpgrades.find((u) => u.key === key)
    if (!upgrade) return
    const currentLevel = levels[key] ?? 0
    if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return

    const cost = upgrade.baseCost * Math.pow(upgrade.growth, currentLevel)
    const { cash } = getResources()
    if (cash < cost) return

    setResources((prev) => ({ ...prev, cash: prev.cash - cost }))
    setLevels((prev) => ({ ...prev, [key]: currentLevel + 1 }))
  }

  const handlePurchaseBulk = (key: UpgradeKey, quantity: number) => {
    const upgrade = effectiveUpgrades.find((u) => u.key === key)
    if (!upgrade) return
    const currentLevel = levels[key] ?? 0
    const maxPurchase = upgrade.maxLevel ? Math.max(0, Math.min(quantity, upgrade.maxLevel - currentLevel)) : quantity
    if (maxPurchase <= 0) return

    let totalCost = 0
    for (let i = 0; i < maxPurchase; i += 1) {
      totalCost += upgrade.baseCost * Math.pow(upgrade.growth, currentLevel + i)
    }

    const { cash } = getResources()
    if (cash < totalCost) return

    setResources((prev) => ({ ...prev, cash: prev.cash - totalCost }))
    setLevels((prev) => ({ ...prev, [key]: prev[key] + maxPurchase }))
  }

  const convertCashToChips = () => {
    const cost = conversionCosts.cashToChips
    const { cash } = getResources()
    if (cash < cost) return

    setResources((prev) => ({ ...prev, cash: prev.cash - cost, chips: prev.chips + 10 }))
    pushToast('good', 'Gold 교환', `-${formatNumber(cost)} C → +10 Gold`)
  }

  const convertCashToHeat = () => {
    const cost = conversionCosts.cashToHeat
    const { cash } = getResources()
    if (cash < cost) return

    setResources((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      heat: Math.max(0, Math.min(HEAT_MAX, prev.heat + 10)),
    }))
    pushToast('warn', 'Heat 충전', `-${formatNumber(cost)} C → Heat +10`)
  }

  const grantResources = (delta: Partial<Resources>) => {
    setResources((prev) => ({
      cash: Math.min(CASH_MAX, Math.max(0, prev.cash + (delta.cash ?? 0))),
      chips: Math.max(0, prev.chips + (delta.chips ?? 0)),
      heat: Math.max(0, Math.min(HEAT_MAX, prev.heat + (delta.heat ?? 0))),
      luck: Math.max(0, Math.min(100, prev.luck + (delta.luck ?? 0))),
      insight: Math.max(0, prev.insight + (delta.insight ?? 0)),
      prestige: Math.max(0, prev.prestige + (delta.prestige ?? 0)),
    }))
  }

  const setCashAbsolute = (cashValue: number) => {
    if (typeof cashValue !== 'number' || !Number.isFinite(cashValue)) {
      pushToast('bad', 'Cash 설정', '유효한 숫자를 입력하세요')
      return
    }

    const clamped = Math.min(CASH_MAX, Math.max(0, cashValue))
    setResources((prev) => ({ ...prev, cash: clamped }))
    pushToast('good', 'Cash 설정', `Cash = ${formatNumber(clamped)} C`)
  }

  const performPrestige = () => {
    const snapshot = getResources()
    const gain = computePrestigeGain(snapshot)
    if (gain <= 0) return

    setResources({ ...initialResources, prestige: snapshot.prestige + gain })
    setLevels(initialLevels)
    setBuffs(initialBuffs)
    setSnapKey((k) => k + 1)
    setOpenHelp(null)
    setFx(null)
    setToast({ tone: 'good', title: '프리스티지!', detail: `+${gain} PTG 획득`, key: Date.now() })
    onAfterPrestige?.()
  }

  const permLuckCap = 50
  const nextPermLuckCost = Math.ceil(5 * Math.pow(1.2, permLuck))

  const buyPermanentLuck = () => {
    const { prestige } = getResources()
    if (permLuck >= permLuckCap) return
    if (prestige < nextPermLuckCost) return

    const nextLevel = permLuck + 1
    setResources((prev) => ({ ...prev, prestige: prev.prestige - nextPermLuckCost }))
    setPermLuck(nextLevel)
    pushToast('good', '영구 Luck 구매', `Luck +1 (누적 ${nextLevel})`)
  }

  return {
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
  }
}
