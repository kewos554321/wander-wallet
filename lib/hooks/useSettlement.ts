"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/constants/currencies"

export interface SettleBalance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number
  totalPaid: number
  totalShare: number
}

export interface SettleSettlement {
  from: { memberId: string; displayName: string; userImage: string | null }
  to: { memberId: string; displayName: string; userImage: string | null }
  amount: number
}

export interface SettlePersonalItem {
  name: string
  amount: number
  convertedAmount: number
}

export interface SettleExpenseParticipant {
  memberId: string
  displayName: string
  userImage?: string | null
  shareAmount: number
  convertedShareAmount: number
  /** Personal ("個人項目") items, converted to the project currency. */
  personalItems?: SettlePersonalItem[]
  /** Shared ("共同分攤") remainder for non-custom members, project currency. */
  sharedAmount?: number
  /** Assigned ("指定") remainder for members with a custom share, project currency. */
  customAmount?: number
}

export interface SettleExpenseDetail {
  id: string
  description: string
  amount: number
  currency: string
  convertedAmount: number
  payer: { memberId: string; displayName: string; userImage?: string | null }
  participants: SettleExpenseParticipant[]
}

export interface SettleData {
  balances: SettleBalance[]
  settlements: SettleSettlement[]
  expenseDetails: SettleExpenseDetail[]
  summary: {
    totalExpenses: number
    totalAmount: number
    totalShared: number
    isBalanced: boolean
    currency?: string
    precision?: number
    exchangeRatesUsed?: Record<string, number>
    defaultRates?: Record<string, number>
    usingCustomRates?: Record<string, boolean>
    hasCustomRates?: boolean
  }
}

export function useSettlement(projectId: string) {
  const authFetch = useAuthFetch()
  const [data, setData] = useState<SettleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null) // null = project currency

  const refetch = useCallback(async () => {
    setError(null)
    try {
      const res = await authFetch(`/api/projects/${projectId}/settle`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const errData = await res.json()
        setError(errData.error || "獲取結算數據失敗")
      }
    } catch (err) {
      console.error("獲取結算數據錯誤:", err)
      setError("獲取結算數據失敗")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const baseCurrency = data?.summary.currency || DEFAULT_CURRENCY
  const displayCurrencyCode = displayCurrency || baseCurrency

  const toDisplay = useCallback(
    (amount: number) => {
      if (!displayCurrency || !data || displayCurrency === baseCurrency) return amount
      const rate = data.summary.exchangeRatesUsed?.[displayCurrency] || data.summary.defaultRates?.[displayCurrency]
      return rate ? amount / rate : amount
    },
    [displayCurrency, data, baseCurrency]
  )

  const shareText = useMemo(() => {
    if (!data) return ""
    const lines = ["💰 結算明細", `總支出：${formatCurrency(data.summary.totalAmount, baseCurrency)}`, ""]
    if (data.settlements.length === 0) {
      lines.push("✅ 所有人都已結清！")
    } else {
      lines.push("📋 轉帳清單：")
      data.settlements.forEach((s, idx) => {
        lines.push(`${idx + 1}. ${s.from.displayName} ➡️ ${s.to.displayName}：${formatCurrency(s.amount, baseCurrency)}`)
      })
    }
    return lines.join("\n")
  }, [data, baseCurrency])

  return { data, loading, error, displayCurrency, setDisplayCurrency, displayCurrencyCode, toDisplay, shareText, refetch }
}
