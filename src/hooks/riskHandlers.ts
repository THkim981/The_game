import { HEAT_MAX } from '../constants'
import type { RiskTier, Tone } from '../types'

interface RiskDeps {
  getResources: () => { heat: number; chips: number; luck: number; insight: number }
  spendResources: (tier: RiskTier) => void
  gainInsight: (amount: number) => void
  shiftLuck: (delta: number) => void
  addBuff: (multiplier: number) => void
  pushToast: (tone: Tone, title: string, detail: string) => void
  triggerFx: (tone: Tone) => void
  adjustProbs: (tier: RiskTier) => RiskTier['baseProbs']
}

export function createRollOutcome({
  getResources,
  spendResources,
  gainInsight,
  shiftLuck,
  addBuff,
  pushToast,
  triggerFx,
  adjustProbs,
}: RiskDeps) {
  return (tier: RiskTier) => {
    const snapshot = getResources()
    if (snapshot.heat < HEAT_MAX || snapshot.chips < tier.cost) return

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

    spendResources(tier)
    applyOutcome({ tier, outcome, gainInsight, shiftLuck, addBuff, pushToast, triggerFx })
  }
}

function applyOutcome(params: {
  tier: RiskTier
  outcome: keyof RiskTier['baseProbs']
  gainInsight: (amount: number) => void
  shiftLuck: (delta: number) => void
  addBuff: (multiplier: number) => void
  pushToast: (tone: Tone, title: string, detail: string) => void
  triggerFx: (tone: Tone) => void
}) {
  const { tier, outcome, gainInsight, shiftLuck, addBuff, pushToast, triggerFx } = params
  const { reward } = tier
  const insightGain = tier.cost * reward.insightFactor[outcome]

  if (outcome === 'jackpot') {
    addBuff(reward.jackpotBuff)
    gainInsight(insightGain)
    shiftLuck(-35)
    pushToast('good', '대성공!', `부스트 x${reward.jackpotBuff.toFixed(1)} / Insight +${insightGain.toFixed(1)}`)
    triggerFx('good')
    return
  }

  if (outcome === 'success') {
    addBuff(reward.successBuff)
    gainInsight(insightGain)
    shiftLuck(-35)
    pushToast('good', '성공', `부스트 x${reward.successBuff.toFixed(2)} / Insight +${insightGain.toFixed(1)}`)
    triggerFx('good')
    return
  }

  if (outcome === 'fail') {
    gainInsight(insightGain)
    shiftLuck(22)
    pushToast('bad', '실패', `Insight +${insightGain.toFixed(1)} · Luck 상승`)
    triggerFx('bad')
    return
  }

  gainInsight(insightGain)
  shiftLuck(40)
  pushToast('bad', '대실패', `Insight +${insightGain.toFixed(1)} · Luck 크게 상승`)
  triggerFx('bad')
}
