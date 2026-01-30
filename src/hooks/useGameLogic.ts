import { useGameLogicCore } from './useGameLogicCore'
import type { GameLogicOptions } from './useGameLogicCore'

export type { GameLogicOptions }

export function useGameLogic(profileId: string, options?: GameLogicOptions) {
	return useGameLogicCore(profileId, options)
}
