import { AlertTriangle, Sparkles, type LucideIcon } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { parseCover } from "@/lib/covers"
import type { ProjectSummary } from "@/lib/project-overview"
import { COVER_ICON_COMPONENTS } from "@/components/v2/cover/cover-icons"

interface TripSummaryCardProps {
  summary: ProjectSummary
  currency: string
  cover?: string | null
  ratesLoading?: boolean
  ratesReady?: boolean
  usingFallback?: boolean
  ratesTimestamp?: number | null
  onRetryRates?: () => void
}

function formatRateDate(timestamp: number | null | undefined) {
  if (!timestamp) return null
  return new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(new Date(timestamp))
}

export function TripSummaryCard({
  summary,
  currency,
  cover,
  ratesLoading = false,
  ratesReady = true,
  usingFallback = false,
  ratesTimestamp = null,
  onRetryRates,
}: TripSummaryCardProps) {
  const { totalAmount, perPerson, budget, budgetProgress, budgetRemaining, hasMixedCurrencies } = summary
  const fmt = (n: number) => formatCurrency(Math.round(n), currency)

  // A mixed-currency trip is converted with live rates. Until those exist the
  // only honest thing to show is a placeholder: `convert` falls back to 1:1.
  const needsRates = hasMixedCurrencies
  const amountsReady = !needsRates || ratesReady
  const rateDate = formatRateDate(ratesTimestamp)

  const overBudget = budgetProgress > 100
  const withinBudgetWidth = Math.min(budgetProgress, 100)
  const overBudgetWidth = Math.min(Math.max(budgetProgress - 100, 0), 100)

  const parsed = parseCover(cover ?? null)
  const coverIcon = parsed.type === "icon" && parsed.iconId && COVER_ICON_COMPONENTS[parsed.iconId] ? parsed.iconId : null
  const Decoration: LucideIcon = coverIcon ? COVER_ICON_COMPONENTS[coverIcon] : Sparkles

  return (
    <div
      data-testid="v2-trip-summary-card"
      data-tour="trip-summary"
      className="relative mx-4 mt-3 overflow-hidden rounded-v2-lg bg-v2-lake text-v2-paper"
    >
      <Decoration
        data-testid="trip-summary-decoration"
        data-cover={coverIcon ?? "sparkles"}
        className="absolute -right-6 -top-6 h-[120px] w-[120px] opacity-[.08]"
        strokeWidth={1.2}
        aria-hidden="true"
      />
      <div className="relative px-5 py-4">
        <p className="mb-[3px] text-sm font-medium leading-5 tracking-[.1px] opacity-[.78]">旅程總覽</p>

        {amountsReady ? (
          <p className="m-0 font-v2-serif text-[32px] font-bold leading-10 tabular-nums">{fmt(totalAmount)}</p>
        ) : (
          <div
            role="status"
            aria-label={ratesLoading ? "正在換算外幣總額" : "匯率尚未載入，總額暫不顯示"}
            className="mt-1 h-8 w-48 animate-pulse rounded-v2-sm bg-v2-paper/20 motion-reduce:animate-none"
          />
        )}

        {amountsReady ? (
          <p className="mt-[3px] text-xs leading-4 tracking-[.4px] opacity-[.85]">平均每人 {fmt(perPerson)}</p>
        ) : (
          <p className="mt-[3px] text-xs leading-4 tracking-[.4px] opacity-[.85]">
            {ratesLoading ? "正在換算外幣…" : "匯率載入失敗，總額暫不顯示"}
            {!ratesLoading && onRetryRates && (
              <button
                type="button"
                onClick={onRetryRates}
                className="ml-1.5 rounded font-semibold underline underline-offset-2 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-paper motion-reduce:transition-none"
              >
                重試
              </button>
            )}
          </p>
        )}

        {needsRates && amountsReady && (
          <p
            data-testid="v2-rate-caption"
            className={`mt-1 flex items-center gap-1 text-[11px] leading-4 tracking-[.3px] ${
              usingFallback ? "font-semibold text-v2-coral-tint" : "opacity-70"
            }`}
          >
            {usingFallback && <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2.2} aria-hidden="true" />}
            {usingFallback
              ? `使用備援匯率${rateDate ? ` · ${rateDate} 更新` : ""}`
              : `含外幣 · 依${rateDate ? ` ${rateDate} ` : "即時"}匯率換算`}
          </p>
        )}

        {amountsReady && budget !== null && budgetRemaining !== null && (
          <>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[rgba(250,247,242,.22)]">
                <div
                  className="h-full rounded-full bg-v2-paper transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${withinBudgetWidth}%` }}
                />
                {overBudget && (
                  <div
                    data-testid="v2-budget-overflow"
                    className="absolute inset-y-0 right-0 rounded-full bg-v2-coral transition-[width] duration-300 ease-out motion-reduce:transition-none"
                    style={{ width: `${overBudgetWidth}%` }}
                  />
                )}
              </div>
              <span
                className={`shrink-0 text-xs font-medium leading-4 tracking-[.5px] ${
                  overBudget ? "text-v2-coral-tint" : ""
                }`}
              >
                {Math.round(budgetProgress)}%
              </span>
            </div>
            <p
              className={`mt-1 text-xs leading-4 tracking-[.4px] ${
                overBudget ? "font-semibold text-v2-coral-tint" : "opacity-75"
              }`}
            >
              {fmt(totalAmount)} ／ {fmt(budget)}（{budgetRemaining >= 0 ? `剩餘 ${fmt(budgetRemaining)}` : `超出 ${fmt(-budgetRemaining)}`}）
            </p>
          </>
        )}
      </div>
    </div>
  )
}
