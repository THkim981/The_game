export type UpgradeKey =
  | 'printer'
  | 'vault'
  | 'battery'
  | 'refinery'

export type Upgrade = {
  key: UpgradeKey
  name: string
  description: string
  baseCost: number
  growth: number
  maxLevel?: number
}

export type Resources = {
  cash: number
  chips: number
  heat: number
  luck: number
  insight: number
  prestige: number
}

export type Buff = {
  id: string
  multiplier: number
  expiresAt: number
}

export type RiskKey = 'low' | 'mid' | 'high' | 'ultra'

export type RiskTier = {
  key: RiskKey
  label: string
  cost: number
  baseProbs: {
    jackpot: number
    success: number
    neutral: number
    fail: number
    crash: number
  }
  reward: {
    jackpotBuff: number
    successBuff: number
    buffMinutes: number
    insightFactor: {
      jackpot: number
      success: number
      neutral: number
      fail: number
      crash: number
    }
    chipRefund: { neutral: number }
    permBoost?: number
  }
}

export type Tone = 'good' | 'warn' | 'bad'
