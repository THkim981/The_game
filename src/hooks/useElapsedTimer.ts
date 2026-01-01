import { useEffect } from 'react'

export function useElapsedTimer(startTime: React.MutableRefObject<number>, setElapsedSeconds: (value: number) => void) {
  useEffect(() => {
    const id = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsedSeconds(seconds)
    }, 1000)
    return () => window.clearInterval(id)
  }, [setElapsedSeconds, startTime])
}
