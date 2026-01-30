import { useRef, useState } from 'react'

import { initialBuffs, initialLevels, initialResources } from '../constants'
import type { AutoBuyTarget, Buff, Resources, Tone, UpgradeKey, RiskTier } from '../types'

type GameStateRefsResult = {
  refs: {
    resourcesRef: React.MutableRefObject<Resources>
    levelsRef: React.MutableRefObject<Record<UpgradeKey, number>>
    buffsRef: React.MutableRefObject<Buff[]>
    permLuckRef: React.MutableRefObject<number>
    maxCashRef: React.MutableRefObject<number>
    cashHistoryRef: React.MutableRefObject<number[]>
    runStartMsRef: React.MutableRefObject<number>
    runMaxCashRef: React.MutableRefObject<number>
    elapsedSecondsRef: React.MutableRefObject<number>
    startTimeRef: React.MutableRefObject<number>
    sampleAccumulatorRef: React.MutableRefObject<number>
    gambleSampleMsRef: React.MutableRefObject<number>
    gambleCountRef: React.MutableRefObject<number>
    gamblePerSecRef: React.MutableRefObject<number>
    autoBuyTargetsRef: React.MutableRefObject<AutoBuyTarget[]>
    autoRiskKeyRef: React.MutableRefObject<RiskTier['key'] | null>
  }
  state: {
    resources: Resources
    levels: Record<UpgradeKey, number>
    buffs: Buff[]
    permLuck: number
    maxCash: number
    cashHistory: number[]
    runStartMs: number
    runMaxCash: number
    elapsedSeconds: number
    gamblePerSec: number
    rankPromptOpen: boolean
    rankPromptSeconds: number | null
    snapKey: number
    toast: null | { title: string; detail: string; tone: Tone; key: number }
    fx: null | { tone: Tone; key: number }
    openHelp: UpgradeKey | null
  }
  setters: {
    setResources: React.Dispatch<React.SetStateAction<Resources>>
    setLevels: React.Dispatch<React.SetStateAction<Record<UpgradeKey, number>>>
    setBuffs: React.Dispatch<React.SetStateAction<Buff[]>>
    setPermLuck: React.Dispatch<React.SetStateAction<number>>
    setMaxCash: React.Dispatch<React.SetStateAction<number>>
    setCashHistory: React.Dispatch<React.SetStateAction<number[]>>
    setRunStartMs: React.Dispatch<React.SetStateAction<number>>
    setRunMaxCash: React.Dispatch<React.SetStateAction<number>>
    setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>
    setGamblePerSec: React.Dispatch<React.SetStateAction<number>>
    setRankPromptOpen: React.Dispatch<React.SetStateAction<boolean>>
    setRankPromptSeconds: React.Dispatch<React.SetStateAction<number | null>>
    setSnapKey: React.Dispatch<React.SetStateAction<number>>
    setToast: React.Dispatch<React.SetStateAction<null | { title: string; detail: string; tone: Tone; key: number }>>
    setFx: React.Dispatch<React.SetStateAction<null | { tone: Tone; key: number }>>
    setOpenHelp: React.Dispatch<React.SetStateAction<UpgradeKey | null>>
  }
  toastTimeout: React.MutableRefObject<number | null>
}

export function useGameStateRefs(): GameStateRefsResult {
  const resourcesRef = useRef<Resources>(initialResources)
  const levelsRef = useRef<Record<UpgradeKey, number>>(initialLevels)
  const buffsRef = useRef<Buff[]>(initialBuffs)
  const permLuckRef = useRef(0)
  const maxCashRef = useRef(initialResources.cash)
  const cashHistoryRef = useRef<number[]>([initialResources.cash])
  const runStartMsRef = useRef(Date.now())
  const runMaxCashRef = useRef(initialResources.cash)
  const elapsedSecondsRef = useRef(0)
  const startTimeRef = useRef(Date.now())
  const sampleAccumulatorRef = useRef(0)
  const gambleSampleMsRef = useRef(0)
  const gambleCountRef = useRef(0)
  const gamblePerSecRef = useRef(0)
  const autoBuyTargetsRef = useRef<AutoBuyTarget[]>([])
  const autoRiskKeyRef = useRef<null | RiskTier['key']>(null)

  const [resources, setResources] = useState<Resources>(resourcesRef.current)
  const [levels, setLevels] = useState<Record<UpgradeKey, number>>(levelsRef.current)
  const [buffs, setBuffs] = useState<Buff[]>(buffsRef.current)
  const [permLuck, setPermLuck] = useState(permLuckRef.current)
  const [maxCash, setMaxCash] = useState(maxCashRef.current)
  const [cashHistory, setCashHistory] = useState<number[]>(cashHistoryRef.current)
  const [runStartMs, setRunStartMs] = useState(runStartMsRef.current)
  const [runMaxCash, setRunMaxCash] = useState(runMaxCashRef.current)
  const [elapsedSeconds, setElapsedSeconds] = useState(elapsedSecondsRef.current)
  const [gamblePerSec, setGamblePerSec] = useState(gamblePerSecRef.current)
  const [rankPromptOpen, setRankPromptOpen] = useState(false)
  const [rankPromptSeconds, setRankPromptSeconds] = useState<number | null>(null)
  const [snapKey, setSnapKey] = useState(0)
  const [toast, setToast] = useState<null | { title: string; detail: string; tone: Tone; key: number }>(null)
  const toastTimeout = useRef<number | null>(null)
  const [fx, setFx] = useState<null | { tone: Tone; key: number }>(null)
  const [openHelp, setOpenHelp] = useState<UpgradeKey | null>(null)

  return {
    refs: {
      resourcesRef,
      levelsRef,
      buffsRef,
      permLuckRef,
      maxCashRef,
      cashHistoryRef,
      runStartMsRef,
      runMaxCashRef,
      elapsedSecondsRef,
      startTimeRef,
      sampleAccumulatorRef,
      gambleSampleMsRef,
      gambleCountRef,
      gamblePerSecRef,
      autoBuyTargetsRef,
      autoRiskKeyRef,
    },
    state: {
      resources,
      levels,
      buffs,
      permLuck,
      maxCash,
      cashHistory,
      runStartMs,
      runMaxCash,
      elapsedSeconds,
      gamblePerSec,
      rankPromptOpen,
      rankPromptSeconds,
      snapKey,
      toast,
      fx,
      openHelp,
    },
    setters: {
      setResources,
      setLevels,
      setBuffs,
      setPermLuck,
      setMaxCash,
      setCashHistory,
      setRunStartMs,
      setRunMaxCash,
      setElapsedSeconds,
      setGamblePerSec,
      setRankPromptOpen,
      setRankPromptSeconds,
      setSnapKey,
      setToast,
      setFx,
      setOpenHelp,
    },
    toastTimeout,
  }
}
