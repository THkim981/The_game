import type { Buff, Resources, UpgradeKey } from '../types'
import type { ProfileStats, SavedGameState } from '../utils/profileStorage'

export type BuildSaveInput = {
  resources: Resources
  levels: Record<UpgradeKey, number>
  buffs: Buff[]
  permLuck: number
  maxCash: number
  cashHistory: number[]
  runStartMs: number
  runMaxCash: number
  rankPromptSeconds: number | null
  sessionElapsedSeconds: number
}

export function buildSavedGameState(input: BuildSaveInput): SavedGameState {
  return {
    version: 1,
    savedAt: Date.now(),
    resources: input.resources,
    levels: input.levels,
    buffs: input.buffs,
    permLuck: input.permLuck,
    maxCash: input.maxCash,
    cashHistory: input.cashHistory,
    runStartMs: input.runStartMs,
    runMaxCash: input.runMaxCash,
    rankPromptSeconds: input.rankPromptSeconds,
    sessionElapsedSeconds: input.sessionElapsedSeconds,
  }
}

export function computeActiveGambleMultiplier(buffMultiplier: number): number {
  return buffMultiplier
}

export function buildStatsPatch(input: {
  activeGambleMultiplier: number
  prestige: number
  permLuck: number
  cash: number
}): Partial<ProfileStats> {
  return {
    lastActiveGambleMultiplier: input.activeGambleMultiplier,
    lastPrestige: input.prestige,
    lastPermLuck: input.permLuck,
    lastCash: input.cash,
  }
}
