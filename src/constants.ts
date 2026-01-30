import type { Buff, RiskTier, Upgrade, UpgradeKey } from './types'

export const HEAT_MAX = 100
export const CASH_MAX = 1e250
export const CASH_RANK_TARGET = 1e100
export const BASE_INCOME = 10 // C/s
export const BASE_CHIP_RATE = 1 / 30 // G/s
export const BASE_HEAT_RATE = HEAT_MAX / 180 // reach 100 in ~3 minutes baseline
export const TICK_MS = 200 // resource updates every 200ms
export const AUTO_BUY_TICK_MS = 100
export const AUTO_RISK_TICK_MS = 100
export const SNAPSHOT_MS = 200
export const AUTO_SAVE_MS = 600_000

export const upgrades: Upgrade[] = [
  {
    key: 'printer',
    name: '프린터',
    description: '기본 수익 +10%/LV',
    baseCost: 60,
    growth: 1.12,
  },
  {
    key: 'vault',
    name: '금고 확장',
    description: '곱연산 +5%/LV',
    baseCost: 200,
    growth: 1.14,
  },
  {
    key: 'battery',
    name: 'Heat 배터리',
    description: 'Heat +3%/LV',
    baseCost: 260,
    growth: 1.16,
  },
  {
    key: 'refinery',
    name: 'Gold 정제',
    description: 'Gold +10%/LV',
    baseCost: 200,
    growth: 1.15,
  },
]

export const upgradeHelp: Record<UpgradeKey, string> = {
  printer: '기본 수익: I = B * (1 + 0.10*Lv). B=10 C/s. 레벨당 +10% 가산.',
  vault: '곱연산 보정: 전체 수익에 (1 + 0.05*Lv) 곱. 다른 보정과 곱연산으로 중첩.',
  battery: 'Heat 충전: 기본 100/180초 → (1 + 0.03*Lv) 배. 도박 버튼 활성 주기가 짧아짐.',
  refinery: 'Gold 생성: 기본 1G/30s → (1 + 0.10*Lv) 배. 최소 생성량을 서서히 올려줌.',
}

export const riskTiers: RiskTier[] = [
  {
    key: 'low',
    label: '낮음',
    cost: 10,
    baseProbs: { jackpot: 0.25, success: 0.6, fail: 0.1, crash: 0.05 },
    reward: {
      jackpotBuff: 1.8,
      successBuff: 1.35,
      insightFactor: { jackpot: 2.2, success: 1.8, fail: 2.2, crash: 2.8 },
    },
  },
  {
    key: 'mid',
    label: '중간',
    cost: 25,
    baseProbs: { jackpot: 0.20, success: 0.57, fail: 0.15, crash: 0.08 },
    reward: {
      jackpotBuff: 2.6,
      successBuff: 1.7,
      insightFactor: { jackpot: 1.7, success: 1.4, fail: 1.9, crash: 2.4 },
    },
  },
  {
    key: 'high',
    label: '극단',
    cost: 60,
    baseProbs: { jackpot: 0.19, success: 0.5, fail: 0.21, crash: 0.15 },
    reward: {
      jackpotBuff: 5,
      successBuff: 2.4,
      insightFactor: { jackpot: 1.3, success: 1.1, fail: 1.6, crash: 2.0 },
    },
  },
  {
    key: 'ultra',
    label: '초극단',
    cost: 150,
    baseProbs: { jackpot: 0.18, success: 0.45, fail: 0.2, crash: 0.17 },
    reward: {
      jackpotBuff: 7.5,
      successBuff: 3.2,
      insightFactor: { jackpot: 1.1, success: 0.95, fail: 1.4, crash: 1.8 },
    },
  },
]

export const initialResources = {
  cash: 420,
  chips: 16,
  heat: 0,
  luck: 0,
  insight: 0,
  prestige: 0,
}

export const initialLevels: Record<UpgradeKey, number> = {
  printer: 0,
  vault: 0,
  battery: 0,
  refinery: 0,
}

export const initialBuffs: Buff[] = []
