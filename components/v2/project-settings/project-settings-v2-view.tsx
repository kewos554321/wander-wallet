import { Trash2 } from "lucide-react"
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { V2CurrencyField, moneySymbol } from "@/components/v2/ui/currency-field"
import type { ProjectFormValues } from "@/lib/hooks/use-project-form"
import { ExchangeRateRow } from "./exchange-rate-row"

const cardClass = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
const cardTitleClass = "m-0 text-[13px] font-bold text-v2-lake"
const fieldLabelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"

export interface ProjectSettingsV2ViewProps {
  values: ProjectFormValues
  set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void
  expenseCurrencies: string[]
  rates: Record<string, number>
  isCreator: boolean
  saving: boolean
  submitError: string | null
  onCancel: () => void
  onSave: () => void
  onRequestDelete: () => void
}

function liveRate(rates: Record<string, number>, from: string, to: string, precision: number): number | null {
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!fromRate || !toRate) return null
  return Number((toRate / fromRate).toFixed(precision))
}

export function ProjectSettingsV2View(props: ProjectSettingsV2ViewProps) {
  const { values, set } = props
  const descriptionCount = values.description.length

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-32 pt-4">
      <div className={cardClass}>
        <p className={cardTitleClass}>基本資訊</p>
        <div>
          <label htmlFor="v2-project-name" className={fieldLabelClass}>
            專案名稱
          </label>
          <input
            id="v2-project-name"
            aria-label="專案名稱"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={props.saving}
            className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] font-semibold outline-none"
          />
        </div>
        <div>
          <p className={fieldLabelClass}>封面圖示與顏色</p>
          <div className="flex items-center gap-2.5">
            <CoverTileButton cover={values.cover} onChange={(cover) => set("cover", cover)} disabled={props.saving} />
            <span className="text-xs text-v2-ink-muted">點擊更換圖示與底色</span>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="v2-project-desc" className="block text-xs font-semibold text-v2-ink-muted">
              描述（選填）
            </label>
            <span className={`text-xs ${descriptionCount > 60 ? "text-v2-danger" : "text-v2-ink-subtle"}`}>{descriptionCount}/60</span>
          </div>
          <textarea
            id="v2-project-desc"
            aria-label="描述"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={props.saving}
            rows={4}
            className="min-h-16 w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none"
          />
        </div>
      </div>

      <div className={cardClass}>
        <p className={cardTitleClass}>日期與預算</p>
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
        <div>
          <label htmlFor="v2-project-budget" className={fieldLabelClass}>
            旅程預算（選填）
          </label>
          <div className="flex items-center gap-1.5 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3">
            <span className="text-[13px] text-v2-ink-muted">{moneySymbol(values.currency)}</span>
            <input
              id="v2-project-budget"
              aria-label="旅程預算"
              inputMode="decimal"
              value={values.budget}
              onChange={(e) => set("budget", e.target.value)}
              disabled={props.saving}
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-v2-ink-subtle">設定預算後，可在旅程總覽查看花費進度</p>
        </div>
      </div>

      <div className={cardClass}>
        <p className={cardTitleClass}>幣別與匯率</p>
        <div>
          <label className={fieldLabelClass}>結算幣別</label>
          <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} disabled={props.saving} />
          <p className="mt-1.5 text-xs text-v2-ink-subtle">所有費用將以此幣別進行結算計算</p>
        </div>

        {props.expenseCurrencies.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-v2-ink-muted">自訂匯率（選填）</label>
            <p className="mb-2 text-xs text-v2-ink-subtle">不設定則使用即時匯率</p>
            <div className="flex flex-col gap-3">
              {props.expenseCurrencies.map((curr) => (
                <ExchangeRateRow
                  key={curr}
                  currency={curr}
                  settlementCurrency={values.currency}
                  value={values.customRates[curr] ?? ""}
                  liveRate={liveRate(props.rates, curr, values.currency, values.exchangeRatePrecision)}
                  onChange={(rate) => set("customRates", { ...values.customRates, [curr]: rate })}
                  disabled={props.saving}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="v2-rate-precision" className={fieldLabelClass}>
            匯率計算精度
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="v2-rate-precision"
              aria-label="匯率計算精度"
              type="number"
              min={0}
              max={8}
              step={1}
              value={values.exchangeRatePrecision}
              onChange={(e) => set("exchangeRatePrecision", Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
              disabled={props.saving}
              className="w-14 rounded-xl border border-v2-line bg-v2-paper px-3 py-2.5 text-center text-[13px] font-semibold outline-none"
            />
            <span className="text-xs text-v2-ink-muted">位小數，影響匯率顯示與結算四捨五入</span>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div>
          <p className={cardTitleClass}>成員加入方式</p>
          <p className="mt-1 text-xs text-v2-ink-subtle">設定新成員透過分享連結加入時的方式</p>
        </div>
        <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={props.saving} />
      </div>

      {props.isCreator && (
        <div className="rounded-[18px] border border-v2-danger-border bg-v2-danger-tint p-4">
          <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
          <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。</p>
          <button
            type="button"
            onClick={props.onRequestDelete}
            disabled={props.saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            刪除專案
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {props.submitError && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {props.submitError}
            </p>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={props.onCancel}
              disabled={props.saving}
              className="flex-1 rounded-[14px] border border-v2-line bg-v2-surface py-3.5 text-sm font-bold disabled:opacity-40"
            >
              取消
            </button>
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.saving}
              className="flex-1 rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake disabled:opacity-40"
            >
              {props.saving ? "儲存中…" : "儲存變更"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
