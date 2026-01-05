import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import {
  getExchangeRates,
  getHistoricalRates,
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
      date: date || new Date().toISOString().split("T")[0],
      isHistorical: !!date,
      usingFallback: isUsingFallbackRates(),
    })
  } catch (error) {
    console.error("Exchange rate API error:", error)
    return NextResponse.json({ error: "匯率查詢失敗" }, { status: 500 })
  }
}
