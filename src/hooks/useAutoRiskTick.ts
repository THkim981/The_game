import { useEffect, useRef } from 'react'

import { AUTO_RISK_TICK_MS, HEAT_MAX } from '../constants'
import type { Resources, RiskTier } from '../types'

interface AutoRiskTickParams {
  autoRiskTier: RiskTier | null
  resourcesRef: React.MutableRefObject<Resources>
  rollOutcome: (tier: RiskTier) => void
  intervalMs?: number
}

export function useAutoRiskTick({
  autoRiskTier,
  resourcesRef,
  rollOutcome,
  intervalMs = AUTO_RISK_TICK_MS,
}: AutoRiskTickParams) {
  const autoRiskTierRef = useRef(autoRiskTier)
  const rollOutcomeRef = useRef(rollOutcome)

  useEffect(() => {
    autoRiskTierRef.current = autoRiskTier
  }, [autoRiskTier])

  useEffect(() => {
    rollOutcomeRef.current = rollOutcome
  }, [rollOutcome])

  useEffect(() => {
    if (!autoRiskTier) return undefined

    const id = window.setInterval(() => {
      const tier = autoRiskTierRef.current
      if (!tier) return

      const { heat, chips } = resourcesRef.current
      const ready = heat >= HEAT_MAX && chips >= tier.cost
      if (ready) rollOutcomeRef.current(tier)
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [autoRiskTier, intervalMs, resourcesRef])
}
