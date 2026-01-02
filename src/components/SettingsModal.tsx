import { Modal } from './Modal'

type SettingsModalProps = {
  open: boolean
  animationsDisabled: boolean
  featureView: 'penguin' | 'chart'
  penguinMapEnabled: boolean
  onClose: () => void
  onOpenRanking: () => void
  onManualSave: () => void
  onResetProgress: () => void
  onToggleAnimations: (value: boolean) => void
  onChangeFeatureView: (value: 'penguin' | 'chart') => void
  onTogglePenguinMap: (value: boolean) => void
}

export function SettingsModal({
  open,
  animationsDisabled,
  featureView,
  penguinMapEnabled,
  onClose,
  onOpenRanking,
  onManualSave,
  onResetProgress,
  onToggleAnimations,
  onChangeFeatureView,
  onTogglePenguinMap,
}: SettingsModalProps) {
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

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>펭귄 맵</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={penguinMapEnabled}
            onChange={(event) => onTogglePenguinMap(event.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <div>
            <p style={{ margin: 0 }}>펭귄 맵 활성화 (준비중)</p>
            <p className="muted" style={{ marginTop: 4 }}>추후 이동/모션을 이 맵에서 제어합니다.</p>
          </div>
        </label>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>기록</p>
        <button className="ghost pill" onClick={onManualSave}>
          수동 저장
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
      </div>
    </Modal>
  )
}
