import { HEAT_MAX } from '../constants'
import type { Resources } from '../types'
import { AnimatedNumber } from './AnimatedNumber'
import { CollapsiblePanel } from './CollapsiblePanel'
import { PenguinCard } from './PenguinCard'
import { PenguinMap } from './PenguinMap'
import { Sparkline } from './Sparkline'

interface ResourceSectionProps {
  resources: Resources
  snapKey: number
  penguinLevel: number
  chipsRatePerSec: number
  cashToChipsCost: number
  cashToHeatCost: number
  conversionCostMultiplier: number
  heatFullChargeSeconds: number
  collapsed: boolean
  onToggle: () => void
  formatNumber: (value: number) => string
  convertCashToChips: () => void
  convertCashToHeat: () => void
  animationsDisabled?: boolean
  featureView: 'penguin' | 'chart'
  cashHistory: number[]
  totalLuck: number
  permLuck: number
  penguinMapEnabled: boolean
}

export function ResourceSection({
  resources,
  snapKey,
  penguinLevel,
  chipsRatePerSec,
  cashToChipsCost,
  cashToHeatCost,
  conversionCostMultiplier,
  heatFullChargeSeconds,
  collapsed,
  onToggle,
  formatNumber,
  convertCashToChips,
  convertCashToHeat,
  animationsDisabled = false,
  featureView,
  cashHistory,
  totalLuck,
  permLuck,
  penguinMapEnabled,
}: ResourceSectionProps) {
  const heatCooldownLabel = Number.isFinite(heatFullChargeSeconds)
    ? `0→100 충전 ${heatFullChargeSeconds.toFixed(2)}초`
    : '충전 불가'

  return (
    <CollapsiblePanel eyebrow="리소스" title="현재 보유 자원" collapsed={collapsed} onToggle={onToggle}>
      <div className="grid resources">
        <div className="card">
          <p className="eyebrow">Cash</p>
          <h2>
            <AnimatedNumber value={resources.cash} formatter={formatNumber} snapKey={snapKey} disableAnimation={animationsDisabled} />
          </h2>
          <p className="muted">기본 방치 자원 · 업그레이드 사용</p>
        </div>
        <div className="card">
          <p className="eyebrow">Gold</p>
          <h2>
            <AnimatedNumber value={resources.chips} formatter={formatNumber} snapKey={snapKey} disableAnimation={animationsDisabled} />
          </h2>
          <p className="muted">도박 전용 · 초당 {chipsRatePerSec.toFixed(2)} Gold</p>
        </div>
        <div className="card">
          <p className="eyebrow">Luck</p>
          <h2>
            <AnimatedNumber
              value={totalLuck}
              formatter={(v) => `${v.toFixed(0)} / 100`}
              snapKey={snapKey}
              disableAnimation={animationsDisabled}
            />
          </h2>
          <p className="muted">
            {permLuck > 0 ? `영구 Luck ${permLuck} 포함` : '실험 결과에 따라 증감'}
          </p>
        </div>
        <div className="card heat-card">
          <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <p className="eyebrow">Heat</p>
              <h2>
                <AnimatedNumber
                  value={resources.heat}
                  formatter={(v) => `${v.toFixed(0)} / 100`}
                  snapKey={snapKey}
                  disableAnimation={animationsDisabled}
                />
              </h2>
              <p className="muted">{heatCooldownLabel}</p>
            </div>
            <div className="heat-bar" aria-label="heat-progress" style={{ width: '100%' }}>
              <span style={{ width: `${(resources.heat / HEAT_MAX) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Insight</p>
          <h2>
            <AnimatedNumber value={resources.insight} formatter={formatNumber} snapKey={snapKey} disableAnimation={animationsDisabled} />
          </h2>
          <p className="muted">실험 실패가 Insight를 쌓습니다. 높은 티어일수록 더 위험하지만 실패 Insight 보상도 더 큽니다.</p>
        </div>
        {featureView === 'penguin' ? (
          penguinMapEnabled ? (
            <div className="card spark-card">
              <div className="row space">
                <div>
                  <p className="eyebrow">펭귄 맵</p>
                  <h4>움직임 프로토타입</h4>
                  <p className="muted">캔버스 클릭으로 반응합니다</p>
                </div>
              </div>
                <PenguinMap backgroundSrc={`${import.meta.env.BASE_URL}penguin/map-bg.png`} showGrid={false} />
            </div>
          ) : (
            <PenguinCard
              level={penguinLevel}
              note={`최대 Cash 기준 진화: 1e10, 1e16, 1e28, 1e40, 1e51 달성 시 Lv 업.`}
              mapEnabled={penguinMapEnabled}
              allowBrowseDown
            />
          )
        ) : (
          <div className="card spark-card">
            <div className="row space">
              <div>
                <p className="eyebrow">Cash 추이</p>
                <h4>상승 그래프</h4>
                <p className="muted">최근 120초 샘플 기준 추이</p>
              </div>
              <div className="penguin-level">
                <span className="muted">마지막</span>
                <strong>{formatNumber(cashHistory[cashHistory.length - 1] ?? 0)} C</strong>
              </div>
            </div>
            <Sparkline data={cashHistory} />
          </div>
        )}
        <div className="card">
          <p className="eyebrow">Cash → 전환</p>
          <p className="muted">활성 도박 배수, 프린트, 금고가 높을수록 전환 단가가 함께 상승합니다.</p>
          <p className="muted">현재 배수 x{formatNumber(conversionCostMultiplier)} 기준</p>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="ghost" disabled={resources.cash < cashToChipsCost} onClick={() => convertCashToChips()}>
              {formatNumber(cashToChipsCost)} C → Gold 10
            </button>
            <button className="ghost" disabled={resources.cash < cashToHeatCost} onClick={() => convertCashToHeat()}>
              {formatNumber(cashToHeatCost)} C → Heat 10
            </button>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">숫자 단위 표기</p>
          <p className="muted" style={{ lineHeight: 1.5 }}>
            K(10E3) → M(10E6) → B(10E9) → T(10E12) → Qa(10E15) → Qi(10E18) → Sx(10E21) → Sp(10E24) → Oc(10E27) → Nn(10E30)
          </p>
        </div>
      </div>
    </CollapsiblePanel>
  )
}
