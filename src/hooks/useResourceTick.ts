import { useEffect } from 'react'
import { BASE_INCOME, CASH_MAX, HEAT_MAX, TICK_MS } from '../constants'
import type { Buff, Resources, UpgradeKey } from '../types'
import { clamp } from '../utils/number'
import { computeIncomeMultiplier } from './gameCalculations'

interface ResourceTickParams {
  levels: Record<UpgradeKey, number>
  chipsRatePerSec: number
  heatRatePerSec: number
  setResources: React.Dispatch<React.SetStateAction<Resources>>
  setMaxCash: React.Dispatch<React.SetStateAction<number>>
  setCashHistory: React.Dispatch<React.SetStateAction<number[]>>
  setBuffs: React.Dispatch<React.SetStateAction<Buff[]>>
  buffsRef: React.MutableRefObject<Buff[]>
  sampleAccumulator: React.MutableRefObject<number>
}

export function useResourceTick({
  levels,
  chipsRatePerSec,
  heatRatePerSec,
  setResources,
  setMaxCash,
  setCashHistory,
  setBuffs,
  buffsRef,
  sampleAccumulator,
}: ResourceTickParams) {
  useEffect(() => {
    const deltaSec = TICK_MS / 1000

    const tick = () => {
      setBuffs((prev) => {
        const now = Date.now()
        // 대부분은 '지속 버프'라 만료가 없습니다. 유한 expiresAt이 있을 때만 정리합니다.
        if (!prev.some((buff) => Number.isFinite(buff.expiresAt) && buff.expiresAt <= now)) {
          buffsRef.current = prev
          return prev
        }

        const next = prev.filter((buff) => !Number.isFinite(buff.expiresAt) || buff.expiresAt > now)
        buffsRef.current = next
        return next
      })

      let nextCashValue = 0

      setResources((prev) => {
        const activeBuffMultiplier = buffsRef.current.reduce((acc, buff) => acc * buff.multiplier, 1)
        const baseMultiplier = computeIncomeMultiplier({
          levels,
          resources: prev,
          buffMultiplier: activeBuffMultiplier,
        })
        const income = BASE_INCOME * baseMultiplier

        const nextCash = Math.min(CASH_MAX, prev.cash + income * deltaSec)
        const nextChips = prev.chips + chipsRatePerSec * deltaSec
        const nextHeat = clamp(prev.heat + heatRatePerSec * deltaSec, 0, HEAT_MAX)

        nextCashValue = nextCash

        return { ...prev, cash: nextCash, chips: nextChips, heat: nextHeat }
      })

      if (Number.isFinite(nextCashValue)) {
        setMaxCash((prev) => (nextCashValue > prev ? nextCashValue : prev))
      }

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
  }, [chipsRatePerSec, heatRatePerSec, levels, setBuffs, setCashHistory, setResources, sampleAccumulator, buffsRef])
}
