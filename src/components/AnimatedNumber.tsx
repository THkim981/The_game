import { useEffect, useRef, useState } from 'react'
import { clamp } from '../utils/number'

type AnimatedNumberProps = {
  value: number
  formatter?: (v: number) => string
  duration?: number
  snapKey?: number
}

export function AnimatedNumber({ value, formatter = (v) => v.toFixed(2), duration = 240, snapKey }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | null>(null)
  const snapRef = useRef<number | undefined>(snapKey)

  useEffect(() => {
    const snapped = snapKey !== undefined && snapKey !== snapRef.current
    if (snapped) {
      snapRef.current = snapKey
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setDisplay(value)
      return
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const from = display
    const to = value

    const step = (now: number) => {
      const t = clamp((now - start) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplay(from + (to - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, snapKey])

  return <span>{formatter(display)}</span>
}
