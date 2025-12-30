import './App.css'

import { useState } from 'react'

import { AnimatedNumber } from './components/AnimatedNumber'
import { PenguinCard } from './components/PenguinCard'
import { FxOverlay, Toast } from './components/ToastFx'
import { BASE_CHIP_RATE, BASE_INCOME, HEAT_MAX } from './constants'
import { useGameLogic } from './hooks/useGameLogic'
import { formatNumber } from './utils/number'

function App() {
  const {
    state: { resources, levels, toast, fx, openHelp, permBoost },
    derived: { incomeMultiplier, buffMultiplier, elapsedSeconds, adjustProbs, prestigeGain, snapKey },
    actions: {
      setOpenHelp,
      handlePurchase,
      handlePurchaseBulk,
      rollOutcome,
      convertCashToChips,
      convertCashToHeat,
      grantResources,
      performPrestige,
    },
    data: { upgrades, upgradeHelp, riskTiers },
  } = useGameLogic()
    const penguinLevel = Math.max(1, Math.min(10, Math.floor(resources.prestige / 5) + 1))

  const [devMode, setDevMode] = useState(false)

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (v: number) => v.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">볼트 러시 · 프로토타입</p>
          <h1>보험 있는 한방</h1>
          <p className="subtitle">안정 수익을 돌리면서, Heat 100에만 열리는 실험으로 폭발을 노려보세요.</p>
        </div>
        <div className="summary">
          <div>
            <p>현재 수익</p>
            <strong>
              <AnimatedNumber value={BASE_INCOME * incomeMultiplier} formatter={formatNumber} snapKey={snapKey} /> C/s
            </strong>
          </div>
          <div>
            <p>운빨(Luck)</p>
            <strong>
              <AnimatedNumber value={resources.luck} formatter={(v) => v.toFixed(0)} snapKey={snapKey} /> / 100
            </strong>
          </div>
          <div>
            <p>활성 도박 배수</p>
            <strong>x{formatNumber(buffMultiplier * (1 + permBoost))}</strong>
          </div>
          <div>
            <p>경과 시간</p>
            <strong>{formatDuration(elapsedSeconds)}</strong>
          </div>
          <div>
            <p>Prestige</p>
            <strong>
              <AnimatedNumber value={resources.prestige} formatter={formatNumber} snapKey={snapKey} /> Shards
            </strong>
            <p className="muted" style={{ marginTop: 4 }}>
              예상 획득: {formatNumber(prestigeGain)}
            </p>
          </div>
        </div>
      </header>

      <section className="grid resources">
        <div className="card">
          <p className="eyebrow">Cash</p>
          <h2>
            <AnimatedNumber value={resources.cash} formatter={formatNumber} snapKey={snapKey} />
          </h2>
          <p className="muted">기본 방치 자원 · 업그레이드 사용</p>
        </div>
        <div className="card">
          <p className="eyebrow">Chips</p>
          <h2>
            <AnimatedNumber value={resources.chips} formatter={formatNumber} snapKey={snapKey} />
          </h2>
          <p className="muted">
            도박 전용 · 초당 {(BASE_CHIP_RATE * (1 + 0.05 * levels.refinery)).toFixed(2)} G
          </p>
        </div>
        <div className="card heat-card">
          <div className="row">
            <div>
              <p className="eyebrow">Heat</p>
              <h2>
                <AnimatedNumber value={resources.heat} formatter={(v) => `${v.toFixed(0)} / 100`} snapKey={snapKey} />
              </h2>
              <p className="muted">100일 때만 실험 가능</p>
            </div>
            <div className="heat-bar" aria-label="heat-progress">
              <span style={{ width: `${(resources.heat / HEAT_MAX) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Insight</p>
          <h2>
            <AnimatedNumber value={resources.insight} formatter={formatNumber} snapKey={snapKey} />
          </h2>
          <p className="muted">실험 실패도 누적되어 성장 자원으로 환원</p>
        </div>
        <PenguinCard
          level={penguinLevel}
          note={`Prestige 5마다 Lv+1 (임시). public/penguin/Lv${penguinLevel}.png을 추가하면 표시됩니다.`}
        />
        <div className="card">
          <p className="eyebrow">Cash → 전환</p>
          <p className="muted">안전 업그레이드 레벨이 높을수록 전환이 비싸집니다</p>
          {(() => {
            const safeLevelScore = levels.printer + levels.vault + levels.autoCollector
            const chipCost = 120 * Math.pow(1.08, safeLevelScore)
            const heatCost = 90 * Math.pow(1.08, safeLevelScore)
            return (
              <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="ghost" disabled={resources.cash < chipCost} onClick={() => convertCashToChips()}>
                  {formatNumber(chipCost)} C → Chips 10
                </button>
                <button className="ghost" disabled={resources.cash < heatCost} onClick={() => convertCashToHeat()}>
                  {formatNumber(heatCost)} C → Heat 10
                </button>
              </div>
            )
          })()}
        </div>
        <div className="card">
          <p className="eyebrow">숫자 단위 표기</p>
          <p className="muted" style={{ lineHeight: 1.5 }}>
            K(10E3) → M(10E6) → B(10E9) → T(10E12) → Qa(10E15) → Qi(10E18) → Sx(10E21) → Sp(10E24) → Oc(10E27) → Nn(10E30)
          </p>
        </div>
      </section>

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
            <button className="ghost" onClick={() => grantResources({ prestige: 10 })}>Prestige +10</button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">안전 업그레이드</p>
            <h3>스트레스 없는 성장 축</h3>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <p className="muted">ROI 순으로 가볍게 눌러 성장 곡선을 잡아보세요.</p>
            <button className="ghost pill" onClick={() => setDevMode((v) => !v)}>
              {devMode ? '개발자 모드 숨기기' : '개발자 모드' }
            </button>
            <button
              className="ghost pill"
              disabled={prestigeGain <= 0}
              onClick={() => performPrestige()}
            >
              {prestigeGain <= 0 ? '프리스티지 불가' : `프리스티지 (+${formatNumber(prestigeGain)})`}
            </button>
          </div>
        </div>
        <div className="grid upgrades">
          {upgrades.map((upgrade) => {
            const level = levels[upgrade.key] ?? 0
            const cost = upgrade.baseCost * Math.pow(upgrade.growth, level)
            const locked = upgrade.maxLevel ? level >= upgrade.maxLevel : false
            const bulkCount = locked ? 0 : upgrade.maxLevel ? Math.max(0, Math.min(10, upgrade.maxLevel - level)) : 10
            let bulkCost = 0
            for (let i = 0; i < bulkCount; i += 1) {
              bulkCost += upgrade.baseCost * Math.pow(upgrade.growth, level + i)
            }
            return (
              <div key={upgrade.key} className="card">
                <div className="row space">
                  <div>
                    <p className="eyebrow">Lv.{level}</p>
                    <h4>{upgrade.name}</h4>
                    <p className="muted">{upgrade.description}</p>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="ghost pill"
                      onClick={() => setOpenHelp((prev) => (prev === upgrade.key ? null : upgrade.key))}
                    >
                      도움말
                    </button>
                    <button
                      className="ghost"
                      disabled={resources.cash < cost || locked}
                      onClick={() => handlePurchase(upgrade.key)}
                    >
                      {locked ? 'MAX' : `구매 ${formatNumber(cost)} C`}
                    </button>
                    <button
                      className="ghost"
                      disabled={bulkCount === 0 || resources.cash < bulkCost}
                      onClick={() => handlePurchaseBulk(upgrade.key, 10)}
                    >
                      {bulkCount === 0 ? 'MAX' : `10개 구매 ${formatNumber(bulkCost)} C`}
                    </button>
                  </div>
                </div>
                {openHelp === upgrade.key && (
                  <div className="help">
                    <p>{upgradeHelp[upgrade.key]}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">고위험 실험(도박)</p>
            <h3>Heat 100에서만 버튼이 깜빡입니다</h3>
          </div>
          <p className="muted">실패해도 Luck/Insight가 오르므로 “망하는 일”은 없습니다.</p>
        </div>

        <div className="grid risk-grid">
          {riskTiers.map((tier) => {
            const probs = adjustProbs(tier)
            const ready = resources.heat >= HEAT_MAX && resources.chips >= tier.cost
            return (
              <div key={tier.key} className={`card risk ${ready ? 'ready' : ''}`}>
                <div className="row space">
                  <div>
                    <p className="eyebrow">{tier.label}</p>
                    <h4>Chips {tier.cost} 필요</h4>
                    <p className="muted">
                      부스트 {tier.reward.successBuff.toFixed(2)}x ~ {tier.reward.jackpotBuff.toFixed(2)}x / {tier.reward.buffMinutes}분
                    </p>
                  </div>
                  <button disabled={!ready} onClick={() => rollOutcome(tier)}>
                    {ready ? '실험 실행' : '조건 부족'}
                  </button>
                </div>
                <div className="prob-row">
                  <span>대성공 {Math.round(probs.jackpot * 100)}%</span>
                  <span>성공 {Math.round(probs.success * 100)}%</span>
                  <span>실패 {Math.round(probs.fail * 100)}%</span>
                  <span>대실패 {Math.round(probs.crash * 100)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {toast && <Toast toastKey={toast.key} tone={toast.tone} title={toast.title} detail={toast.detail} />}

      {fx && <FxOverlay fxKey={fx.key} tone={fx.tone} />}
    </div>
  )
}

export default App
