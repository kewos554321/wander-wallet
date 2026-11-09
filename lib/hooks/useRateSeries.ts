import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, parseISO, subDays } from "date-fns"
import { useAuthFetch } from "@/components/auth/liff-provider"

export type RateRange = 7 | 30 | 90

export interface RatePoint {
  date: string
  rate: number
}

interface UseRateSeriesOptions {
  base: string
  quote: string
  endDate: string
  days: RateRange
  enabled?: boolean
}

interface UseRateSeriesReturn {
  points: RatePoint[] | null
  loading: boolean
  error: string | null
  startDate: string
  endDate: string
  refetch: () => Promise<void>
}

/**
 * Daily trend data for one currency pair. The end date follows the page's
 * date filter, so a historical date also gets a historical window.
 */
export function useRateSeries({
  base,
  quote,
  endDate,
  days,
  enabled = true,
}: UseRateSeriesOptions): UseRateSeriesReturn {
  const authFetch = useAuthFetch()
  const [points, setPoints] = useState<RatePoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const startDate = useMemo(
    () => format(subDays(parseISO(endDate), days - 1), "yyyy-MM-dd"),
    [endDate, days]
  )

  const fetchSeries = useCallback(async () => {
    if (!enabled || base === quote) {
      setPoints(null)
      setError(null)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    setLoading(true)
    setError(null)
    setPoints(null)
    try {
      const res = await authFetch(
        `/api/exchange-rates?start=${startDate}&end=${endDate}&base=${base}&quote=${quote}`
      )
      const data = await res.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!res.ok) {
        throw new Error(data.error ?? "查不到趨勢資料")
      }
      setPoints(Array.isArray(data.points) ? data.points : [])
    } catch (err) {
      if (id !== requestId.current) return
      setPoints(null)
      setError(err instanceof Error ? err.message : "查不到趨勢資料")
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [authFetch, base, quote, startDate, endDate, enabled])

  useEffect(() => {
    void fetchSeries()
  }, [fetchSeries])

  return { points, loading, error, startDate, endDate, refetch: fetchSeries }
}
