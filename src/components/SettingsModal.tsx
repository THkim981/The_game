import { Modal } from './Modal'
import type { NumberFormatStyle } from '../utils/number'
import { useMemo, useState } from 'react'

type SettingsModalProps = {
  open: boolean
  animationsDisabled: boolean
  outcomeTextDisabled: boolean
  featureView: 'penguin' | 'chart'
  numberFormatStyle: NumberFormatStyle
  onClose: () => void
  onOpenRanking: () => void
  onManualSave: () => void
  onToggleAnimations: (value: boolean) => void
  onToggleOutcomeText: (value: boolean) => void
  onChangeFeatureView: (value: 'penguin' | 'chart') => void
  onChangeNumberFormatStyle: (value: NumberFormatStyle) => void
  onSetCashAbsolute: (cashValue: number) => void
  onApplyCoupon: (code: string) => { success: boolean; message: string }
}

export function SettingsModal({
  open,
  animationsDisabled,
  outcomeTextDisabled,
  featureView,
  numberFormatStyle,
  onClose,
  onOpenRanking,
  onManualSave,
  onToggleAnimations,
  onToggleOutcomeText,
  onChangeFeatureView,
  onChangeNumberFormatStyle,
  onSetCashAbsolute,
  onApplyCoupon,
}: SettingsModalProps) {
  const isDev = useMemo(() => Boolean(import.meta.env.DEV), [])
  const [cashInput, setCashInput] = useState('')
  const [couponCode, setCouponCode] = useState('')

  const applyCash = () => {
    const normalized = cashInput.trim().replace(/[, _]/g, '')
    onSetCashAbsolute(Number(normalized))
  }

  const applyCoupon = () => {
    const code = couponCode.trim()
    if (!code) return

    const result = onApplyCoupon(code)
    if (result.success) {
      alert(result.message)
      setCouponCode('')
    } else {
      alert(`❌ ${result.message}`)
    }
  }

  return (
    <Modal open={open} title="⚙️ 설정" onClose={onClose}>
      <div className="settings-content">
        {/* 애니메이션 설정 */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-icon">✨</span>
            <h4>애니메이션</h4>
          </div>
          <label className="settings-toggle-item">
            <div className="settings-item-content">
              <div className="settings-item-title">애니메이션 끄기</div>
              <div className="settings-item-desc">숫자 증감, 토스트, 이펙트 등 화면 움직임을 모두 정지합니다.</div>
            </div>
            <input
              type="checkbox"
              checked={animationsDisabled}
              onChange={(event) => onToggleAnimations(event.target.checked)}
              className="settings-checkbox"
            />
          </label>

          <label className="settings-toggle-item">
            <div className="settings-item-content">
              <div className="settings-item-title">성공/실패 문구 숨기기</div>
              <div className="settings-item-desc">도박 결과 토스트(성공/실패/대성공/대실패) 문구를 표시하지 않습니다.</div>
            </div>
            <input
              type="checkbox"
              checked={outcomeTextDisabled}
              onChange={(event) => onToggleOutcomeText(event.target.checked)}
              className="settings-checkbox"
            />
          </label>
        </div>

        {/* 메인 보기 설정 */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-icon">👁️</span>
            <h4>메인 강조 보기</h4>
          </div>
          <div className="settings-radio-group">
            <label className="settings-radio-item">
              <input
                type="radio"
                name="feature-view"
                value="penguin"
                checked={featureView === 'penguin'}
                onChange={() => onChangeFeatureView('penguin')}
                className="settings-radio"
              />
              <span className="settings-radio-label">
                <span className="radio-icon">🐧</span>
                <span>귀여운 펭귄 보기</span>
              </span>
            </label>
            <label className="settings-radio-item">
              <input
                type="radio"
                name="feature-view"
                value="chart"
                checked={featureView === 'chart'}
                onChange={() => onChangeFeatureView('chart')}
                className="settings-radio"
              />
              <span className="settings-radio-label">
                <span className="radio-icon">📈</span>
                <span>상승 그래프 보기 (Cash 추이)</span>
              </span>
            </label>
          </div>
        </div>

        {/* 숫자 표시 형식 */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-icon">🔢</span>
            <h4>숫자 표시 형식</h4>
          </div>
          <div className="settings-radio-group">
            <label className="settings-radio-item">
              <input
                type="radio"
                name="number-format"
                value="alphabet"
                checked={numberFormatStyle === 'alphabet'}
                onChange={() => onChangeNumberFormatStyle('alphabet')}
                className="settings-radio"
              />
              <span className="settings-radio-label">
                <span className="radio-icon">🔤</span>
                <span>알파벳 (a, b, c… / z 다음 Aa…)</span>
              </span>
            </label>
            <label className="settings-radio-item">
              <input
                type="radio"
                name="number-format"
                value="scientific"
                checked={numberFormatStyle === 'scientific'}
                onChange={() => onChangeNumberFormatStyle('scientific')}
                className="settings-radio"
              />
              <span className="settings-radio-label">
                <span className="radio-icon">🔬</span>
                <span>지수 표기법 (1eXX)</span>
              </span>
            </label>
          </div>
          <p className="settings-hint">숫자 표기만 바뀌며 실제 계산/밸런스는 동일합니다.</p>
        </div>

        {/* 기록 및 랭킹 */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-icon">💾</span>
            <h4>기록 관리</h4>
          </div>
          <div className="settings-button-group">
            <button className="settings-button" onClick={onManualSave}>
              <span className="button-icon">💾</span>
              수동 저장
            </button>
            <button className="settings-button" onClick={onOpenRanking}>
              <span className="button-icon">🏆</span>
              랭킹 보기
            </button>
          </div>
          <p className="settings-hint">10분마다 자동 저장됩니다.</p>
        </div>

        {/* 쿠폰 */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-icon">🎁</span>
            <h4>쿠폰</h4>
          </div>
          <div className="settings-dev-group">
            <input
              className="settings-input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="쿠폰 코드를 입력하세요"
              onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
            />
            <button 
              className="settings-button" 
              onClick={applyCoupon}
              disabled={!couponCode.trim()}
            >
              <span className="button-icon">✓</span>
              적용
            </button>
          </div>
          <p className="settings-hint">특별 쿠폰 코드를 입력하여 혜택을 받으세요.</p>
        </div>

        {/* 개발자 도구 */}
        {isDev && (
          <div className="settings-section settings-dev">
            <div className="settings-section-header">
              <span className="settings-icon">🔧</span>
              <h4>개발자 도구</h4>
            </div>
            <div className="settings-dev-group">
              <input
                className="settings-input"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="Cash 입력 (예: 1e12 또는 123456)"
              />
              <button className="settings-button dev" onClick={applyCash}>
                Cash 적용
              </button>
            </div>
            <p className="settings-hint">⚠️ 개발 모드에서만 표시됩니다.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
