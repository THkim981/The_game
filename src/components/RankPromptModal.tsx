import { useEffect, useState } from 'react'

import { getRanking, setNickname as setNicknameApi, type RankingEntry } from '../utils/profileStorage'
import { Modal } from './Modal'

type RankPromptMode = 'prompt' | 'leaderboard'

type RankPromptModalProps = {
  open: boolean
  mode?: RankPromptMode
  rankPromptSeconds: number | null
  userId: string
  onClose: () => void
  onSave?: (nickname: string) => void
  formatDuration: (seconds: number) => string
}

export function RankPromptModal({
  open,
  mode = 'prompt',
  rankPromptSeconds,
  userId,
  onClose,
  onSave,
  formatDuration,
}: RankPromptModalProps) {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)
  const [rankingError, setRankingError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [canNextPage, setCanNextPage] = useState(false)
  const [nickname, setNickname] = useState('')
  const [nicknameApplying, setNicknameApplying] = useState(false)
  const [nicknameApplyMsg, setNicknameApplyMsg] = useState<string | null>(null)

  const pageSize = 5

  useEffect(() => {
    if (!open) return
    if (mode === 'leaderboard') setPage(0)
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    setNicknameApplyMsg(null)
  }, [open, mode])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    void Promise.resolve()
      .then(async () => {
        if (cancelled) return
        setRankingLoading(true)
        setRankingError(null)
        const rows = await getRanking({
          limit: pageSize,
          offset: mode === 'leaderboard' ? page * pageSize : 0,
        })
        if (cancelled) return
        setRanking(rows)
        setCanNextPage(rows.length >= pageSize)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setRankingError(err instanceof Error ? err.message : '랭킹을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, mode, page])

  const formatScore = (seconds: number) => `${formatDuration(Math.floor(seconds))} (${seconds.toFixed(2)}초)`
  const displayName = (row: RankingEntry) => {
    const nick = typeof row.nickname === 'string' ? row.nickname.trim() : ''
    return nick ? nick : '익명'
  }

  const onConfirmSave = () => {
    if (!onSave) return
    onSave(nickname.trim())
  }

  return (
    <Modal
      open={open}
      title="랭킹 기록"
      onClose={onClose}
      footer={
        mode === 'prompt' ? (
          <>
            <button className="ghost" onClick={onClose} style={{ padding: '10px 20px' }}>
              ❌ 나중에
            </button>
            <button 
              onClick={onConfirmSave} 
              disabled={!onSave || rankPromptSeconds === null}
              style={{ 
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #11a39c, #0d8079)',
                fontWeight: 600,
              }}
            >
              ✅ 기록하기
            </button>
          </>
        ) : undefined
      }
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
        {mode === 'prompt' ? (
          <>
            <div style={{
              background: 'linear-gradient(135deg, rgba(17, 163, 156, 0.2), rgba(17, 163, 156, 0.05))',
              border: '1px solid rgba(17, 163, 156, 0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎉</div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, textAlign: 'center', color: '#e8f7f9' }}>
                1e100를 달성했습니다!
              </p>
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: 'rgba(232, 247, 249, 0.7)', marginBottom: 4 }}>기록 시간</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#11a39c' }}>
                  {rankPromptSeconds === null ? '계산 중...' : formatScore(rankPromptSeconds)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e8f7f9' }}>👤 닉네임</span>
                  <span style={{ fontSize: 12, color: 'rgba(232, 247, 249, 0.5)' }}>(선택)</span>
                </div>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#e8f7f9',
                    fontSize: 14,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onSave && rankPromptSeconds !== null) {
                      onConfirmSave()
                    }
                  }}
                />
              </label>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                💡 입력하지 않으면 익명으로 표시됩니다.
              </p>
            </div>
          </>
        ) : (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(125, 215, 222, 0.1)',
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
              📊 시간이 빠를수록 상위 랭킹 · 10개씩 페이지 표시
            </p>
          </div>
        )}

        {mode === 'leaderboard' && (
          <div style={{
            display: 'grid',
            gap: 8,
            marginTop: 8,
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#e8f7f9' }}>👤 닉네임 설정</div>
              <div className="muted" style={{ fontSize: 12 }}>
                랭킹에 표시될 이름
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력 (최대 12자)"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e8f7f9',
                  fontSize: 14,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void (async () => {
                      if (!nickname.trim()) return
                      if (!userId) return
                      try {
                        setNicknameApplying(true)
                        setNicknameApplyMsg(null)
                        await setNicknameApi(userId, nickname.trim())
                        setNicknameApplyMsg('✅ 닉네임이 적용되었습니다')

                        const rows = await getRanking({ limit: pageSize, offset: page * pageSize })
                        setRanking(rows)
                        setCanNextPage(rows.length >= pageSize)
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : '닉네임 적용 실패'
                        setNicknameApplyMsg(`❌ ${msg}`)
                      } finally {
                        setNicknameApplying(false)
                      }
                    })()
                  }
                }}
              />
              <button
                className="pill"
                disabled={nicknameApplying || !nickname.trim()}
                onClick={() => {
                  void (async () => {
                    if (!nickname.trim()) return
                    if (!userId) return
                    try {
                      setNicknameApplying(true)
                      setNicknameApplyMsg(null)
                      await setNicknameApi(userId, nickname.trim())
                      setNicknameApplyMsg('✅ 닉네임이 적용되었습니다')

                      const rows = await getRanking({ limit: pageSize, offset: page * pageSize })
                      setRanking(rows)
                      setCanNextPage(rows.length >= pageSize)
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : '닉네임 적용 실패'
                      setNicknameApplyMsg(`❌ ${msg}`)
                    } finally {
                      setNicknameApplying(false)
                    }
                  })()
                }}
                style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #11a39c, #0d8079)',
                  fontWeight: 700,
                }}
              >
                적용
              </button>
            </div>

            {nicknameApplyMsg ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {nicknameApplyMsg}
              </div>
            ) : null}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <div className="ranking-header" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              🏆 TOP 랭킹
            </p>
            {mode === 'leaderboard' && (
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <button className="ghost pill" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>
                  ◀ 이전
                </button>
                <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                  {page + 1}
                </span>
                <button
                  className="ghost pill"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNextPage || rankingLoading}
                >
                  다음 ▶
                </button>
              </div>
            )}
          </div>
          {rankingLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7dd7de' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p style={{ margin: 0, fontSize: 14 }}>불러오는 중...</p>
            </div>
          ) : rankingError ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#ff6b6b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <p style={{ margin: 0, fontSize: 14 }}>{rankingError}</p>
            </div>
          ) : ranking.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(232, 247, 249, 0.5)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <p style={{ margin: 0, fontSize: 14 }}>아직 랭킹이 없습니다</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ranking.map((row, i) => {
                const rank = page * pageSize + i + 1
                const getMedalIcon = (r: number) => {
                  if (r === 1) return '🥇'
                  if (r === 2) return '🥈'
                  if (r === 3) return '🥉'
                  return ''
                }
                const isTopThree = rank <= 3
                return (
                  <div
                    key={row.userId}
                    className="ranking-item"
                    style={{
                      background: isTopThree
                        ? 'linear-gradient(135deg, rgba(17, 163, 156, 0.15), rgba(17, 163, 156, 0.05))'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isTopThree
                        ? '1px solid rgba(17, 163, 156, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div
                      style={{
                        minWidth: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isTopThree ? 24 : 16,
                        fontWeight: 700,
                        color: isTopThree ? '#11a39c' : 'rgba(232, 247, 249, 0.6)',
                        background: isTopThree ? 'rgba(17, 163, 156, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 8,
                      }}
                    >
                      {getMedalIcon(rank) || `#${rank}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#e8f7f9',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayName(row)}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(232, 247, 249, 0.6)' }}>
                        ⏱️ {formatScore(row.bestScoreSeconds)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
