import './App.css'

import { useEffect, useMemo, useState } from 'react'

import { HeroHeader } from './components/HeroHeader'
import { RankPromptModal } from './components/RankPromptModal'
import { ResourceSection } from './components/ResourceSection'
import { SettingsModal } from './components/SettingsModal'
import { RiskSection } from './components/RiskSection'
import { FxOverlay, Toast } from './components/ToastFx'
import { UpgradesSection } from './components/UpgradesSection'
import { BASE_INCOME } from './constants'
import type { AutoBuyTarget } from './types'
import { useCoupons } from './hooks/useCoupons'
import { useGameLogic } from './hooks/useGameLogic'
import type { RiskKey, UpgradeKey } from './types'
import { getOrCreateAnonUserId } from './utils/anonUser'
import type { NumberFormatStyle } from './utils/number'
import { formatNumber, getNumberFormatStyle, setNumberFormatStyle } from './utils/number'

type GameAppProps = {
  profileId: string
}

function GameApp({ profileId }: GameAppProps) {
  const [outcomeTextDisabled, setOutcomeTextDisabled] = useState(() => {
    try {
      return localStorage.getItem('ui_outcome_text_disabled') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('ui_outcome_text_disabled', outcomeTextDisabled ? '1' : '0')
    } catch {
      // ignore
    }
  }, [outcomeTextDisabled])

  const {
    state: { resources, levels, toast, fx, openHelp, permLuck, cashHistory },
    derived: {
      incomeMultiplier,
      buffMultiplier,
      incomeInsightBonus,
      conversionCosts,
      elapsedSeconds,
      gamblePerSec,
      adjustProbs,
      prestigeGain,
      snapKey,
      chipsRatePerSec,
      heatFullChargeSeconds,
      nextPermLuckCost,
      permLuckCap,
      maxCash,
      rankPromptOpen,
      rankPromptSeconds,
    },
    actions: {
      setOpenHelp,
      setAutoBuyTargets,
      setAutoRiskKey,
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome,
      convertCashToChips,
      convertCashToHeat,
      setCashAbsolute,
      performPrestige,
      buyPermanentLuck,
      requestSnapshot,
      saveRankTime,
      dismissRankTime,
      manualSave,
      grantResources,
    },
    data: { upgrades, upgradeHelp, riskTiers },
  } = useGameLogic(profileId, { outcomeTextDisabled })

  const { applyCoupon } = useCoupons({ profileId, grantResources })

  const penguinCashThresholds = useMemo(() => [1e10, 1e16, 1e28, 1e40, 1e51], [])
  const penguinLevel = useMemo(() => {
    let level = 1
    // Each threshold unlocks the next level.
    // e.g. 1e10 => Lv2, 1e16 => Lv3, ... 1e51 => Lv6
    for (let i = 0; i < penguinCashThresholds.length; i += 1) {
      if (maxCash >= penguinCashThresholds[i]) {
        level = i + 2
      } else {
        break
      }
    }
    return Math.min(penguinCashThresholds.length + 1, Math.max(1, level))
  }, [maxCash, penguinCashThresholds])

  const [autoBuyByButton, setAutoBuyByButton] = useState<Record<UpgradeKey, { single: boolean; bulk: boolean }>>(() => ({
    printer: { single: false, bulk: false },
    vault: { single: false, bulk: false },
    battery: { single: false, bulk: false },
    refinery: { single: false, bulk: false },
  }))


  const autoBuyTargets = useMemo<AutoBuyTarget[]>(() => {
    const targets: AutoBuyTarget[] = []
    for (const upgrade of upgrades) {
      const config = autoBuyByButton[upgrade.key]
      if (config?.single) targets.push({ kind: 'upgrade', key: upgrade.key, type: 'single' })
      if (config?.bulk) targets.push({ kind: 'upgrade', key: upgrade.key, type: 'bulk' })
    }
    return targets
  }, [upgrades, autoBuyByButton])

  const setAutoBuyEnabled = (key: UpgradeKey, type: 'single' | 'bulk', enabled: boolean) => {
    setAutoBuyByButton((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: enabled,
      },
    }))
  }

  const convertCashToChipsImmediate = () => {
    convertCashToChips()
    requestSnapshot()
  }

  const convertCashToHeatImmediate = () => {
    convertCashToHeat()
    requestSnapshot()
  }
  const [selectedAutoRisk, setSelectedAutoRisk] = useState<RiskKey | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [animationsDisabled, setAnimationsDisabled] = useState(false)
  const [featureView, setFeatureView] = useState<'penguin' | 'chart'>('penguin')
  const [numberFormatStyle, setNumberFormatStyleState] = useState<NumberFormatStyle>(() => getNumberFormatStyle())
  const [collapsed, setCollapsed] = useState({
    resources: false,
    upgrades: false,
    risks: false,
  })

  useEffect(() => {
    setNumberFormatStyle(numberFormatStyle)
  }, [numberFormatStyle])

  const totalLuck = Math.min(100, resources.luck + permLuck)

  const performPrestigeImmediate = () => {
    performPrestige()
    requestSnapshot()
  }

  useEffect(() => {
    setAutoBuyTargets(autoBuyTargets)
  }, [autoBuyTargets, setAutoBuyTargets])

  useEffect(() => {
    setAutoRiskKey(selectedAutoRisk)
  }, [selectedAutoRisk, setAutoRiskKey])

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (v: number) => v.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const incomeValue = BASE_INCOME * incomeMultiplier

  return (
    <div className={`page ${animationsDisabled ? 'no-anim' : ''}`}>
      <HeroHeader
        formatDuration={formatDuration}
        incomeValue={incomeValue}
        insightBonus={incomeInsightBonus}
        luck={totalLuck}
        buffMultiplier={buffMultiplier}
        elapsedSeconds={elapsedSeconds}
        prestige={resources.prestige}
        prestigeGain={prestigeGain}
        snapKey={snapKey}
        formatNumber={formatNumber}
        onOpenSettings={() => setSettingsOpen(true)}
        animationsDisabled={animationsDisabled}
        permLuck={permLuck}
      />

      <ResourceSection
        resources={resources}
        snapKey={snapKey}
        penguinLevel={penguinLevel}
        chipsRatePerSec={chipsRatePerSec}
        cashToChipsCost={conversionCosts.cashToChips}
        cashToHeatCost={conversionCosts.cashToHeat}
        conversionCostMultiplier={conversionCosts.multiplier}
        heatFullChargeSeconds={heatFullChargeSeconds}
        collapsed={collapsed.resources}
        onToggle={() => setCollapsed((prev) => ({ ...prev, resources: !prev.resources }))}
        formatNumber={formatNumber}
        convertCashToChips={convertCashToChipsImmediate}
        convertCashToHeat={convertCashToHeatImmediate}
        animationsDisabled={animationsDisabled}
        featureView={featureView}
        cashHistory={cashHistory}
        totalLuck={totalLuck}
        permLuck={permLuck}
      />

      <UpgradesSection
        upgrades={upgrades}
        upgradeHelp={upgradeHelp}
        levels={levels}
        resources={resources}
        openHelp={openHelp}
        setOpenHelp={setOpenHelp}
        handlePurchase={handlePurchase}
        handlePurchaseBulk={handlePurchaseBulk}
        autoBuyByButton={autoBuyByButton}
        setAutoBuyEnabled={setAutoBuyEnabled}
        performPrestige={performPrestigeImmediate}
        prestigeGain={prestigeGain}
        permLuck={permLuck}
        permLuckCap={permLuckCap}
        nextPermLuckCost={nextPermLuckCost}
        buyPermanentLuck={buyPermanentLuck}
        totalLuck={totalLuck}
        collapsed={collapsed.upgrades}
        onToggle={() => setCollapsed((prev) => ({ ...prev, upgrades: !prev.upgrades }))}
        formatNumber={formatNumber}
      />

      <RiskSection
        riskTiers={riskTiers}
        resources={resources}
        adjustProbs={adjustProbs}
        rollOutcome={rollOutcome}
        selectedAutoRisk={selectedAutoRisk}
        onSelectAutoRisk={setSelectedAutoRisk}
        collapsed={collapsed.risks}
        onToggle={() => setCollapsed((prev) => ({ ...prev, risks: !prev.risks }))}
      />

      <SettingsModal
        open={settingsOpen}
        animationsDisabled={animationsDisabled}
        outcomeTextDisabled={outcomeTextDisabled}
        featureView={featureView}
        numberFormatStyle={numberFormatStyle}
        gamblePerSec={gamblePerSec}
        onClose={() => setSettingsOpen(false)}
        onOpenRanking={() => {
          setSettingsOpen(false)
          setLeaderboardOpen(true)
        }}
        onManualSave={manualSave}
        onToggleAnimations={setAnimationsDisabled}
        onToggleOutcomeText={setOutcomeTextDisabled}
        onChangeFeatureView={setFeatureView}
        onChangeNumberFormatStyle={setNumberFormatStyleState}
        onSetCashAbsolute={setCashAbsolute}
        onApplyCoupon={applyCoupon}
      />

      <RankPromptModal
        open={rankPromptOpen || leaderboardOpen}
        mode={rankPromptOpen ? 'prompt' : 'leaderboard'}
        rankPromptSeconds={rankPromptSeconds}
        userId={profileId}
        onClose={() => {
          if (rankPromptOpen) dismissRankTime()
          else setLeaderboardOpen(false)
        }}
        onSave={rankPromptOpen ? saveRankTime : undefined}
        formatDuration={formatDuration}
      />

      {toast && (
        <Toast
          toastKey={toast.key}
          tone={toast.tone}
          title={toast.title}
          detail={toast.detail}
          disableAnimations={animationsDisabled}
        />
      )}

      {fx && <FxOverlay fxKey={fx.key} tone={fx.tone} disableAnimations={animationsDisabled} />}
    </div>
  )
}

function App() {
  const anonProfileId = useMemo(() => getOrCreateAnonUserId(), [])

  const profileId = anonProfileId

  return (
    <>
      <GameApp profileId={profileId} />
    </>
  )
}

export default App
