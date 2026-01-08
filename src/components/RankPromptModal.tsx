import { useEffect, useState } from 'react'

import { getRanking, type RankingEntry } from '../utils/profileStorage'
import { Modal } from './Modal'

type RankPromptMode = 'prompt' | 'leaderboard'

type RankPromptModalProps = {
  open: boolean
  mode?: RankPromptMode
  rankPromptSeconds: number | null
  onClose: () => void
  onSave?: () => void
  formatDuration: (seconds: number) => string
}

export function RankPromptModal({
  open,
  mode = 'prompt',
  rankPromptSeconds,
  onClose,
  onSave,
  formatDuration,
}: RankPromptModalProps) {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)
  const [rankingError, setRankingError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setRankingLoading(true)
    setRankingError(null)
    void getRanking(10)
      .then((rows) => setRanking(rows))
      .catch((err: unknown) => setRankingError(err instanceof Error ? err.message : '랭킹을 불러오지 못했습니다.'))
      .finally(() => setRankingLoading(false))
  }, [open])

  const formatScore = (seconds: number) => `${formatDuration(Math.floor(seconds))} (${seconds.toFixed(2)}초)`
  const shortId = (userId: string) => (userId.length <= 8 ? userId : `${userId.slice(0, 6)}…${userId.slice(-4)}`)

  return (
    <Modal
      open={open}
      title="랭킹 기록"
      onClose={onClose}
      footer={
        mode === 'prompt' ? (
          <>
            <button className="ghost" onClick={onClose}>아니오</button>
            <button onClick={onSave} disabled={!onSave || rankPromptSeconds === null}>예</button>
          </>
        ) : undefined
      }
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
        {mode === 'prompt' ? (
          <>
            <p>1e100를 달성했습니다. 시간을 랭킹에 기록하시겠습니까?</p>
            <p className="muted" style={{ marginTop: 8 }}>
              기록 시간: {rankPromptSeconds === null ? '계산 중...' : formatScore(rankPromptSeconds)}
            </p>
          </>
        ) : (
          <p className="muted">TOP 랭킹 (프리스티지 이후 1e100까지 기록 · 시간이 낮을수록 상위)</p>
        )}

        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>TOP 10</p>
          {rankingLoading ? (
            <p className="muted" style={{ marginTop: 8 }}>
              불러오는 중...
            </p>
          ) : rankingError ? (
            <p className="muted" style={{ marginTop: 8 }}>
              {rankingError}
            </p>
          ) : ranking.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              랭킹 없음
            </p>
          ) : (
            <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
              {ranking.map((row, i) => (
                <li key={row.userId} className="muted" style={{ fontSize: 13 }}>
                  #{i + 1} · {formatScore(row.bestScoreSeconds)} · {shortId(row.userId)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  )
}
