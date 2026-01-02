import { HEAT_MAX } from '../constants'
import type { Resources } from '../types'
import { useState } from 'react'
import { AnimatedNumber } from './AnimatedNumber'
import { CollapsiblePanel } from './CollapsiblePanel'
import { Modal } from './Modal'
import { PenguinCard } from './PenguinCard'
import { PenguinMap } from './PenguinMap'
import { Sparkline } from './Sparkline'

const PLAY_TIP_PAGES: Array<{ title: string; items: Array<string | { code: string }> }> = [
  {
    title: '초반 루틴(가장 중요)',
    items: [
      '우선순위: Cash로 “안전 업그레이드(프린터/금고)”를 올려 기본 수익을 키우세요.',
      'Heat 100은 “도박 1회권”입니다. Heat가 차는 동안 Cash 성장에 집중하세요.',
      'Gold는 도박 비용입니다. 필요할 때만 Cash→Gold로 전환해 과소비를 줄이세요.',
      '막혔다면: 낮은/중간 티어 도박으로 Insight를 쌓아 로그 보너스를 확보하세요.',
      '랭킹을 노린다면: 프리스티지 후 한 번의 “런(run)”에 집중(랭킹 시간은 마지막 프리스티지 이후 시간).',
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
    title: '안전 업그레이드(무난한 빌드)',
    items: [
      '프린터(기본 수익): 초반 체감이 큽니다. 막히기 전까지 먼저 올리기 좋습니다.',
      '금고(곱연산): 프린터가 어느 정도 올라가면 금고가 폭발적으로 효율이 좋아집니다.',
      'Heat 배터리(충전 속도): “도박 시도 횟수/시간”을 늘려줍니다. 도박 중심이면 최우선 투자.',
      '골드 정제(Gold 생성 속도): 도박 비용 수급이 편해집니다. Heat 배터리와 세트로 효율이 좋습니다.',
      '팁: 프린터만 과하게 올리면 전환 단가가 같이 오르니(아래 전환 팁 참고) 금고/배터리도 같이 보세요.',
    ],
  },
  {
    title: '전환 팁(Cash→Heat/Gold)',
    items: [
      '전환은 “필요한 순간에만, 필요한 만큼만” 하는 게 안정적입니다(전환 단가가 계속 움직임).',
      '전환 단가 배수 M은 현재 버프 배수와(도박 배수 포함) 안전 업그레이드 효과가 클수록 커집니다.',
      '부스트를 계속 중첩할수록 전환 단가도 같이 오릅니다. “전환은 최소화, 도박은 최대화”가 핵심 플레이가 됩니다.',
      { code: 'activeBuff = max(1, buffMultiplier)' },
      { code: 'incomeBoost = max(1, printer * vault)' },
      { code: 'M = max(1, activeBuff^0.98 * incomeBoost^0.98)' },
    ],
  },
  {
    title: '도박 운영(리스크) 핵심',
    items: [
      '기본 규칙: Heat 100이 필요하며, 실행하면 Heat는 0으로 리셋되고 Gold는 비용만큼 소모됩니다.',
      '쿨다운은 따로 없고 “Heat 충전 시간이 곧 쿨다운”입니다. (Heat 배터리 = 도박 횟수 증가)',
      '부스트는 시간 제한 없이 지속되며, 성공/대성공마다 계속 중첩됩니다(곱연산).',
      '핵심: Heat 배터리로 도박 템포를 올리고, 골드 정제로 도박 비용을 유지하세요.',
      '목표별 추천: Insight가 급하면 낮음/중간 티어로 안정 파밍 → 여유가 생기면 고티어 도전.',
      '극단/초극단은 “영구 보너스(permBoost)”를 노리는 구간입니다. Gold와 멘탈 여유가 있을 때만 시도하세요.',
      '한 번에 몰빵하기보다: Heat가 찰 때마다 1회씩 반복해서 편차를 줄이는 편이 안정적입니다.',
    ],
  },
  {
    title: 'Luck/Insight 활용법',
    items: [
      'Luck은 0~100 사이에서 변하며, 실패할수록 올라가고 성공할수록 내려갑니다.',
      '팁: Luck이 높아졌을 때가 “성공 확률이 상대적으로 좋은 타이밍”이라 고티어 도전을 고려할 만합니다.',
      'Insight는 로그 기반 보너스로 수익을 올려줍니다. 초반 정체 구간에서 특히 체감이 큽니다.',
      { code: 'Insight 보너스 = 1 + 0.12 * log10(1 + Insight)' },
      '정리: (안전 업그레이드로 Cash 성장) + (도박으로 Insight/permBoost) 두 축을 번갈아 굴리면 안정적입니다.',
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
      '리셋 주의: Cash/Gold/Heat/Luck/Insight/업그레이드/버프/permBoost는 초기화되며, Prestige는 누적(permLuck은 유지).',
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
