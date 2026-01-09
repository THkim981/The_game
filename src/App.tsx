import './App.css'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { HeroHeader } from './components/HeroHeader'
import { RankPromptModal } from './components/RankPromptModal'
import { ResourceSection } from './components/ResourceSection'
import { SettingsModal } from './components/SettingsModal'
import { RiskSection } from './components/RiskSection'
import { FxOverlay, Toast } from './components/ToastFx'
import { UpgradesSection } from './components/UpgradesSection'
import { BASE_INCOME, HEAT_MAX } from './constants'
import type { AutoBuyTarget } from './hooks/useAutoBuy'
import { useAutoBuy } from './hooks/useAutoBuy'
import { useGameLogic } from './hooks/useGameLogic'
import type { RiskKey, UpgradeKey } from './types'
import { getOrCreateAnonUserId } from './utils/anonUser'
import type { NumberFormatStyle } from './utils/number'
import { formatNumber, getNumberFormatStyle, setNumberFormatStyle } from './utils/number'

type GameAppProps = {
  profileId: string
}

// 쿠폰 설정 - 대소문자 포함 무작위 문자 (10자)
const VALID_COUPONS: Record<string, { prestige: number; description: string }> = {
  GmK7pQxR2z: { prestige: 2e4, description: 'Prestige 20000 지급' },
}

function GameApp({ profileId }: GameAppProps) {
  const {
    state: { resources, levels, toast, fx, openHelp, permLuck, cashHistory },
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
      setCashAbsolute,
      performPrestige,
      buyPermanentLuck,
      saveRankTime,
      dismissRankTime,
      manualSave,
      grantResources,
    },
    data: { upgrades, upgradeHelp, riskTiers },
  } = useGameLogic(profileId)

  // 쿠폰 사용 기록 (localStorage 저장)
  const [usedCoupons, setUsedCoupons] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`used_coupons_${profileId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  // 쿠폰 사용 기록 저장
  useEffect(() => {
    try {
      localStorage.setItem(`used_coupons_${profileId}`, JSON.stringify([...usedCoupons]))
    } catch {
      // ignore
    }
  }, [usedCoupons, profileId])

  // 쿠폰 적용 함수
  const applyCoupon = useCallback(
    (code: string): { success: boolean; message: string } => {
      const trimmedCode = code.trim()

      if (!trimmedCode) {
        return { success: false, message: '쿠폰 코드를 입력하세요' }
      }

      // 이미 사용한 쿠폰인지 확인
      if (usedCoupons.has(trimmedCode)) {
        return { success: false, message: '이미 사용한 쿠폰입니다' }
      }

      // 유효한 쿠폰인지 확인
      const couponData = VALID_COUPONS[trimmedCode]
      if (!couponData) {
        return { success: false, message: '유효하지 않은 쿠폰 코드입니다' }
      }

      // 쿠폰 혜택 지급
      grantResources({ prestige: couponData.prestige })

      // 사용 기록 저장
      setUsedCoupons((prev) => new Set([...prev, trimmedCode]))

      return {
        success: true,
        message: `🎉 ${couponData.description}\nPrestige +${formatNumber(couponData.prestige)}`,
      }
    },
    [usedCoupons, grantResources],
  )

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
      if (config?.single) targets.push({ key: upgrade.key, type: 'single' })
      if (config?.bulk) targets.push({ key: upgrade.key, type: 'bulk' })
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

  const autoRiskTier = useMemo(
    () => (selectedAutoRisk ? riskTiers.find((t) => t.key === selectedAutoRisk) ?? null : null),
    [riskTiers, selectedAutoRisk],
  )

  useAutoBuy({
    targets: autoBuyTargets,
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
        numberFormatStyle={numberFormatStyle}
        onClose={() => setSettingsOpen(false)}
        onOpenRanking={() => {
          setSettingsOpen(false)
          setLeaderboardOpen(true)
        }}
        onManualSave={manualSave}
        onToggleAnimations={setAnimationsDisabled}
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
