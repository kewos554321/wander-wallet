export type TripStatus = "active" | "completed"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// A trip without an end date is treated as active.
export function getTripStatus(endDate: string | null, now: Date): TripStatus {
  if (!endDate) return "active"
  const endOfLastDay = startOfLocalDay(new Date(endDate)) + DAY_MS - 1
  return now.getTime() > endOfLastDay ? "completed" : "active"
}

export function getTripDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null
  const diff = startOfLocalDay(new Date(endDate)) - startOfLocalDay(new Date(startDate))
  return Math.round(diff / DAY_MS) + 1
}

export function formatTripDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "尚未設定日期"
  const start = monthDay(new Date(startDate))
  if (!endDate) return `${start} 出發`
  return `${start} – ${monthDay(new Date(endDate))}`
}

export function getGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour >= 5 && hour < 11) return "早安"
  if (hour >= 11 && hour < 18) return "午安"
  return "晚安"
}
