import type { Tone } from '../types'

export function Toast({
  tone,
  title,
  detail,
  toastKey,
  disableAnimations = false,
}: {
  tone: Tone
  title: string
  detail: string
  toastKey: number
  disableAnimations?: boolean
}) {
  return (
    <div
      key={toastKey}
      className={`toast ${tone}`}
      style={disableAnimations ? { animation: 'none', opacity: 1, transform: 'none' } : undefined}
    >
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function FxOverlay({ tone, fxKey, disableAnimations = false }: { tone: Tone; fxKey: number; disableAnimations?: boolean }) {
  if (disableAnimations) return null
  return <div key={fxKey} className={`fx fx-${tone}`} />
}
