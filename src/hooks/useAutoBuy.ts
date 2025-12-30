import { useEffect, useRef } from 'react'
import type { Upgrade, UpgradeKey } from '../types'

export type HoveredButton = { key: UpgradeKey; type: 'single' | 'bulk' } | null

interface AutoBuyParams {
  enabled: boolean
  hoveredButton: HoveredButton
  upgrades: Upgrade[]
  levels: Record<UpgradeKey, number>
  cash: number
  handlePurchase: (key: UpgradeKey) => void
  handlePurchaseBulk: (key: UpgradeKey, quantity: number) => void
}

export function useAutoBuy({
  enabled,
  hoveredButton,
  upgrades,
  levels,
  cash,
  handlePurchase,
  handlePurchaseBulk,
}: AutoBuyParams) {
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (enabled && hoveredButton) {
      intervalRef.current = window.setInterval(() => {
        const upgrade = upgrades.find((u) => u.key === hoveredButton.key)
        if (!upgrade) return

        const level = levels[upgrade.key] ?? 0
        const locked = upgrade.maxLevel ? level >= upgrade.maxLevel : false

        if (hoveredButton.type === 'single') {
          const cost = upgrade.baseCost * Math.pow(upgrade.growth, level)
          if (!locked && cash >= cost) {
            handlePurchase(upgrade.key)
          }
        }

        if (hoveredButton.type === 'bulk') {
          const bulkCount = locked ? 0 : upgrade.maxLevel ? Math.max(0, Math.min(10, upgrade.maxLevel - level)) : 10
          let bulkCost = 0
          for (let i = 0; i < bulkCount; i += 1) {
            bulkCost += upgrade.baseCost * Math.pow(upgrade.growth, level + i)
          }
          if (bulkCount > 0 && cash >= bulkCost) {
            handlePurchaseBulk(upgrade.key, 10)
          }
        }
      }, 100)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return undefined
  }, [enabled, hoveredButton, upgrades, levels, cash, handlePurchase, handlePurchaseBulk])
}
