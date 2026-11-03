"use client"

import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { V2CurrencyField, currencySymbol } from "@/components/v2/ui/currency-field"
import {
  BUDGET_ROW,
  CARD,
  CARD_TITLE,
  CTA_PRIMARY,
  ERROR_RING,
  FIELD_ERROR,
  FIELD_LABEL,
  HELP_TEXT,
  NAME_INPUT,
  NAME_PLACEHOLDER,
  TEXTAREA,
} from "@/components/v2/project/trip-form-styles"
import { minorUnitLabel } from "@/lib/constants/currencies"
import { sanitizeDecimal } from "@/lib/numeric-input"
import { validateProjectFormErrors, type ProjectFormValues } from "@/lib/hooks/use-project-form"
import { TripPreviewCard } from "./trip-preview-card"

export interface NewProjectV2ViewProps {
  values: ProjectFormValues
  set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void
  submitting: boolean
  error: string | null
  onCreate: () => void
}

/**
 * Presentational create-trip form. State and submission live in the container
 * (`NewProjectV2`); this view is also reused by the /demo area. Shares its card
 * order and field styles with the edit view (`ProjectSettingsV2View`).
 */
export function NewProjectV2View({ values, set, submitting, error, onCreate }: NewProjectV2ViewProps) {
  // `error` is only set after a submit attempt, so fields are only marked red then.
  const fieldErrors = error ? validateProjectFormErrors(values) : {}
  const hasFieldError = Object.keys(fieldErrors).length > 0

  return (
    <>
      <div className="flex flex-col gap-3.5 px-4 pb-[100px] pt-4">
        <div className={CARD}>
          <p className={CARD_TITLE}>卡片預覽</p>
          <TripPreviewCard cover={values.cover} name={values.name} startDate={values.startDate} endDate={values.endDate} />
        </div>

        <div className={CARD}>
          <p className={CARD_TITLE}>基本資訊</p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
            <p className={FIELD_LABEL}>封面</p>
            <label htmlFor="v2-trip-name" className={FIELD_LABEL}>
              旅程名稱 <span className="text-v2-danger" aria-hidden="true">*</span>
              <span className="sr-only">必填</span>
            </label>
            <CoverTileButton cover={values.cover} onChange={(cover) => set("cover", cover)} disabled={submitting} />
            <input
              id="v2-trip-name"
              aria-label="旅程名稱"
              aria-required="true"
              aria-invalid={fieldErrors.name ? true : undefined}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={submitting}
              placeholder={NAME_PLACEHOLDER}
              className={`${NAME_INPUT} ${fieldErrors.name ? ERROR_RING : ""}`}
            />
          </div>
          {fieldErrors.name && <p role="alert" className={FIELD_ERROR}>{fieldErrors.name}</p>}
          <div>
            <label htmlFor="v2-trip-desc" className={FIELD_LABEL}>
              描述（選填）
            </label>
            <textarea
              id="v2-trip-desc"
              aria-label="描述"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={submitting}
              placeholder="記錄這次旅行的目的地、日期等資訊……"
              rows={4}
              className={TEXTAREA}
            />
          </div>
        </div>

        <div className={CARD}>
          <p className={CARD_TITLE}>日期與預算</p>
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
          {fieldErrors.dates && <p role="alert" className={FIELD_ERROR}>{fieldErrors.dates}</p>}
          <div>
            <label htmlFor="v2-trip-budget" className={FIELD_LABEL}>
              旅程預算（選填）
            </label>
            <div className={BUDGET_ROW}>
              <span className="text-[13px] text-v2-ink-muted">{currencySymbol(values.currency)}</span>
              <input
                id="v2-trip-budget"
                aria-label="旅程預算"
                inputMode="decimal"
                value={values.budget}
                onChange={(e) => set("budget", sanitizeDecimal(e.target.value))}
                disabled={submitting}
                placeholder="10000"
                className="w-full bg-transparent text-[13px] outline-none"
              />
            </div>
            {fieldErrors.budget && <p role="alert" className={`${FIELD_ERROR} mt-1.5`}>{fieldErrors.budget}</p>}
          </div>
        </div>

        <div className={CARD}>
          <p className={CARD_TITLE}>結算幣別</p>
          <p className={HELP_TEXT}>所有費用將以此幣別進行結算計算</p>
          <p className={HELP_TEXT}>最小單位：{minorUnitLabel(values.currency)}</p>
          <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} disabled={submitting} ariaLabel="結算幣別" />
        </div>

        <div className={CARD}>
          <p className={CARD_TITLE}>成員加入方式</p>
          <p className={HELP_TEXT}>透過分享連結加入的人，只能建立自己的身份，或取代你建立的佔位成員。</p>
          <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={submitting} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {error && !hasFieldError && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {error}
            </p>
          )}
          <button type="button" onClick={onCreate} disabled={submitting} className={`w-full ${CTA_PRIMARY}`}>
            {submitting ? "建立中…" : "建立旅程"}
          </button>
        </div>
      </div>
    </>
  )
}
