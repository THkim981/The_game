import { HEAT_MAX } from '../constants'
import type { Resources } from '../types'
import { useState } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { CollapsiblePanel } from './CollapsiblePanel'
import { Modal } from './Modal'
import { PenguinCard } from './PenguinCard'
import { Sparkline } from './Sparkline'

const PLAY_TIP_PAGES: Array<{ title: string; items: Array<string | { code: string }> }> = [
  {
    title: '공통(초반 공략 원칙)',
    items: [
      '기본 흐름: Cash로 성장(프린터/금고) → Heat 100이 “도박 1회권”이므로, Heat가 차는 동안은 현금 성장에 집중하는 게 안정적입니다.',
      '전환 규칙: Cash→Gold/Heat 전환은 “필요한 순간에 필요한 만큼만” 하세요. (버프/업그레이드가 커질수록 전환 단가도 같이 올라 과전환이 손해로 이어지기 쉬움)',
      '막힐 때: 낮은/중간 티어 도박으로 Insight를 먼저 확보해 로그 보너스로 정체 구간을 넘기기 좋습니다.',
      { code: 'activeBuff = max(1, buffMultiplier)' },
      { code: 'incomeBoost = max(1, printer * vault)' },
      { code: 'M = max(1, activeBuff^0.98 * incomeBoost^0.98)' },
    ],
  },
  {
    title: '안전 빌드(안정 수익 중심)',
    items: [
      '우선순위: 프린터 → 금고(프린터가 어느 정도 올라가면 금고 효율이 급상승) → 배터리/정제는 최소한만.',
      '플레이 루프: Cash 성장에 오래 머물고, Heat 100이 되면 낮은/중간 티어 도박을 “가끔”만 돌려 Insight를 천천히 확보.',
      '장점: 편차(운빨)가 작고, 전환 단가 상승에 덜 휘둘려 체감이 안정적입니다.',
    ],
  },
  {
    title: '도박 빌드(Heat 템포/Insight 노림)',
    items: [
      '우선순위: 배터리(Heat 충전 속도) + 정제(Gold 수급)부터 올려 “도박 시도 횟수/시간”을 확보 → 그 다음 프린터/금고로 기반 보강.',
      '플레이 루프: Heat가 찰 때마다 1회씩 꾸준히 도박을 돌려 버프를 중첩하고 Insight를 빠르게 쌓는 방향(몰빵보다 1회 반복이 편차 완화에 유리).',
      '장점: 잘 풀릴 때 성장 폭이 크고 Insight를 빠르게 확보할 수 있습니다(대신 편차 큼).',
      '운영 팁: 극단/초극단은 변동성이 큰 구간이니 Gold와 멘탈 여유가 있을 때만 시도하세요.',
    ],
  },
  {
    title: '시간/기록(랭킹 이해)',
    items: [
      '“경과 시간”은 기록 초기화 이후 누적 플레이 시간입니다(새로고침해도 유지).',
      '랭킹 시간은 “마지막 프리스티지 이후 경과 시간”으로 집계됩니다.',
      '랭킹을 망쳤다면: 프리스티지로 타이머를 리셋하고 다시 도전하는 방식이 가장 깔끔합니다.',
    ],
  },
  {
    title: 'Luck/Insight 활용법',
    items: [
      'Luck은 0~100 사이에서 변하며, 실패할수록 올라가고 성공할수록 내려갑니다.',
      '팁: Luck이 높아졌을 때가 “성공 확률이 상대적으로 좋은 타이밍”이라 고티어 도전을 고려할 만합니다.',
      'Insight는 로그 기반 보너스로 수익을 올려줍니다. 초반 정체 구간에서 특히 체감이 큽니다.',
      { code: 'Insight 보너스 = 1 + log10(1 + Insight)' },
    ],
  },
  {
    title: '프리스티지(런 리셋 타이밍)',
    items: [
      '언제 할까: 프리스티지 예상 획득량이 “0보다 커질 때”가 시작 신호입니다. (수동 수행)',
      '랭킹 도전 전에는 프리스티지로 런을 초기화하고, 그 후에 1e100 달성까지 한 번에 밀어붙이는 편이 유리합니다.',
      '프리스티지는 수익 보너스뿐 아니라 Heat/Gold 생성 속도도 올려 “도박 템포”를 빠르게 합니다.',
      { code: '효과(소득) = 1 + 0.05 * log10(1 + Prestige)' },
      { code: '속도(Heat/Gold) = (1 + 0.02 * Prestige)' },
      '리셋 주의: Cash/Gold/Heat/Luck/Insight/업그레이드/버프는 초기화되며, Prestige는 누적(permLuck은 유지).',
    ],
  },
]

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
}: ResourceSectionProps) {
  const [tipsOpen, setTipsOpen] = useState(false)
  const [tipsPage, setTipsPage] = useState(0)

  const heatCooldownLabel = Number.isFinite(heatFullChargeSeconds)
    ? `0→100 충전 ${heatFullChargeSeconds.toFixed(2)}초`
    : '충전 불가'

  return (
    <>
      <CollapsiblePanel
        eyebrow="리소스"
        title="현재 보유 자원"
        collapsed={collapsed}
        onToggle={onToggle}
        actions={
          <button
            className="ghost pill"
            onClick={() => {
              setTipsPage(0)
              setTipsOpen(true)
            }}
          >
            플레이 팁
          </button>
        }
      >
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
          <PenguinCard
            level={penguinLevel}
            note={`최대 Cash 기준 진화: 1e10, 1e16, 1e28, 1e40, 1e51 달성 시 Lv 업.`}
            allowBrowseDown
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
      </div>
      </CollapsiblePanel>

      <Modal
        open={tipsOpen}
        title="플레이 팁"
        onClose={() => setTipsOpen(false)}
        footer={
          <div className="row space" style={{ width: '100%' }}>
            <button
              className="ghost pill"
              onClick={() => setTipsPage((p) => Math.max(0, p - 1))}
              disabled={tipsPage <= 0}
              aria-label="이전 팁"
            >
              ◀
            </button>
            <p className="muted" style={{ margin: 0 }}>
              {tipsPage + 1} / {PLAY_TIP_PAGES.length}
            </p>
            <button
              className="ghost pill"
              onClick={() => setTipsPage((p) => Math.min(PLAY_TIP_PAGES.length - 1, p + 1))}
              disabled={tipsPage >= PLAY_TIP_PAGES.length - 1}
              aria-label="다음 팁"
            >
              ▶
            </button>
          </div>
        }
      >
        <div className="card" style={{ marginTop: 0 }}>
          <p className="eyebrow" style={{ marginTop: 0 }}>
            {PLAY_TIP_PAGES[tipsPage]?.title ?? ''}
          </p>
          <div className="muted" style={{ lineHeight: 1.6 }}>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              {(PLAY_TIP_PAGES[tipsPage]?.items ?? []).map((item, idx) => (
                <li key={idx}>
                  {typeof item === 'string' ? item : <code>{item.code}</code>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  )
}
