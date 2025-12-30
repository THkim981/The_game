import { useMemo, useState } from 'react'

import { formatNumber } from '../utils/number'

type PenguinCardProps = {
  level: number
  basePath?: string
  note?: string
}

export function PenguinCard({ level, basePath = 'penguin', note }: PenguinCardProps) {
  const [hasError, setHasError] = useState(false)
  const clampedLevel = useMemo(() => Math.max(1, Math.floor(level)), [level])
  const src = `${import.meta.env.BASE_URL}${basePath}/Lv${clampedLevel}.png`
  const description = note ?? `public/${basePath}/Lv${clampedLevel}.png에 이미지를 넣으면 표시됩니다.`

  return (
    <div className="card spark-card penguin-card">
      <div className="row space">
        <div>
          <p className="eyebrow">펭귄 진화</p>
          <h4>귀여움 진행도</h4>
          <p className="muted">{description}</p>
        </div>
        <div className="penguin-level">
          <span className="muted">현재</span>
          <strong>Lv.{formatNumber(clampedLevel)}</strong>
        </div>
      </div>
      <div className="penguin-frame">
        {hasError ? (
          <div className="penguin-placeholder">
            <span>이미지를 추가해주세요</span>
            <span className="muted">public/{basePath}/Lv{clampedLevel}.png</span>
          </div>
        ) : (
          <img
            src={src}
            alt={`Penguin level ${clampedLevel}`}
            onError={() => setHasError(true)}
            loading="lazy"
          />
        )}
      </div>
    </div>
  )
}
