"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { X } from "lucide-react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { formatCurrency } from "@/lib/constants/currencies"
import { roundRateForDisplay } from "@/lib/currency-conversion"
import { rateFromRates, formatRelativeTime } from "@/components/v2/currency/format"

type Tab = "live" | "history" | "custom"
type AppliedKind = "default" | "live" | "history" | "custom"

export interface RateSheetProps {
  open: boolean
  onClose: () => void
  /** Expense currency (original). */
  fromCurrency: string
  /** Settlement currency. */
  toCurrency: string
  /** Expense amount in the original currency (for the ≈ preview). */
  amount: number
  /** The rate currently bound to this expense. */
  rate: number | null
  /** True when this expense overrides the project default rate. */
  customRate: boolean
  /** The project's fixed rate for `fromCurrency`, when one is configured. */
  projectFixedRate: number | null
  /** The app's current live rate (from → to), when known. */
  liveRate: number | null
  liveTimestamp?: number | null
  /** Default date for the historical lookup. */
  expenseDate: Date
  /** Bind a concrete rate to this expense. */
  onUseRate: (rate: number) => void
  /** Drop the override and fall back to the project default. */
  onReset: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "即時" },
  { id: "history", label: "歷史" },
  { id: "custom", label: "自訂" },
]

/**
 * Bottom-sheet editor for a single expense's bound rate. Three ways to get a
 * rate — live, a past date (Frankfurter history), or a manual value — plus a
 * reset back to the project default. Only ever affects this expense.
 */
export function RateSheet({
  open,
  onClose,
  fromCurrency,
  toCurrency,
  amount,
  rate,
  customRate,
  projectFixedRate,
  liveRate,
  liveTimestamp,
  expenseDate,
  onUseRate,
  onReset,
}: RateSheetProps) {
  const authFetch = useAuthFetch()
  const [tab, setTab] = useState<Tab>("live")
  const [applied, setApplied] = useState<AppliedKind>("default")
  const [historyDate, setHistoryDate] = useState("")
  const [historyRate, setHistoryRate] = useState<number | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState("")

  // Re-seed whenever the sheet opens (not on every rate change, so a selection
  // stays highlighted after the parent echoes it back).
  useEffect(() => {
    if (!open) return
    setTab("live")
    setApplied(customRate ? "custom" : "default")
    setHistoryDate(format(expenseDate, "yyyy-MM-dd"))
    setHistoryRate(null)
    setHistoryError(null)
    setHistoryLoading(false)
    setCustomInput(rate != null ? String(roundRateForDisplay(rate)) : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const defaultLabel = projectFixedRate != null ? "專案固定匯率" : "即時匯率"
  const chipLabel =
    applied === "default"
      ? defaultLabel
      : applied === "live"
        ? "即時匯率"
        : applied === "history"
          ? "歷史匯率"
          : "自訂匯率"
  const chipTone =
    applied === "default" && projectFixedRate != null
      ? "bg-v2-lake-soft text-v2-lake"
      : applied === "live"
        ? "bg-v2-gold-soft text-v2-gold"
        : applied === "history"
          ? "bg-v2-sky-soft text-v2-sky"
          : "bg-v2-coral-soft text-v2-coral-strong"
  const approx = rate != null ? amount * rate : null

  const apply = (value: number, kind: AppliedKind) => {
    if (!(value > 0) || !Number.isFinite(value)) return
    setApplied(kind)
    onUseRate(value)
  }

  const queryHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    setHistoryRate(null)
    try {
      const res = await authFetch(`/api/exchange-rates?date=${historyDate}`)
      if (!res.ok) throw new Error("request failed")
      const data = await res.json()
      const derived = rateFromRates(fromCurrency, toCurrency, data.rates ?? {})
      if (!(derived > 0) || !Number.isFinite(derived)) throw new Error("no rate")
      setHistoryRate(derived)
    } catch {
      setHistoryError("查不到該日期的匯率，請換一天試試")
    } finally {
      setHistoryLoading(false)
    }
  }

  const customValue = Number(customInput)
  const customUsable = customInput.trim() !== "" && Number.isFinite(customValue) && customValue > 0

  const useButtonClass = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition ${
      active
        ? "border-transparent bg-v2-lake-soft text-v2-lake"
        : "border-v2-lake text-v2-lake hover:bg-v2-lake-soft"
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="匯率"
    >
      <div className="flex max-h-[92%] w-full max-w-md flex-col rounded-t-2xl bg-v2-surface sm:rounded-2xl">
        <div className="px-5 pb-3.5 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-bold text-v2-ink">匯率</h2>
            <button
              type="button"
              aria-label="關閉匯率"
              onClick={onClose}
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-v2-ink-subtle"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          <p data-testid="rate-sheet-pair" className="m-0 mt-2 font-v2-serif text-xl font-bold tabular-nums text-v2-ink">
            1 {fromCurrency} = {rate != null ? roundRateForDisplay(rate) : "—"} {toCurrency}
          </p>
          <p data-testid="rate-sheet-approx" className="m-0 mt-0.5 text-xs tabular-nums text-v2-ink-muted">
            {approx != null ? `≈ ${formatCurrency(approx, toCurrency)}` : "≈ —"}
          </p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${chipTone}`}>
            {chipLabel}
          </span>
        </div>

        <div role="tablist" aria-label="匯率來源" className="mx-5 flex gap-1 rounded-xl bg-v2-sand p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${
                tab === t.id ? "bg-v2-surface text-v2-lake shadow-[0_1px_3px_rgba(27,24,21,.1)]" : "text-v2-ink-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-4">
          {tab === "live" && (
            <section data-testid="rate-pane-live">
              <p className="m-0 mb-2 text-xs font-bold text-v2-ink-muted">現在匯率</p>
              <div className="rounded-[14px] border border-v2-line p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="m-0 font-v2-serif text-[17px] font-bold tabular-nums text-v2-ink">
                      1 {fromCurrency} = {liveRate != null ? roundRateForDisplay(liveRate) : "—"} {toCurrency}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-v2-ink-subtle">
                      {liveTimestamp ? `更新於 ${formatRelativeTime(liveTimestamp)}` : "讀取中…"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="使用即時匯率"
                    disabled={liveRate == null || applied === "live"}
                    onClick={() => liveRate != null && apply(liveRate, "live")}
                    className={useButtonClass(applied === "live")}
                  >
                    {applied === "live" ? "已使用" : "使用"}
                  </button>
                </div>
              </div>
              <p
                data-testid="rate-sheet-project"
                className={`m-0 mt-3 rounded-xl border p-3 text-[11.5px] leading-relaxed ${
                  projectFixedRate != null
                    ? "border-v2-lake-border bg-v2-lake-soft text-v2-lake"
                    : "border-v2-gold-soft bg-v2-gold-soft text-v2-gold"
                }`}
              >
                {projectFixedRate != null
                  ? `專案固定匯率 ${roundRateForDisplay(projectFixedRate)} 是新支出的預設；用即時匯率會把這一筆綁在當下值。`
                  : "尚未設定專案固定匯率，預設使用即時匯率。"}
              </p>
            </section>
          )}

          {tab === "history" && (
            <section data-testid="rate-pane-history">
              <p className="m-0 mb-2 text-xs font-bold text-v2-ink-muted">查過去某天的匯率</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  aria-label="歷史日期"
                  max={format(new Date(), "yyyy-MM-dd")}
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="min-w-0 flex-1 rounded-[11px] border border-v2-line bg-v2-paper px-3 py-2.5 text-[13px] text-v2-ink"
                />
                <button
                  type="button"
                  onClick={queryHistory}
                  disabled={historyLoading}
                  className="shrink-0 rounded-[11px] bg-v2-lake px-4 text-[13px] font-bold text-v2-on-lake disabled:opacity-50"
                >
                  {historyLoading ? "查詢中…" : "查詢"}
                </button>
              </div>
              {historyError && (
                <p role="alert" className="m-0 mt-3 text-xs font-semibold text-v2-danger">
                  {historyError}
                </p>
              )}
              {historyRate != null && (
                <div className="mt-3 rounded-[14px] border border-v2-line p-3.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <p className="m-0 font-v2-serif text-[17px] font-bold tabular-nums text-v2-ink">
                        1 {fromCurrency} = {roundRateForDisplay(historyRate)} {toCurrency}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-v2-ink-subtle">{historyDate}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="使用歷史匯率"
                      disabled={applied === "history"}
                      onClick={() => apply(historyRate, "history")}
                      className={useButtonClass(applied === "history")}
                    >
                      {applied === "history" ? "已使用" : "使用"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "custom" && (
            <section data-testid="rate-pane-custom">
              <p className="m-0 mb-2 text-xs font-bold text-v2-ink-muted">自訂匯率</p>
              <div className="rounded-[14px] border border-v2-line p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 text-[13px] text-v2-ink-muted">1 {fromCurrency} =</span>
                    <input
                      aria-label="自訂匯率"
                      inputMode="decimal"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-right font-v2-serif text-base font-bold tabular-nums text-v2-ink outline-none"
                    />
                    <span className="shrink-0 text-[13px] text-v2-ink-muted">{toCurrency}</span>
                  </label>
                  <button
                    type="button"
                    aria-label="使用自訂匯率"
                    disabled={!customUsable || applied === "custom"}
                    onClick={() => customUsable && apply(customValue, "custom")}
                    className={useButtonClass(applied === "custom")}
                  >
                    {applied === "custom" ? "已使用" : "使用"}
                  </button>
                </div>
              </div>
              <p className="m-0 mt-3 text-[11.5px] leading-relaxed text-v2-ink-muted">
                自訂只影響這一筆，不會改動專案設定。按「還原預設」即回到預設匯率。
              </p>
            </section>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-v2-line-soft px-5 py-3.5">
          <button
            type="button"
            aria-label="還原預設"
            disabled={!customRate}
            onClick={onReset}
            className="flex-1 rounded-[13px] border border-v2-line py-3 text-sm font-bold text-v2-ink disabled:opacity-40"
          >
            還原預設
          </button>
          <button
            type="button"
            aria-label="完成"
            onClick={onClose}
            className="flex-[1.4] rounded-[13px] bg-v2-lake py-3 text-sm font-bold text-v2-on-lake"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
