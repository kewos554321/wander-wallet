"use client"

import { useCallback, useMemo, useState } from "react"
import { DEFAULT_ICON_COVER } from "@/lib/covers"

export type JoinMode = "both" | "create_only" | "claim_only"

export const JOIN_MODE_OPTIONS: { value: JoinMode; label: string; description: string }[] = [
  { value: "both", label: "兩者皆可", description: "新成員可選擇建立新身份或取代佔位成員" },
  { value: "create_only", label: "僅建立新成員", description: "新成員只能建立自己的身份" },
  { value: "claim_only", label: "僅取代佔位成員", description: "新成員只能取代現有的佔位成員" },
]

export interface ProjectFormValues {
  name: string
  description: string
  cover: string | null
  startDate: string | null
  endDate: string | null
  currency: string
  budget: string
  joinMode: JoinMode
  exchangeRatePrecision: number
  customRates: Record<string, string>
}

export function emptyProjectForm(currency: string): ProjectFormValues {
  return { name: "", description: "", cover: DEFAULT_ICON_COVER, startDate: null, endDate: null, currency, budget: "", joinMode: "both", exchangeRatePrecision: 2, customRates: {} }
}

export function validateProjectForm(v: ProjectFormValues): string | null {
  if (!v.name.trim()) return "請輸入旅程名稱"
  // yyyy-MM-dd strings compare correctly as text.
  if (v.startDate && v.endDate && v.endDate < v.startDate) return "結束日需晚於出發日"
  if (v.budget.trim() !== "") {
    const n = Number(v.budget)
    if (!Number.isFinite(n) || n < 0) return "預算需為 0 以上的數字"
  }
  if (!Number.isInteger(v.exchangeRatePrecision) || v.exchangeRatePrecision < 0 || v.exchangeRatePrecision > 8) return "匯率精度需為 0 到 8 的整數"
  for (const rate of Object.values(v.customRates)) {
    if (rate.trim() === "") continue
    const n = Number(rate)
    if (!Number.isFinite(n) || n <= 0) return "自訂匯率需大於 0"
  }
  return null
}

export function toCreatePayload(v: ProjectFormValues): Record<string, unknown> {
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    cover: v.cover,
    startDate: v.startDate,
    endDate: v.endDate,
    budget: v.budget.trim() === "" ? null : Number(v.budget),
    currency: v.currency,
    joinMode: v.joinMode,
  }
}

export function toUpdatePayload(v: ProjectFormValues): Record<string, unknown> {
  const rates = Object.entries(v.customRates).filter(([, r]) => r.trim() !== "")
  return {
    ...toCreatePayload(v),
    exchangeRatePrecision: v.exchangeRatePrecision,
    customRates: rates.length > 0 ? Object.fromEntries(rates.map(([k, r]) => [k, Number(r)])) : null,
  }
}

export function useProjectForm(initial: ProjectFormValues) {
  const [values, setValues] = useState(initial)
  const set = useCallback(<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setValues((s) => ({ ...s, [key]: value })), [])
  const error = useMemo(() => validateProjectForm(values), [values])
  return { values, set, reset: setValues, error }
}
