import { Modal } from './Modal'

type AuthModalProps = {
  open: boolean
  isRegisterMode: boolean
  username: string
  password: string
  busy: boolean
  error: string | null
  onChangeUsername: (value: string) => void
  onChangePassword: (value: string) => void
  onSubmit: () => void
  onToggleMode: () => void
  onClose?: () => void
}

export function AuthModal({
  open,
  isRegisterMode,
  username,
  password,
  busy,
  error,
  onChangeUsername,
  onChangePassword,
  onSubmit,
  onToggleMode,
  onClose,
}: AuthModalProps) {
  return (
    <Modal open={open} title={isRegisterMode ? '회원가입' : '로그인'} onClose={onClose ?? (() => {})} hideClose={!onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <p className="muted" style={{ margin: 0 }}>
          {isRegisterMode ? '새 계정을 만들려면 아이디와 비밀번호를 입력하세요.' : '아이디와 비밀번호를 입력하세요.'}
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 88 }} className="muted">
            아이디
          </span>
          <input
            value={username}
            onChange={(e) => onChangeUsername(e.target.value)}
            placeholder="아이디 (3자 이상)"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e8f7f9',
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 88 }} className="muted">
            비밀번호
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            placeholder="비밀번호 (4자 이상)"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e8f7f9',
            }}
          />
        </label>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="ghost pill" disabled={busy} onClick={onSubmit}>
            {busy ? '처리 중...' : isRegisterMode ? '회원가입' : '로그인'}
          </button>
          <button
            className="ghost pill"
            disabled={busy}
            onClick={() => {
              onToggleMode()
            }}
          >
            {isRegisterMode ? '로그인으로 전환' : '회원가입으로 전환'}
          </button>
        </div>
        {error ? (
          <p className="muted" style={{ margin: 0, color: '#ff6b6b' }}>
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
