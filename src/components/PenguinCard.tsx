import { useEffect, useMemo, useState } from 'react'

import { formatNumber } from '../utils/number'

type PenguinCardProps = {
  level: number
  basePath?: string
  note?: string
  allowBrowseDown?: boolean
}

export function PenguinCard({ level, basePath = 'penguin', note, allowBrowseDown = false }: PenguinCardProps) {
  const [variantIndex, setVariantIndex] = useState(0)
  const [exhausted, setExhausted] = useState(false)
  const maxLevel = useMemo(() => Math.max(1, Math.floor(level)), [level])
  const [viewLevel, setViewLevel] = useState(maxLevel)

  useEffect(() => {
    setViewLevel(maxLevel)
  }, [maxLevel])

  const currentLevel = allowBrowseDown ? viewLevel : maxLevel
  const clampedLevel = useMemo(() => Math.max(1, Math.floor(currentLevel)), [currentLevel])
  const mediaVariants = useMemo(
    () => [
      `${import.meta.env.BASE_URL}${basePath}/Lv${clampedLevel}.mp4`,
      `${import.meta.env.BASE_URL}${basePath}/Lv${clampedLevel}.png`,
    ],
    [basePath, clampedLevel],
  )
  const description =
    note ?? `펭귄은 최대 Cash 기준으로 진화합니다. Lv.${clampedLevel}`

  useEffect(() => {
    setVariantIndex(0)
    setExhausted(false)
  }, [mediaVariants])

  const src = mediaVariants[variantIndex]
  const isVideo = src?.toLowerCase().endsWith('.mp4')

  const handleMediaError = () => {
    setVariantIndex((idx) => {
      const next = idx + 1
      if (next >= mediaVariants.length) {
        setExhausted(true)
        return idx
      }
      return next
    })
  }

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
      {allowBrowseDown && maxLevel > 1 && (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button className="ghost pill" onClick={() => setViewLevel((lvl) => Math.max(1, lvl - 1))} disabled={clampedLevel <= 1}>
            이전 레벨
          </button>
          <button
            className="ghost pill"
            onClick={() => setViewLevel((lvl) => Math.min(maxLevel, lvl + 1))}
            disabled={clampedLevel >= maxLevel}
          >
            다음 레벨
          </button>
        </div>
      )}
      <div className="penguin-frame">
        {exhausted ? (
          <div className="penguin-placeholder">
            <span>이미지를 추가해주세요</span>
            <span className="muted">펭귄 미디어가 아직 없습니다</span>
          </div>
        ) : isVideo ? (
          <video
            src={src}
            onError={handleMediaError}
            loop
            autoPlay
            playsInline
            controls
            preload="auto"
            aria-label={`Penguin level ${clampedLevel}`}
            className="penguin-media"
          />
        ) : (
          <img
            src={src}
            alt={`Penguin level ${clampedLevel}`}
            onError={handleMediaError}
            loading="lazy"
          />
        )}
      </div>
    </div>
  )
}
