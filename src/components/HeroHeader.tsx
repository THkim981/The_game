import { AnimatedNumber } from './AnimatedNumber'

interface HeroHeaderProps {
  formatDuration: (seconds: number) => string
  incomeValue: number
  insightBonus: number
  luck: number
  buffMultiplier: number
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
        <button className="ghost pill" onClick={onOpenSettings}>
          설정
        </button>
        <div className="summary">
          <div>
            <p>
              현재 수익{' '}
              <abbr
                className="term-help"
                title="1초당 벌어들이는 Cash입니다. 기본 수익에 업그레이드/버프/Insight 보정이 반영됩니다."
                aria-label="현재 수익 설명"
              >
                !
              </abbr>
            </p>
            <strong>
              <AnimatedNumber
                value={incomeValue}
                formatter={formatNumber}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              C/s
            </strong>
            <p className="muted" style={{ marginTop: 4 }}>
              Insight 보정 x{insightBonus.toFixed(2)}{' '}
              <abbr
                className="term-help"
                title="Insight로 얻는 수익 배율입니다. Insight가 높을수록 현재 수익에 추가 보정이 붙습니다."
                aria-label="Insight 보정 설명"
              >
                !
              </abbr>
            </p>
          </div>

          <div>
            <p>
              운빨(Luck){' '}
              <abbr
                className="term-help"
                title="0~100 범위의 보정치입니다. Luck이 높을수록 (대성공+성공) 확률이 조금 올라가며, 실패할수록 올라가고 성공할수록 내려갑니다."
                aria-label="운빨 설명"
              >
                !
              </abbr>
            </p>
            <strong>
              <AnimatedNumber
                value={luck}
                formatter={(v) => v.toFixed(0)}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              / 100
            </strong>
            {permLuck > 0 && <p className="muted" style={{ marginTop: 4 }}>영구 Luck +{permLuck}</p>}
          </div>

          <div>
            <p>
              활성 도박 배수{' '}
              <abbr className="term-help" title="도박(버프)로 인해 현재 적용되는 배수입니다." aria-label="활성 도박 배수 설명">
                !
              </abbr>
            </p>
            <strong>x{formatNumber(buffMultiplier)}</strong>
          </div>

          <div>
            <p>
              경과 시간{' '}
              <abbr
                className="term-help"
                title="기록 초기화 이후의 누적 플레이 시간입니다. 새로고침해도 유지됩니다."
                aria-label="경과 시간 설명"
              >
                !
              </abbr>
            </p>
            <strong>{formatDuration(elapsedSeconds)}</strong>
          </div>

          <div>
            <p>
              Prestige{' '}
              <abbr
                className="term-help"
                title="프리스티지 리셋으로 얻는 자원(PTG)입니다. 수익/Heat/Gold 속도에 보너스를 주며, 아래 '예상 획득'은 현재 상태 기준입니다."
                aria-label="Prestige 설명"
              >
                !
              </abbr>
            </p>
            <strong>
              <AnimatedNumber
                value={prestige}
                formatter={formatNumber}
                snapKey={snapKey}
                disableAnimation={animationsDisabled}
              />{' '}
              PTG
            </strong>
            <p className="muted" style={{ marginTop: 4 }}>예상 획득: {formatNumber(prestigeGain)}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
