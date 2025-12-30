export function formatNumber(value: number) {
  if (value >= 1e15) {
    const exponent = Math.floor(Math.log10(value))
    const mantissa = value / 10 ** exponent
    return `${mantissa.toFixed(2)}·10E${exponent}`
  }
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(2)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
