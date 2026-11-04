import { Trash2 } from "lucide-react"
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import {
  BUDGET_ROW,
  CARD,
  CARD_TITLE,
  CTA_PRIMARY,
  CTA_SECONDARY,
  ERROR_RING,
  FIELD_ERROR,
  FIELD_LABEL,
  HELP_TEXT,
  NAME_INPUT,
  NAME_PLACEHOLDER,
  TEXTAREA,
} from "@/components/v2/project/trip-form-styles"
import { V2CurrencyField, currencySymbol } from "@/components/v2/ui/currency-field"
import { minorUnitLabel } from "@/lib/constants/currencies"
import { sanitizeDecimal } from "@/lib/numeric-input"
import { validateProjectFormErrors, type ProjectFormValues } from "@/lib/hooks/use-project-form"

export interface ProjectSettingsV2ViewProps {
  values: ProjectFormValues
  set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void
  isCreator: boolean
  saving: boolean
  submitError: string | null
  onCancel: () => void
  onSave: () => void
  onRequestDelete: () => void
}

/**
 * Presentational edit-trip form. Shares its card order and field styles with the
 * create view (`NewProjectV2View`): 基本資訊 / 日期與預算 / 結算幣別 / 成員加入方式,
 * plus a danger zone that only the creator sees.
 */
export function ProjectSettingsV2View(props: ProjectSettingsV2ViewProps) {
  const { values, set } = props
  // `submitError` is only set after a save attempt, so fields are only marked red then.
  const fieldErrors = props.submitError ? validateProjectFormErrors(values) : {}
  const hasFieldError = Object.keys(fieldErrors).length > 0

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-32 pt-4">
      <div className={CARD}>
        <p className={CARD_TITLE}>基本資訊</p>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
          <p className={FIELD_LABEL}>封面</p>
          <label htmlFor="v2-project-name" className={FIELD_LABEL}>
            旅程名稱 <span className="text-v2-danger" aria-hidden="true">*</span>
            <span className="sr-only">必填</span>
          </label>
          <CoverTileButton cover={values.cover} onChange={(cover) => set("cover", cover)} disabled={props.saving} />
          <input
            id="v2-project-name"
            aria-label="旅程名稱"
            aria-required="true"
            aria-invalid={fieldErrors.name ? true : undefined}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={props.saving}
            placeholder={NAME_PLACEHOLDER}
            className={`${NAME_INPUT} ${fieldErrors.name ? ERROR_RING : ""}`}
          />
        </div>
        {fieldErrors.name && <p role="alert" className={FIELD_ERROR}>{fieldErrors.name}</p>}
        <div>
          <label htmlFor="v2-project-desc" className={FIELD_LABEL}>
            描述（選填）
          </label>
          <textarea
            id="v2-project-desc"
            aria-label="描述"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={props.saving}
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
          disabled={props.saving}
        />
        {fieldErrors.dates && <p role="alert" className={FIELD_ERROR}>{fieldErrors.dates}</p>}
        <div>
          <label htmlFor="v2-project-budget" className={FIELD_LABEL}>
            旅程預算（選填）
          </label>
          <div className={BUDGET_ROW}>
            <span className="text-[13px] text-v2-ink-muted">{currencySymbol(values.currency)}</span>
            <input
              id="v2-project-budget"
              aria-label="旅程預算"
              inputMode="decimal"
              value={values.budget}
              onChange={(e) => set("budget", sanitizeDecimal(e.target.value))}
              disabled={props.saving}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          {fieldErrors.budget && <p role="alert" className={`${FIELD_ERROR} mt-1.5`}>{fieldErrors.budget}</p>}
        </div>
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>結算幣別</p>
        <p className={HELP_TEXT}>所有費用將以此幣別進行結算計算</p>
        <p data-testid="settlement-minor-unit" className={HELP_TEXT}>
          最小單位：{minorUnitLabel(values.currency)}
        </p>
        <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} disabled={props.saving} ariaLabel="結算幣別" />
      </div>

      <div className={CARD}>
        <p className={CARD_TITLE}>成員加入方式</p>
        <p className={HELP_TEXT}>透過分享連結加入的人，只能建立自己的身份，或取代你建立的佔位成員。</p>
        <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={props.saving} />
      </div>

      {props.isCreator && (
        <div className="rounded-v2-lg border border-v2-danger-border bg-v2-danger-tint p-4">
          <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
          <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除旅程後，所有成員、支出紀錄都會永久移除，此操作無法復原。</p>
          <button
            type="button"
            onClick={props.onRequestDelete}
            disabled={props.saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            刪除旅程
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {props.submitError && !hasFieldError && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {props.submitError}
            </p>
          )}
          <div className="flex gap-2.5">
            <button type="button" onClick={props.onCancel} disabled={props.saving} className={`flex-1 ${CTA_SECONDARY}`}>
              取消
            </button>
            <button type="button" onClick={props.onSave} disabled={props.saving} className={`flex-1 ${CTA_PRIMARY}`}>
              {props.saving ? "儲存中…" : "儲存變更"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
