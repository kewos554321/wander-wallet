"use client"

import { useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { roundRateForDisplay } from "@/lib/currency-conversion"
import { sanitizeDecimal } from "@/lib/numeric-input"
import { formatRelativeTime, rateFromRates } from "@/components/v2/currency/format"
import type { RecentRate } from "@/lib/recent-rates"

type Tab = "market" | "custom"

export interface RateSheetProps {
  open: boolean
  onClose: () => void
  /** Expense currency (original). */
  fromCurrency: string
  /** Settlement currency. */
  toCurrency: string
  /** The rate currently bound to this expense. */
  rate: number | null
  /** True when this expense overrides the default rate. */
  customRate: boolean
  /** The app's current live rate (from → to), when known. */
  liveRate: number | null
  liveTimestamp?: number | null
  /** The kind currently bound to this expense (for the opening tab). */
  appliedKind?: "market" | "custom" | null
  /** Rates recently used on this project for fromCurrency, newest first. */
  recentRates: RecentRate[]
  /** Bind a rate to this expense. `kind` is market (feed, optional date) or custom. */
  onUseRate: (rate: number, kind: "market" | "custom", date?: string) => void
  /** Drop the override and fall back to today's rate. */
  onReset: () => void
}

const todayStr = () => format(new Date(), "yyyy-MM-dd")

/** True when two rates agree at display precision (6 significant digits). */
function sameRate(a: number | null | undefined, b: number | null | undefined): boolean {
  return a != null && b != null && Number.isFinite(a) && Number.isFinite(b) && roundRateForDisplay(a) === roundRateForDisplay(b)
}

/** Short `M/D` for a rate date; null on anything unparseable. */
function shortRateDate(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${Number(m[2])}/${Number(m[3])}`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, "M/d")
}

/**
 * Bottom-sheet editor for a single expense's bound rate. Two ways to get a
 * rate: 市場 (today by default; change the date for that day's rate) or 自訂
 * (type a value, or reuse one recently used in this project). Only ever
 * affects this expense.
 */
export function RateSheet({
  open,
  onClose,
  fromCurrency,
  toCurrency,
  rate,
  customRate,
  liveRate,
  liveTimestamp,
  appliedKind,
  recentRates,
  onUseRate,
  onReset,
}: RateSheetProps) {
  const authFetch = useAuthFetch()
  const [tab, setTab] = useState<Tab>("market")
  const [date, setDate] = useState(todayStr())
  const [dateOpen, setDateOpen] = useState(false)
  const [historyRate, setHistoryRate] = useState<number | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState("")
  // Guards against an older date lookup resolving after a newer one.
  const reqIdRef = useRef(0)

  // Re-seed whenever the sheet opens (not on every rate change, so a selection
  // stays highlighted after the parent echoes it back).
  useEffect(() => {
    if (!open) return
    setTab(appliedKind === "custom" ? "custom" : "market")
    setDate(todayStr())
    setHistoryRate(null)
    setHistoryError(null)
    setHistoryLoading(false)
    const seed =
      customRate && rate != null
        ? String(roundRateForDisplay(rate))
        : recentRates[0] != null
          ? String(recentRates[0].rate)
          : ""
    setCustomInput(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const isToday = date === todayStr()
  const marketRate = isToday ? liveRate : historyRate
  const marketUsable = marketRate != null

  const queryHistory = async (nextDate: string) => {
    setDate(nextDate)
    if (nextDate === todayStr()) {
      setHistoryRate(null)
      setHistoryError(null)
      return
    }
    const id = ++reqIdRef.current
    setHistoryLoading(true)
    setHistoryError(null)
    setHistoryRate(null)
    try {
      const res = await authFetch(`/api/exchange-rates?date=${nextDate}`)
      if (id !== reqIdRef.current) return
      if (!res.ok) throw new Error("request failed")
      const data = await res.json()
      const derived = rateFromRates(fromCurrency, toCurrency, data.rates ?? {})
      if (!(derived > 0) || !Number.isFinite(derived)) throw new Error("no rate")
      setHistoryRate(derived)
    } catch {
      if (id !== reqIdRef.current) return
      setHistoryError("查不到該日期的匯率，請換一天試試")
    } finally {
      if (id === reqIdRef.current) setHistoryLoading(false)
    }
  }

  const customValue = Number(customInput)
  const customUsable = customInput.trim() !== "" && Number.isFinite(customValue) && customValue > 0

  // One button style for both panes; the applied rate is marked with 已使用
  // text rather than a different fill, so the button always looks the same.
  const optionButtonClass =
    "shrink-0 rounded-full border border-v2-lake px-4 py-1.5 text-xs font-bold text-v2-lake transition hover:bg-v2-lake-soft"

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
        </div>

        <div role="tablist" aria-label="匯率來源" className="mx-5 flex gap-1 rounded-xl bg-v2-sand p-1">
          {(["market", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-v2-sm py-2 text-[13px] font-bold transition ${
                tab === t ? "bg-v2-surface text-v2-lake shadow-v2-sm" : "text-v2-ink-muted"
              }`}
            >
              {t === "market" ? "市場" : "自訂"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-4">
          {tab === "market" && (
            <section data-testid="rate-pane-market">
              <div className="rounded-v2-md border border-v2-line p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p data-testid="market-rate" className="m-0 font-v2-serif text-[17px] font-bold tabular-nums text-v2-ink">
                      1 {fromCurrency} = {marketRate != null ? roundRateForDisplay(marketRate) : "—"} {toCurrency}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-v2-ink-subtle">
                      {historyLoading
                        ? "讀取中…"
                        : isToday
                          ? liveTimestamp
                            ? `今天 · 更新於 ${formatRelativeTime(liveTimestamp)}`
                            : "今天 · 即時匯率"
                          : `${date} · 歷史匯率`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="使用市場匯率"
                    disabled={!marketUsable}
                    onClick={() => {
                      if (!marketUsable) return
                      if (isToday) onUseRate(marketRate as number, "market")
                      else onUseRate(marketRate as number, "market", date)
                    }}
                    className={optionButtonClass}
                  >
                    {appliedKind === "market" && sameRate(marketRate, rate) ? "已使用" : "使用"}
                  </button>
                </div>
              </div>
              <p className="m-0 mb-2 mt-4 text-xs font-bold text-v2-ink-muted">查哪一天的匯率？</p>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="匯率日期"
                    className="flex w-full items-center gap-2 rounded-v2-sm border border-v2-line bg-v2-paper px-3 py-2.5 text-left text-[13px] text-v2-ink"
                  >
                    <CalendarIcon className="h-[15px] w-[15px] text-v2-ink-muted" aria-hidden="true" />
                    <span className="tabular-nums">{format(parseISO(date), "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" collisionPadding={12} className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseISO(date)}
                    disabled={{ after: new Date() }}
                    onSelect={(d) => {
                      if (!d) return
                      setDateOpen(false)
                      queryHistory(format(d, "yyyy-MM-dd"))
                    }}
                  />
                </PopoverContent>
              </Popover>
              {historyError && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p role="alert" className="m-0 text-xs font-semibold text-v2-danger">
                    {historyError}
                  </p>
                  <button
                    type="button"
                    aria-label="重新查詢"
                    onClick={() => queryHistory(date)}
                    className="shrink-0 rounded-full border border-v2-lake px-3 py-1 text-[11px] font-bold text-v2-lake"
                  >
                    重試
                  </button>
                </div>
              )}
              <p className="m-0 mt-3 text-[11.5px] leading-relaxed text-v2-ink-muted">
                {isToday ? "改下面的日期，就會看那一天的歷史匯率。" : "你改了日期，所以這是歷史匯率。"}
              </p>
            </section>
          )}

          {tab === "custom" && (
            <section data-testid="rate-pane-custom">
              <div className="rounded-v2-md border border-v2-line p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <label className="flex min-w-0 flex-1 items-center gap-2 font-v2-serif text-[17px] font-bold text-v2-ink">
                    <span className="shrink-0">1 {fromCurrency} =</span>
                    <input
                      aria-label="自訂匯率"
                      inputMode="decimal"
                      value={customInput}
                      onChange={(e) => setCustomInput(sanitizeDecimal(e.target.value))}
                      className="min-w-0 flex-1 bg-transparent text-right font-v2-serif text-[17px] font-bold tabular-nums text-v2-ink outline-none"
                    />
                    <span className="shrink-0">{toCurrency}</span>
                  </label>
                  <button
                    type="button"
                    aria-label="使用自訂匯率"
                    disabled={!customUsable}
                    onClick={() => customUsable && onUseRate(customValue, "custom")}
                    className={optionButtonClass}
                  >
                    {appliedKind === "custom" ? "已使用" : "使用"}
                  </button>
                </div>
              </div>

              {recentRates.length > 0 && (
                <>
                  <p className="m-0 mb-2 mt-4 text-xs font-bold text-v2-ink-muted">最近用過</p>
                  <div
                    data-testid="recent-rates-list"
                    className="flex max-h-40 flex-col gap-2 overflow-y-auto overscroll-contain"
                  >
                    {recentRates.map((r, i) => {
                      const when = r.date ? shortRateDate(r.date) : null
                      const applied = appliedKind === "custom" && sameRate(r.rate, rate)
                      return (
                        <button
                          key={`${r.rate}-${i}`}
                          type="button"
                          data-testid={`recent-rate-${i}`}
                          onClick={() => {
                            setCustomInput(String(r.rate))
                            onUseRate(r.rate, "custom")
                          }}
                          className={`flex items-center justify-between gap-3 rounded-v2-md border px-3.5 py-2.5 text-left transition ${
                            applied ? "border-v2-lake-border bg-v2-lake-soft" : "border-v2-line hover:bg-v2-paper"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 rounded px-1 py-[1px] text-[10px] font-bold ${
                                r.kind === "market" ? "bg-v2-gold-soft text-v2-gold" : "bg-v2-coral-soft text-v2-coral-strong"
                              }`}
                            >
                              {r.kind === "market" ? "市場" : "自訂"}
                            </span>
                            <span className="shrink-0 font-v2-serif text-[15px] font-bold tabular-nums text-v2-ink">
                              {r.rate}
                            </span>
                            {(when || r.description) && (
                              <span className="min-w-0 truncate text-[11px] text-v2-ink-muted">
                                {when}
                                {when && r.description ? " · " : ""}
                                {r.description ?? ""}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[11px] font-bold text-v2-lake">
                            {applied ? "已使用" : "使用"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-v2-line-soft px-5 py-3.5">
          <button
            type="button"
            aria-label="還原"
            disabled={!customRate}
            onClick={onReset}
            className="flex-1 rounded-v2-md border border-v2-line py-3 text-sm font-bold text-v2-ink disabled:opacity-40"
          >
            還原
          </button>
          <button
            type="button"
            aria-label="完成"
            onClick={onClose}
            className="flex-[1.4] rounded-v2-md bg-v2-lake py-3 text-sm font-bold text-v2-on-lake"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
