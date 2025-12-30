import type { Buff, RiskTier, Upgrade, UpgradeKey } from './types'

export const HEAT_MAX = 100
export const BASE_INCOME = 14 // C/s
export const BASE_CHIP_RATE = 1 / 30 // G/s
export const BASE_HEAT_RATE = HEAT_MAX / 180 // reach 100 in ~3 minutes baseline
export const TICK_MS = 200 // resource updates every 0.2s

export const upgrades: Upgrade[] = [
  {
    key: 'printer',
    name: '프린터',
    description: '기본 수익 +10%/레벨',
    baseCost: 60,
    growth: 1.12,
  },
  {
    key: 'vault',
    name: '금고 확장',
    description: '곱연산 +5%p/레벨',
    baseCost: 200,
    growth: 1.14,
  },
  {
    key: 'autoCollector',
    name: '자동 수금',
    description: '수익 +5%p/레벨 (최대 20)',
    baseCost: 100,
    growth: 1.14,
    maxLevel: 20,
  },
  {
    key: 'battery',
    name: '오프라인 배터리',
    description: 'Heat 충전 +10%/레벨',
    baseCost: 260,
    growth: 1.16,
  },
  {
    key: 'refinery',
    name: '칩 정제',
    description: 'Chips 생성 +5%p/레벨',
    baseCost: 200,
    growth: 1.15,
  },
  {
    key: 'interest',
    name: '이자 계약',
    description: '보유 Cash 기반 로그 보너스',
    baseCost: 260,
    growth: 1.18,
  },
]

export const upgradeHelp: Record<UpgradeKey, string> = {
  printer: '기본 수익: I = B * (1 + 0.10*Lv). B=14 C/s. 레벨당 +10% 가산 후 전체 곱에 반영.',
  vault: '곱연산 보정: 전체 수익에 (1 + 0.05*Lv) 곱. 다른 보정과 곱연산으로 중첩.',
  autoCollector: '수익 가산 +5%p/레벨(최대 20레벨). 클릭 없이 자동 수금. 상한 이후 추가 상승 없음.',
  battery: 'Heat 충전: 기본 100/180초 → (1 + 0.10*Lv) 배. 도박 버튼 활성 주기가 짧아짐.',
  refinery: 'Chips 생성: 기본 1G/30s → (1 + 0.05*Lv) 배. 최소 생성량을 서서히 올려줌.',
  interest: '보유 Cash 로그 보너스: R = 0.1 * log10(1 + Cash/1000) * (1 + 0.07*Lv). 전체 수익에 곱함.',
}

export const riskTiers: RiskTier[] = [
  {
    key: 'low',
    label: '낮음',
    cost: 10,
    baseProbs: { jackpot: 0.05, success: 0.6, neutral: 0, fail: 0.25, crash: 0.1 },
    reward: {
      jackpotBuff: 1.8,
      successBuff: 1.35,
      buffMinutes: 10,
      insightFactor: { jackpot: 1.0, success: 0.8, neutral: 0.5, fail: 1.0, crash: 1.4 },
      chipRefund: { neutral: 0.6 },
    },
    cooldownSeconds: 60,
  },
  {
    key: 'mid',
    label: '중간',
    cost: 25,
    baseProbs: { jackpot: 0.08, success: 0.57, neutral: 0, fail: 0.22, crash: 0.13 },
    reward: {
      jackpotBuff: 2.6,
      successBuff: 1.7,
      buffMinutes: 10,
      insightFactor: { jackpot: 1.4, success: 1.1, neutral: 0.8, fail: 1.6, crash: 2.2 },
      chipRefund: { neutral: 0.4 },
    },
    cooldownSeconds: 120,
  },
  {
    key: 'high',
    label: '극단',
    cost: 60,
    baseProbs: { jackpot: 0.15, success: 0.5, neutral: 0, fail: 0.2, crash: 0.15 },
    reward: {
      jackpotBuff: 5,
      successBuff: 2.4,
      buffMinutes: 10,
      permBoost: 0.02,
      insightFactor: { jackpot: 2.2, success: 1.7, neutral: 1.2, fail: 2.8, crash: 4.0 },
      chipRefund: { neutral: 0.2 },
    },
    cooldownSeconds: 180,
  },
  {
    key: 'ultra',
    label: '초극단',
    cost: 150,
    baseProbs: { jackpot: 0.18, success: 0.45, neutral: 0, fail: 0.2, crash: 0.17 },
    reward: {
      jackpotBuff: 7.5,
      successBuff: 3.2,
      buffMinutes: 12,
      permBoost: 0.03,
      insightFactor: { jackpot: 3.0, success: 2.2, neutral: 1.5, fail: 3.5, crash: 5.0 },
      chipRefund: { neutral: 0 },
    },
    cooldownSeconds: 300,
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
  autoCollector: 0,
  battery: 0,
  refinery: 0,
  interest: 0,
}

export const initialBuffs: Buff[] = []
