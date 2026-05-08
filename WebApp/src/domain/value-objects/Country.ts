export interface Country {
  name: string
  code: string // ISO 3166-1 alpha-2
  stationCount: number
}

export function countryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const code = countryCode.toUpperCase()
  const offset = 0x1f1e6 - 65 // 'A'.charCodeAt(0) = 65
  const chars = Array.from(code).map((c) => {
    const cp = c.charCodeAt(0)
    return String.fromCodePoint(cp + offset)
  })
  return chars.join('')
}
