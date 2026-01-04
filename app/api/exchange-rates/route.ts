import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import {
  getExchangeRates,
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

    // Return all rates
    const rates = await getExchangeRates()
    return NextResponse.json({
      base: rates.base,
      rates: rates.rates,
      timestamp: rates.timestamp,
      usingFallback: isUsingFallbackRates(),
    })
  } catch (error) {
    console.error("Exchange rate API error:", error)
    return NextResponse.json({ error: "匯率查詢失敗" }, { status: 500 })
  }
}
