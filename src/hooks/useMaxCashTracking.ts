import { useEffect } from 'react'

export function useMaxCashTracking(params: {
  cash: number
  setMaxCash: React.Dispatch<React.SetStateAction<number>>
  setRunMaxCash: React.Dispatch<React.SetStateAction<number>>
}) {
  const { cash, setMaxCash, setRunMaxCash } = params

  useEffect(() => {
    setMaxCash((prev) => (cash > prev ? cash : prev))
    setRunMaxCash((prev) => (cash > prev ? cash : prev))
  }, [cash, setMaxCash, setRunMaxCash])
}
