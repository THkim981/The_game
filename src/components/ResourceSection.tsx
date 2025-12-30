import { HEAT_MAX } from '../constants'
import type { Resources, UpgradeKey } from '../types'
import { AnimatedNumber } from './AnimatedNumber'
import { CollapsiblePanel } from './CollapsiblePanel'
import { PenguinCard } from './PenguinCard'
import { Sparkline } from './Sparkline'

interface ResourceSectionProps {
  resources: Resources
  levels: Record<UpgradeKey, number>
  snapKey: number
  penguinLevel: number
  chipsRatePerSec: number
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
}

export function ResourceSection({
  resources,
  levels,
  snapKey,
  penguinLevel,
  chipsRatePerSec,
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
}: ResourceSectionProps) {
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
              <p className="muted">100일 때만 실험 가능</p>
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
          <p className="muted">실험 실패도 누적되어 성장 자원으로 환원</p>
        </div>
        {featureView === 'penguin' ? (
          <PenguinCard
            level={penguinLevel}
            note={`Prestige 5마다 Lv+1 (임시). public/penguin/Lv${penguinLevel}.png을 추가하면 표시됩니다.`}
          />
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
          <p className="muted">안전 업그레이드 레벨이 높을수록 전환이 비싸집니다</p>
          {(() => {
            const safeLevelScore = levels.printer + levels.vault + levels.autoCollector
            const chipCost = 120 * Math.pow(1.08, safeLevelScore)
            const heatCost = 90 * Math.pow(1.08, safeLevelScore)
            return (
              <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="ghost" disabled={resources.cash < chipCost} onClick={() => convertCashToChips()}>
                  {formatNumber(chipCost)} C → Gold 10
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
      </div>
    </CollapsiblePanel>
  )
}
