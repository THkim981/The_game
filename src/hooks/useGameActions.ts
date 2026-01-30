import { useMemo } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Buff, Resources, Tone, Upgrade, UpgradeKey } from '../types'
import { buildGameActions } from './gameActions'

type Params = {
  getResources: () => Resources
  setResources: (updater: (prev: Resources) => Resources) => void
  getLevels: () => Record<UpgradeKey, number>
  setLevels: (updater: (prev: Record<UpgradeKey, number>) => Record<UpgradeKey, number>) => void
  setBuffs: (updater: (prev: Buff[]) => Buff[]) => void
  getPermLuck: () => number
  setPermLuck: (value: number) => void
  setSnapKey: Dispatch<SetStateAction<number>>
  setOpenHelp: Dispatch<SetStateAction<UpgradeKey | null>>
  setFx: Dispatch<SetStateAction<null | { tone: Tone; key: number }>>
  setToast: Dispatch<SetStateAction<null | { title: string; detail: string; tone: Tone; key: number }>>
  toastTimeout: MutableRefObject<number | null>
  getConversionCosts: () => { cashToChips: number; cashToHeat: number }
  effectiveUpgrades: Upgrade[]
  initialResources: Resources
  initialLevels: Record<UpgradeKey, number>
  onAfterPrestige: () => void
}

export function useGameActions(params: Params) {
  const {
    getResources,
    setResources,
    getLevels,
    setLevels,
    setBuffs,
    getPermLuck,
    setPermLuck,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    getConversionCosts,
    effectiveUpgrades,
    initialResources,
    initialLevels,
    onAfterPrestige,
  } = params

  return useMemo(() => {
    return buildGameActions({
      getResources,
      setResources,
      getLevels,
      setLevels,
      setBuffs,
      getPermLuck,
      setPermLuck,
      setSnapKey,
      setOpenHelp,
      setFx,
      setToast,
      toastTimeout,
      getConversionCosts,
      effectiveUpgrades,
      initialResources,
      initialLevels,
      onAfterPrestige,
    })
  }, [
    getResources,
    setResources,
    getLevels,
    setLevels,
    setBuffs,
    getPermLuck,
    setPermLuck,
    setSnapKey,
    setOpenHelp,
    setFx,
    setToast,
    toastTimeout,
    getConversionCosts,
    effectiveUpgrades,
    initialResources,
    initialLevels,
    onAfterPrestige,
  ])
}
