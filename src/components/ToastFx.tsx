import type { Tone } from '../types'

export function Toast({
  tone,
  title,
  detail,
  toastKey,
}: {
  tone: Tone
  title: string
  detail: string
  toastKey: number
}) {
  return (
    <div key={toastKey} className={`toast ${tone}`}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function FxOverlay({ tone, fxKey }: { tone: Tone; fxKey: number }) {
  return <div key={fxKey} className={`fx fx-${tone}`} />
}
