"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { CurrencySelect } from "@/components/ui/currency-select"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import type { CurrencyCode } from "@/lib/constants/currencies"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { emptyProjectForm, toCreatePayload, useProjectForm } from "@/lib/hooks/use-project-form"
import { TripPreviewCard } from "./trip-preview-card"

export function NewProjectV2() {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { preferences } = usePreferences()
  const { values, set, error: formError } = useProjectForm(emptyProjectForm(preferences.defaultCurrency))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (formError) {
      setError(formError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreatePayload(values)),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/projects/${data.id}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "建立失敗，請重試")
      }
    } catch {
      setError("建立失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <V2TopBar title="建立旅程" backHref="/projects" />
        <div className="space-y-5 px-4 pb-32 pt-4.5">
          <TripPreviewCard cover={values.cover} name={values.name} startDate={values.startDate} endDate={values.endDate} />

          <CoverPickerV2 value={values.cover} onChange={(cover) => set("cover", cover)} disabled={submitting} />

          <div>
            <label htmlFor="v2-trip-name" className="mb-2 block text-xs font-semibold text-v2-ink-muted">
              旅程名稱 <span className="text-v2-danger">*</span>
            </label>
            <input
              id="v2-trip-name"
              aria-label="旅程名稱"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={submitting}
              placeholder="例如：日本關西 5 天、歐洲自由行"
              className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[15px] font-bold tracking-[.5px] outline-none"
            />
          </div>

          <DateRangeField
            label="出發日與結束日"
            startDate={values.startDate}
            endDate={values.endDate}
            onChange={(start, end) => {
              set("startDate", start)
              set("endDate", end)
            }}
            disabled={submitting}
          />

          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-v2-ink-muted">結算幣別</label>
              <CurrencySelect value={values.currency as CurrencyCode} onChange={(c) => set("currency", c)} disabled={submitting} className="w-full" />
            </div>
            <div className="flex-1">
              <label htmlFor="v2-budget" className="mb-2 block text-xs font-semibold text-v2-ink-muted">
                預算（選填）
              </label>
              <input
                id="v2-budget"
                aria-label="預算"
                inputMode="decimal"
                value={values.budget}
                onChange={(e) => set("budget", e.target.value)}
                disabled={submitting}
                placeholder="10000"
                className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="v2-desc" className="mb-2 block text-xs font-semibold text-v2-ink-muted">
              描述（選填）
            </label>
            <textarea
              id="v2-desc"
              aria-label="描述"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={submitting}
              placeholder="記錄這次旅行的目的地、日期等資訊……"
              rows={4}
              className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
            />
          </div>

          <JoinModePicker value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={submitting} />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
          <div className="mx-auto max-w-md">
            {error && (
              <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="w-full rounded-2xl bg-v2-lake py-[15px] text-[15px] font-bold text-white disabled:opacity-40"
            >
              {submitting ? "建立中…" : "建立旅程"}
            </button>
          </div>
        </div>
      </div>
    </UiV2Scope>
  )
}
