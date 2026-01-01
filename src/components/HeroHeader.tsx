import { AnimatedNumber } from './AnimatedNumber'

interface HeroHeaderProps {
  formatDuration: (seconds: number) => string
  incomeValue: number
  insightBonus: number
  luck: number
  buffMultiplier: number
  permBoost: number
  permLuck: number
  elapsedSeconds: number
  prestige: number
  prestigeGain: number
  snapKey: number
  formatNumber: (value: number) => string
  onOpenSettings: () => void
  animationsDisabled: boolean
}

export function HeroHeader({
  formatDuration,
  incomeValue,
  insightBonus,
  luck,
  buffMultiplier,
  permBoost,
  permLuck,
  elapsedSeconds,
  prestige,
  prestigeGain,
  snapKey,
  formatNumber,
  onOpenSettings,
  animationsDisabled,
}: HeroHeaderProps) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">볼트 러시 · 프로토타입</p>
        <h1>보험 있는 한방</h1>
        <p className="subtitle">안정 수익을 돌리면서, Heat 100에만 열리는 실험으로 폭발을 노려보세요.</p>
      </div>
      <div className="header-right">
        <button className="ghost pill" onClick={onOpenSettings}>설정</button>
        <div className="summary">
          <div>
            <p>현재 수익</p>
            <strong>
              <AnimatedNumber
                key={`income-${snapKey}`}
                value={incomeValue}
                formatter={formatNumber}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              C/s
            </strong>
            <p className="muted" style={{ marginTop: 4 }}>Insight 보정 x{insightBonus.toFixed(2)}</p>
          </div>
          <div>
            <p>운빨(Luck)</p>
            <strong>
              <AnimatedNumber
                value={luck}
                formatter={(v) => v.toFixed(0)}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              / 100
            </strong>
            {permLuck > 0 && (
              <p className="muted" style={{ marginTop: 4 }}>영구 Luck +{permLuck}</p>
            )}
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
              <AnimatedNumber
                value={prestige}
                formatter={formatNumber}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              Shards
            </strong>
            <p className="muted" style={{ marginTop: 4 }}>
              예상 획득: {formatNumber(prestigeGain)}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
