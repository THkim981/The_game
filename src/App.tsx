import './App.css'

import { useEffect, useMemo, useState } from 'react'

import { HeroHeader } from './components/HeroHeader'
import { Modal } from './components/Modal'
import { ResourceSection } from './components/ResourceSection'
import { RiskSection } from './components/RiskSection'
import { FxOverlay, Toast } from './components/ToastFx'
import { UpgradesSection } from './components/UpgradesSection'
import { BASE_INCOME, HEAT_MAX } from './constants'
import type { HoveredButton } from './hooks/useAutoBuy'
import { useAutoBuy } from './hooks/useAutoBuy'
import { useGameLogic } from './hooks/useGameLogic'
import type { RiskKey } from './types'
import { formatNumber } from './utils/number'

function App() {
  const {
    state: { resources, levels, toast, fx, openHelp, permBoost, permLuck, cashHistory },
    derived: {
      incomeMultiplier,
      buffMultiplier,
      elapsedSeconds,
      adjustProbs,
      prestigeGain,
      snapKey,
      chipsRatePerSec,
      nextPermLuckCost,
      permLuckCap,
    },
    actions: {
      setOpenHelp,
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome,
      convertCashToChips,
      convertCashToHeat,
      grantResources,
      performPrestige,
      buyPermanentLuck,
    },
    data: { upgrades, upgradeHelp, riskTiers },
  } = useGameLogic()

  const penguinLevel = Math.max(1, Math.min(10, Math.floor(resources.prestige / 5) + 1))

  const [devMode, setDevMode] = useState(false)
  const [autoBuyEnabled, setAutoBuyEnabled] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<HoveredButton>(null)
  const [selectedAutoRisk, setSelectedAutoRisk] = useState<RiskKey | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [animationsDisabled, setAnimationsDisabled] = useState(false)
  const [featureView, setFeatureView] = useState<'penguin' | 'chart'>('penguin')
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
        levels={levels}
        snapKey={snapKey}
        penguinLevel={penguinLevel}
        chipsRatePerSec={chipsRatePerSec}
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

      {devMode && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">개발자 도구</p>
              <h3>리소스 주입</h3>
            </div>
            <p className="muted">테스트용으로만 사용하세요</p>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="ghost" onClick={() => grantResources({ cash: 1e6 })}>Cash +1e6</button>
            <button className="ghost" onClick={() => grantResources({ cash: 1e9 })}>Cash +1e9</button>
            <button className="ghost" onClick={() => grantResources({ cash: 1e12 })}>Cash +1e12</button>
            <button className="ghost" onClick={() => grantResources({ chips: 1e3 })}>Chips +1e3</button>
            <button className="ghost" onClick={() => grantResources({ heat: 100 })}>Heat +100</button>
            <button className="ghost" onClick={() => grantResources({ insight: 1e4 })}>Insight +1e4</button>
            <button className="ghost" onClick={() => grantResources({ luck: 20 })}>Luck +20</button>
            <button className="ghost" onClick={() => grantResources({ cash: 1e15 })}>Cash +1e15</button>
            <button className="ghost" onClick={() => grantResources({ prestige: 1e4 })}>Prestige +1e4</button>
          </div>
        </section>
      )}

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
        devMode={devMode}
        onToggleDevMode={() => setDevMode((v) => !v)}
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

      <Modal open={settingsOpen} title="설정" onClose={() => setSettingsOpen(false)}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={animationsDisabled}
            onChange={(event) => setAnimationsDisabled(event.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>애니메이션 끄기</p>
            <p className="muted" style={{ marginTop: 4 }}>
              숫자 증감, 토스트, 이펙트 등 화면 움직임을 모두 정지합니다.
            </p>
          </div>
        </label>

        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>메인 강조 보기</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="feature-view"
              value="penguin"
              checked={featureView === 'penguin'}
              onChange={() => setFeatureView('penguin')}
            />
            <span>귀여운 펭귄 보기</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="feature-view"
              value="chart"
              checked={featureView === 'chart'}
              onChange={() => setFeatureView('chart')}
            />
            <span>상승 그래프 보기 (Cash 추이)</span>
          </label>
        </div>
      </Modal>

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

export default App
