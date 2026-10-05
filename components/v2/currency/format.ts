/** Relative time / staleness / rate helpers for the v2 currency screen (v1 parity). */

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60_000)
  if (minutes < 1) return "剛剛"
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  return `${Math.floor(hours / 24)} 天前`
}

export function isRatesStale(timestamp: number | null, now: number = Date.now()): boolean {
  if (!timestamp) return false
  return now - timestamp > 24 * 60 * 60 * 1000
}

export function customRateDiff(customRate: number, liveRate: number): number {
  if (!liveRate) return 0
  return ((customRate - liveRate) / liveRate) * 100
}

export function rateFromRates(from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return 1
  const fromRate = rates[from] || 1
  const toRate = rates[to] || 1
  return toRate / fromRate
}
