import './App.css'

import { useEffect, useMemo, useState } from 'react'

import { HeroHeader } from './components/HeroHeader'
import { RankPromptModal } from './components/RankPromptModal'
import { ResourceSection } from './components/ResourceSection'
import { SettingsModal } from './components/SettingsModal'
import { RiskSection } from './components/RiskSection'
import { FxOverlay, Toast } from './components/ToastFx'
import { UpgradesSection } from './components/UpgradesSection'
import { BASE_INCOME, HEAT_MAX } from './constants'
import type { HoveredButton } from './hooks/useAutoBuy'
import { useAutoBuy } from './hooks/useAutoBuy'
import { useGameLogic } from './hooks/useGameLogic'
import type { RiskKey } from './types'
import { getOrCreateAnonUserId } from './utils/anonUser'
import { formatNumber } from './utils/number'

type GameAppProps = {
  profileId: string
}

function GameApp({ profileId }: GameAppProps) {
  const {
    state: { resources, levels, toast, fx, openHelp, permBoost, permLuck, cashHistory },
    derived: {
      incomeMultiplier,
      buffMultiplier,
      incomeInsightBonus,
      conversionCosts,
      elapsedSeconds,
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
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome,
      convertCashToChips,
      convertCashToHeat,
      performPrestige,
      buyPermanentLuck,
      saveRankTime,
      dismissRankTime,
      manualSave,
      resetProgress,
    },
    data: { upgrades, upgradeHelp, riskTiers },
  } = useGameLogic(profileId)

  const penguinCashThresholds = useMemo(() => [1e10, 1e16, 1e28, 1e40, 1e51], [])
  const penguinLevel = useMemo(() => {
    let level = 1
    for (let i = 1; i < penguinCashThresholds.length; i += 1) {
      if (maxCash >= penguinCashThresholds[i]) {
        level = i + 1 // threshold index 1 unlocks level 2
      } else {
        break
      }
    }
    return Math.min(penguinCashThresholds.length + 1, Math.max(1, level))
  }, [maxCash, penguinCashThresholds])

  const [autoBuyEnabled, setAutoBuyEnabled] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<HoveredButton>(null)
  const [selectedAutoRisk, setSelectedAutoRisk] = useState<RiskKey | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [animationsDisabled, setAnimationsDisabled] = useState(false)
  const [featureView, setFeatureView] = useState<'penguin' | 'chart'>('penguin')
  const [penguinMapEnabled, setPenguinMapEnabled] = useState(false)
  const [collapsed, setCollapsed] = useState({
    resources: false,
    upgrades: false,
    risks: false,
  })

  const totalLuck = Math.min(100, resources.luck + permLuck)

  const autoRiskTier = useMemo(
    () => (selectedAutoRisk ? riskTiers.find((t) => t.key === selectedAutoRisk) ?? null : null),
    [riskTiers, selectedAutoRisk],
  )

  useAutoBuy({
    enabled: autoBuyEnabled,
    hoveredButton,
    upgrades,
    levels,
    cash: resources.cash,
    handlePurchase,
    handlePurchaseBulk,
  })

  useEffect(() => {
    if (!autoRiskTier) return undefined

    const tick = () => {
      const ready = resources.heat >= HEAT_MAX && resources.chips >= autoRiskTier.cost
      if (ready) rollOutcome(autoRiskTier)
    }

    tick() // 첫 루프 전에 즉시 한 번 체크
    const id = window.setInterval(tick, 100)
    return () => window.clearInterval(id)
  }, [autoRiskTier, resources.heat, resources.chips, rollOutcome])

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
        permBoost={permBoost}
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
        convertCashToChips={convertCashToChips}
        convertCashToHeat={convertCashToHeat}
        animationsDisabled={animationsDisabled}
        featureView={featureView}
        cashHistory={cashHistory}
        totalLuck={totalLuck}
        permLuck={permLuck}
        penguinMapEnabled={penguinMapEnabled}
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
        autoBuyEnabled={autoBuyEnabled}
        setAutoBuyEnabled={setAutoBuyEnabled}
        setHoveredButton={setHoveredButton}
        performPrestige={performPrestige}
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
        featureView={featureView}
        penguinMapEnabled={penguinMapEnabled}
        onClose={() => setSettingsOpen(false)}
        onOpenRanking={() => {
          setSettingsOpen(false)
          setLeaderboardOpen(true)
        }}
        onManualSave={manualSave}
        onResetProgress={resetProgress}
        onToggleAnimations={setAnimationsDisabled}
        onChangeFeatureView={setFeatureView}
        onTogglePenguinMap={setPenguinMapEnabled}
      />

      <RankPromptModal
        open={rankPromptOpen || leaderboardOpen}
        mode={rankPromptOpen ? 'prompt' : 'leaderboard'}
        rankPromptSeconds={rankPromptSeconds}
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
  // 로그인 없이 익명 UUID 기반으로 유저/프로필을 식별
  const profileId = useMemo(() => getOrCreateAnonUserId(), [])
  return <GameApp profileId={profileId} />
}

export default App
