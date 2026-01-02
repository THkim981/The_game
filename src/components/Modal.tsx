import { useId } from 'react'
import type { MouseEvent, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  hideClose?: boolean
}

export function Modal({ open, title, onClose, children, footer, hideClose = false }: ModalProps) {
  if (!open) return null

  const labelId = useId()

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      if (!hideClose) onClose()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id={labelId}>{title}</h3>
          {hideClose ? null : (
            <button className="ghost pill" onClick={onClose} aria-label="설정 창 닫기">✕</button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
