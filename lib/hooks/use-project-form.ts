"use client"

import { useCallback, useMemo, useState } from "react"
import { DEFAULT_ICON_COVER } from "@/lib/covers"

export type JoinMode = "both" | "create_only" | "claim_only"

export const JOIN_MODE_OPTIONS: { value: JoinMode; label: string; description: string }[] = [
  { value: "create_only", label: "僅建立新旅伴", description: "新旅伴只能建立自己的身份" },
  { value: "claim_only", label: "僅取代佔位旅伴", description: "新旅伴只能取代現有的佔位旅伴" },
  { value: "both", label: "以上兩者皆可", description: "新旅伴可選擇建立新身份或取代佔位旅伴" },
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
}

export function emptyProjectForm(currency: string): ProjectFormValues {
  return { name: "", description: "", cover: DEFAULT_ICON_COVER, startDate: null, endDate: null, currency, budget: "", joinMode: "both" }
}

export type ProjectFormField = "name" | "dates" | "budget"

/**
 * Every validation failure, keyed by the field it belongs to, so a view can
 * mark and message all of them at once instead of one per submit round-trip.
 */
export function validateProjectFormErrors(v: ProjectFormValues): Partial<Record<ProjectFormField, string>> {
  const errors: Partial<Record<ProjectFormField, string>> = {}
  if (!v.name.trim()) errors.name = "請輸入旅程名稱"
  // yyyy-MM-dd strings compare correctly as text.
  if (v.startDate && v.endDate && v.endDate < v.startDate) errors.dates = "結束日需晚於出發日"
  if (v.budget.trim() !== "") {
    const n = Number(v.budget)
    if (!Number.isFinite(n) || n < 0) errors.budget = "預算需為 0 以上的數字"
  }
  return errors
}

/** The first failure and its field, for callers that only need one message. */
export function validateProjectFormError(
  v: ProjectFormValues,
): { field: ProjectFormField; message: string } | null {
  const errors = validateProjectFormErrors(v)
  const field = (["name", "dates", "budget"] as const).find((f) => errors[f])
  return field ? { field, message: errors[field]! } : null
}

export function validateProjectForm(v: ProjectFormValues): string | null {
  return validateProjectFormError(v)?.message ?? null
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
  return toCreatePayload(v)
}

export function useProjectForm(initial: ProjectFormValues) {
  const [values, setValues] = useState(initial)
  const set = useCallback(<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setValues((s) => ({ ...s, [key]: value })), [])
  const error = useMemo(() => validateProjectForm(values), [values])
  return { values, set, reset: setValues, error }
}
