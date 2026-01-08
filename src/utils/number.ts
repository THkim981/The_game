export type NumberFormatStyle = 'alphabet' | 'scientific'

const NUMBER_FORMAT_STORAGE_KEY = 'numberFormatStyle'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeStyle(input: unknown): NumberFormatStyle {
  return input === 'scientific' ? 'scientific' : 'alphabet'
}

function loadInitialStyle(): NumberFormatStyle {
  if (!isBrowser()) return 'alphabet'
  try {
    return normalizeStyle(window.localStorage.getItem(NUMBER_FORMAT_STORAGE_KEY))
  } catch {
    return 'alphabet'
  }
}

let currentStyle: NumberFormatStyle = loadInitialStyle()

export function getNumberFormatStyle(): NumberFormatStyle {
  return currentStyle
}

export function setNumberFormatStyle(style: NumberFormatStyle): void {
  currentStyle = style
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(NUMBER_FORMAT_STORAGE_KEY, style)
  } catch {
    // ignore
  }
}

export function formatNumberAlphabet(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (!Number.isFinite(value)) return String(value)

  if (abs < 1e3) return `${sign}${abs.toFixed(2)}`

  const groupIndex = Math.floor(Math.log10(abs) / 3) // 1 => 1e3
  const scaled = abs / 10 ** (groupIndex * 3)
  return `${sign}${scaled.toFixed(2)}${alphabetSuffix(groupIndex)}`
}

function alphabetSuffix(groupIndex: number): string {
  // groupIndex: 1 => 'a' (1e3), 2 => 'b' (1e6), ... 26 => 'z'
  // 27 => 'Aa', 28 => 'Ab', ... 52 => 'Az', 53 => 'Ba', ...
  if (groupIndex <= 0) return ''

  const r = (groupIndex - 1) % 26
  const lower = String.fromCharCode('a'.charCodeAt(0) + r)

  const prefixIndex = Math.floor((groupIndex - 1) / 26) // 0 for a..z, 1 for A?, 2 for B?, ...
  if (prefixIndex <= 0) return lower

  return `${upperLetters(prefixIndex)}${lower}`
}

function upperLetters(index: number): string {
  // Excel-like columns but 1-indexed: 1 => A, 2 => B, ... 26 => Z, 27 => AA, ...
  let n = index
  let out = ''
  while (n > 0) {
    n -= 1
    out = String.fromCharCode('A'.charCodeAt(0) + (n % 26)) + out
    n = Math.floor(n / 26)
  }
  return out
}

export function formatNumberScientific(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (!Number.isFinite(value)) return String(value)

  if (abs >= 1e3) {
    const exponent = Math.floor(Math.log10(abs))
    const mantissa = abs / 10 ** exponent
    return `${sign}${mantissa.toFixed(2)}e${exponent}`
  }

  return `${sign}${abs.toFixed(2)}`
}

export function formatNumber(value: number) {
  return currentStyle === 'scientific' ? formatNumberScientific(value) : formatNumberAlphabet(value)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
