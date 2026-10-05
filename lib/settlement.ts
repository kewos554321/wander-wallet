import { getTripDays } from "@/lib/trip"

// Days come from the trip dates when both are set; otherwise from the span of
// expense payment dates (inclusive). No days → 0.
export function computeDailyAverage(
  total: number,
  trip: { startDate: string | null; endDate: string | null },
  expenseDates: string[]
): number {
  let days = getTripDays(trip.startDate, trip.endDate)
  if (days === null && expenseDates.length > 0) {
    const times = expenseDates.map((d) => new Date(d).getTime())
    days = getTripDays(new Date(Math.min(...times)).toISOString(), new Date(Math.max(...times)).toISOString())
  }
  return days && days > 0 ? total / days : 0
}
