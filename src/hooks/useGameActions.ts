import { useMemo } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Buff, Resources, Tone, Upgrade, UpgradeKey } from '../types'
import { buildGameActions } from './gameActions'

type Params = {
  getResources: () => Resources
  setResources: Dispatch<SetStateAction<Resources>>
  levels: Record<UpgradeKey, number>
  setLevels: Dispatch<SetStateAction<Record<UpgradeKey, number>>>
  setBuffs: Dispatch<SetStateAction<Buff[]>>
  buffsRef: MutableRefObject<Buff[]>
  permLuck: number
  setPermLuck: Dispatch<SetStateAction<number>>
  setSnapKey: Dispatch<SetStateAction<number>>
  setOpenHelp: Dispatch<SetStateAction<UpgradeKey | null>>
  setFx: Dispatch<SetStateAction<null | { tone: Tone; key: number }>>
  setToast: Dispatch<SetStateAction<null | { title: string; detail: string; tone: Tone; key: number }>>
  toastTimeout: MutableRefObject<number | null>
  conversionCosts: { multiplier: number; cashToChips: number; cashToHeat: number }
  effectiveUpgrades: Upgrade[]
  initialResources: Resources
  initialLevels: Record<UpgradeKey, number>
  onAfterPrestige: () => void
}

export function useGameActions(params: Params) {
  const {
    getResources,
    setResources,
    levels,
    setLevels,
    setBuffs,
    buffsRef,
    permLuck,
    setPermLuck,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    conversionCosts,
    effectiveUpgrades,
    initialResources,
    initialLevels,
    onAfterPrestige,
  } = params

  return useMemo(() => {
    return buildGameActions({
      getResources,
      setResources,
      levels,
      setLevels,
      setBuffs,
      buffsRef,
      permLuck,
      setPermLuck,
      setSnapKey,
      setOpenHelp,
      setFx,
      setToast,
      toastTimeout,
      conversionCosts,
      effectiveUpgrades,
      initialResources,
      initialLevels,
      onAfterPrestige,
    })
  }, [
    getResources,
    setResources,
    levels,
    setLevels,
    setBuffs,
    buffsRef,
    permLuck,
    setPermLuck,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    conversionCosts,
    effectiveUpgrades,
    initialResources,
    initialLevels,
    onAfterPrestige,
  ])
}
