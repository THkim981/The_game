import { useMemo } from 'react'
import type { Resources, RiskTier, Tone } from '../types'
import { createRollOutcome } from './riskHandlers'

type RollOutcomeParams = {
  resourcesRef: React.MutableRefObject<Resources>
  setResources: React.Dispatch<React.SetStateAction<Resources>>
  addBuff: (multiplier: number, expiresAtMs: number) => void
  setPermBoost: React.Dispatch<React.SetStateAction<number>>
  pushToast: (tone: Tone, title: string, detail: string) => void
  triggerFx: (tone: Tone) => void
  adjustProbs: (tier: RiskTier) => { jackpot: number; success: number; neutral: number; fail: number; crash: number }
}

export function useRollOutcome(params: RollOutcomeParams) {
  const { resourcesRef, setResources, addBuff, setPermBoost, pushToast, triggerFx, adjustProbs } = params

  return useMemo(
    () =>
      createRollOutcome({
        getResources: () => resourcesRef.current,
        spendResources: (tier) => setResources((prev) => ({ ...prev, chips: prev.chips - tier.cost, heat: 0 })),
        gainInsight: (amount) => setResources((prev) => ({ ...prev, insight: prev.insight + amount })),
        shiftLuck: (delta) =>
          setResources((prev) => ({
            ...prev,
            luck: Math.max(0, Math.min(100, prev.luck + delta)),
          })),
        addBuff,
        addPermBoost: (delta) => setPermBoost((p) => p + delta),
        pushToast,
        triggerFx,
        adjustProbs,
      }),
    [adjustProbs, addBuff, pushToast, resourcesRef, setPermBoost, setResources, triggerFx],
  )
}
