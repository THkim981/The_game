import { Modal } from './Modal'
import type { NumberFormatStyle } from '../utils/number'
import { useMemo, useState } from 'react'

type SettingsModalProps = {
  open: boolean
  animationsDisabled: boolean
  featureView: 'penguin' | 'chart'
  numberFormatStyle: NumberFormatStyle
  onClose: () => void
  onOpenRanking: () => void
  onManualSave: () => void
  onResetProgress: () => void
  onToggleAnimations: (value: boolean) => void
  onChangeFeatureView: (value: 'penguin' | 'chart') => void
  onChangeNumberFormatStyle: (value: NumberFormatStyle) => void
  onSetCashAbsolute: (cashValue: number) => void
}

export function SettingsModal({
  open,
  animationsDisabled,
  featureView,
  numberFormatStyle,
  onClose,
  onOpenRanking,
  onManualSave,
  onResetProgress,
  onToggleAnimations,
  onChangeFeatureView,
  onChangeNumberFormatStyle,
  onSetCashAbsolute,
}: SettingsModalProps) {
  const isDev = useMemo(() => Boolean(import.meta.env.DEV), [])
  const [cashInput, setCashInput] = useState('')

  const applyCash = () => {
    const normalized = cashInput.trim().replace(/[, _]/g, '')
    onSetCashAbsolute(Number(normalized))
  }

  return (
    <Modal open={open} title="설정" onClose={onClose}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={animationsDisabled}
          onChange={(event) => onToggleAnimations(event.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>애니메이션 끄기</p>
          <p className="muted" style={{ marginTop: 4 }}>
            숫자 증감, 토스트, 이펙트 등 화면 움직임을 모두 정지합니다.
          </p>
        </div>
      </label>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>메인 강조 보기</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="feature-view"
            value="penguin"
            checked={featureView === 'penguin'}
            onChange={() => onChangeFeatureView('penguin')}
          />
          <span>귀여운 펭귄 보기</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="feature-view"
            value="chart"
            checked={featureView === 'chart'}
            onChange={() => onChangeFeatureView('chart')}
          />
          <span>상승 그래프 보기 (Cash 추이)</span>
        </label>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>숫자 표시 형식</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="number-format"
            value="alphabet"
            checked={numberFormatStyle === 'alphabet'}
            onChange={() => onChangeNumberFormatStyle('alphabet')}
          />
          <span>알파벳(a,b,c… / z 다음 Aa…)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="number-format"
            value="scientific"
            checked={numberFormatStyle === 'scientific'}
            onChange={() => onChangeNumberFormatStyle('scientific')}
          />
          <span>지수(1eXX)</span>
        </label>
        <p className="muted" style={{ margin: 0 }}>
          숫자 표기만 바뀌며 실제 계산/밸런스는 동일합니다.
        </p>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>기록</p>
        <button className="ghost pill" onClick={onManualSave}>
          수동 저장(10분에 한 번 자동 저장됨)
        </button>
        <button className="ghost pill" onClick={onOpenRanking}>
          랭킹 보기
        </button>
        <button className="ghost pill" onClick={onResetProgress}>
          기록 초기화
        </button>
        <p className="muted" style={{ margin: 0 }}>
          진행 상황과 기록이 초기화되고 처음부터 시작합니다.
        </p>

        {isDev && (
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>개발용</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="Cash 입력 (예: 1e12 또는 123456)"
                style={{ flex: 1, minWidth: 220 }}
              />
              <button className="ghost pill" onClick={applyCash}>
                Cash 적용
              </button>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              개발 모드에서만 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
