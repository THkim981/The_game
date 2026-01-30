import { useEffect, useRef } from 'react'
import { AUTO_BUY_TICK_MS } from '../constants'
import type { AutoBuyTarget, Upgrade, UpgradeKey } from '../types'

interface AutoBuyParams {
  targets: AutoBuyTarget[]
  upgrades: Upgrade[]
  levels: Record<UpgradeKey, number>
  cash: number
  handlePurchase: (key: UpgradeKey) => void
  handlePurchaseBulk: (key: UpgradeKey, quantity: number) => void
  intervalMs?: number
}

export function useAutoBuy({
  targets,
  upgrades,
  levels,
  cash,
  handlePurchase,
  handlePurchaseBulk,
  intervalMs = AUTO_BUY_TICK_MS,
}: AutoBuyParams) {
  const intervalRef = useRef<number | null>(null)
  const targetsRef = useRef(targets)
  const upgradesRef = useRef(upgrades)
  const levelsRef = useRef(levels)
  const cashRef = useRef(cash)
  const handlePurchaseRef = useRef(handlePurchase)
  const handlePurchaseBulkRef = useRef(handlePurchaseBulk)

  useEffect(() => {
    targetsRef.current = targets
  }, [targets])

  useEffect(() => {
    upgradesRef.current = upgrades
  }, [upgrades])

  useEffect(() => {
    levelsRef.current = levels
  }, [levels])

  useEffect(() => {
    cashRef.current = cash
  }, [cash])

  useEffect(() => {
    handlePurchaseRef.current = handlePurchase
  }, [handlePurchase])

  useEffect(() => {
    handlePurchaseBulkRef.current = handlePurchaseBulk
  }, [handlePurchaseBulk])

  useEffect(() => {
    if (targetsRef.current.length > 0) {
      intervalRef.current = window.setInterval(() => {
        const targetsNow = targetsRef.current
        const upgradesNow = upgradesRef.current
        const levelsNow = levelsRef.current
        const cashNow = cashRef.current
        const onPurchase = handlePurchaseRef.current
        const onPurchaseBulk = handlePurchaseBulkRef.current

        for (const target of targetsNow) {
          if (target.kind !== 'upgrade') continue
          const upgrade = upgradesNow.find((u) => u.key === target.key)
          if (!upgrade) continue

          const level = levelsNow[upgrade.key] ?? 0
          const locked = upgrade.maxLevel ? level >= upgrade.maxLevel : false

          if (target.type === 'single') {
            const cost = upgrade.baseCost * Math.pow(upgrade.growth, level)
            if (!locked && cashNow >= cost) {
              onPurchase(upgrade.key)
            }
          }

          if (target.type === 'bulk') {
            const bulkCount = locked
              ? 0
              : upgrade.maxLevel
                ? Math.max(0, Math.min(10, upgrade.maxLevel - level))
                : 10

            let bulkCost = 0
            for (let i = 0; i < bulkCount; i += 1) {
              bulkCost += upgrade.baseCost * Math.pow(upgrade.growth, level + i)
            }

            if (bulkCount > 0 && cashNow >= bulkCost) {
              onPurchaseBulk(upgrade.key, 10)
            }
          }
        }
      }, intervalMs)

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
  }, [intervalMs, targets.length])
}
