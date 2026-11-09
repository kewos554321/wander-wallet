import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import {
  getExchangeRates,
  getHistoricalRates,
  getRateSeries,
  convertCurrency,
  isUsingFallbackRates,
} from "@/lib/services/exchange-rate"

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "未授權" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const amount = searchParams.get("amount")
    const date = searchParams.get("date") // YYYY-MM-DD for historical rates
    const base = searchParams.get("base") || "USD"
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const quote = searchParams.get("quote")

    // Time series for the trend chart. Uses start/end/quote so it does not
    // collide with the conversion parameters above.
    if (start && end && quote) {
      const isoDate = /^\d{4}-\d{2}-\d{2}$/
      if (!isoDate.test(start) || !isoDate.test(end)) {
        return NextResponse.json({ error: "日期格式不正確" }, { status: 400 })
      }
      if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote)) {
        return NextResponse.json({ error: "幣別格式不正確" }, { status: 400 })
      }
      const rangeDays =
        (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
        86_400_000
      if (rangeDays < 0 || rangeDays > 366) {
        return NextResponse.json({ error: "趨勢區間最多 366 天" }, { status: 400 })
      }

      const points = await getRateSeries({ start, end, base, quote })
      return NextResponse.json({
        base,
        quote,
        start,
        end,
        points,
        source: "Frankfurter",
        usingFallback: false,
      })
    }

    // If specific conversion requested
    if (from && to) {
      const amountNum = amount ? parseFloat(amount) : 1
      if (isNaN(amountNum)) {
        return NextResponse.json({ error: "無效的金額" }, { status: 400 })
      }

      const result = await convertCurrency(amountNum, from, to)
      return NextResponse.json({
        from,
        to,
        amount: amountNum,
        convertedAmount: result.convertedAmount,
        exchangeRate: result.exchangeRate,
        usingFallback: isUsingFallbackRates(),
      })
    }

    // Get historical or current rates
    const rates = date
      ? await getHistoricalRates(date, base)
      : await getExchangeRates(base)

    return NextResponse.json({
      base: rates.base,
      rates: rates.rates,
      timestamp: rates.timestamp,
      updatedAt: rates.timestamp,
      date: rates.date ?? date ?? new Date().toISOString().split("T")[0],
      requestedDate: date || null,
      isHistorical: !!date,
      source: rates.source ?? "Frankfurter",
      usingFallback: rates.isFallback ?? isUsingFallbackRates(),
    })
  } catch (error) {
    console.error("Exchange rate API error:", error)
    if (
      error instanceof Error &&
      (error.name === "HistoricalRateError" || error.name === "RateSeriesError")
    ) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ error: "匯率查詢失敗" }, { status: 500 })
  }
}
