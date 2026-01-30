import type { AutoBuyTarget, Buff, Resources, RiskTier, Upgrade, UpgradeKey } from '../types'
import type { GameActions } from './gameActions'

type GameLogicResultParams = {
  state: {
    resources: Resources
    levels: Record<UpgradeKey, number>
    buffs: Buff[]
    permLuck: number
    cashHistory: number[]
    maxCash: number
    toast: null | { title: string; detail: string; tone: 'good' | 'bad' | 'warn'; key: number }
    fx: null | { tone: 'good' | 'bad' | 'warn'; key: number }
    openHelp: UpgradeKey | null
  }
  derived: {
    incomeMultiplier: number
    buffMultiplier: number
    conversionCosts: { multiplier: number; cashToChips: number; cashToHeat: number }
    incomeInsightBonus: number
    elapsedSeconds: number
    gamblePerSec: number
    adjustProbs: (tier: RiskTier) => RiskTier['baseProbs']
    prestigeGain: number
    snapKey: number
    chipsRatePerSec: number
    heatFullChargeSeconds: number
    heatRatePerSec: number
    permLuckCap: number
    nextPermLuckCost: number
    maxCash: number
    rankPromptOpen: boolean
    rankPromptSeconds: number | null
  }
  actions: {
    setOpenHelp: (value: UpgradeKey | null) => void
    setAutoBuyTargets: (targets: AutoBuyTarget[]) => void
    setAutoRiskKey: (key: RiskTier['key'] | null) => void
    requestSnapshot: () => void
    handlePurchase: GameActions['handlePurchase']
    handlePurchaseBulk: GameActions['handlePurchaseBulk']
    rollOutcome: (tier: RiskTier) => void
    convertCashToChips: GameActions['convertCashToChips']
    convertCashToHeat: GameActions['convertCashToHeat']
    setCashAbsolute: GameActions['setCashAbsolute']
    grantResources: GameActions['grantResources']
    performPrestige: GameActions['performPrestige']
    buyPermanentLuck: GameActions['buyPermanentLuck']
    saveRankTime: (nickname?: string) => void
    dismissRankTime: () => void
    manualSave: () => void
    resetProgress: () => void
  }
  data: {
    upgrades: Upgrade[]
    upgradeHelp: Record<UpgradeKey, string>
    riskTiers: RiskTier[]
  }
}

export function buildGameLogicResult(params: GameLogicResultParams) {
  const { state, derived, actions, data } = params
  return { state, derived, actions, data }
}
