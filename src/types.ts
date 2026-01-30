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
    fail: number
    crash: number
  }
  reward: {
    jackpotBuff: number
    successBuff: number
    insightFactor: {
      jackpot: number
      success: number
      fail: number
      crash: number
    }
  }
}

export type Tone = 'good' | 'warn' | 'bad'

export type AutoBuyTarget =
  | { kind: 'upgrade'; key: UpgradeKey; type: 'single' | 'bulk' }
  | { kind: 'convert'; key: 'cashToChips' | 'cashToHeat' }
