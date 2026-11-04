"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/constants/currencies"

// Demo only: the shipped amount filter compares raw expense.amount values,
// which mixes JPY/USD numbers with a TWD range. The after side converts first.
// Same ten expenses, same range, same list on both sides.

type View = "before" | "after"

const RATES: Record<string, number> = { JPY: 0.215, USD: 31.5 }

const EXPENSES = [
  { id: "ramen", name: "晚餐 · 拉麵", amount: 1280, currency: "JPY" },
  { id: "hotel", name: "飯店 2 晚", amount: 8600, currency: "TWD" },
  { id: "cosmetics", name: "藥妝採買", amount: 3200, currency: "JPY" },
  { id: "taxi", name: "計程車", amount: 2600, currency: "JPY" },
  { id: "yakiniku", name: "和牛燒肉", amount: 5400, currency: "TWD" },
  { id: "coffee", name: "咖啡", amount: 8.5, currency: "USD" },
  { id: "gift", name: "伴手禮", amount: 4800, currency: "JPY" },
  { id: "museum", name: "博物館門票", amount: 1600, currency: "JPY" },
  { id: "konbini", name: "便利商店", amount: 950, currency: "JPY" },
  { id: "onsen", name: "溫泉旅館", amount: 1850, currency: "TWD" },
]

const toTwd = (expense: (typeof EXPENSES)[number]) =>
  expense.currency === "TWD" ? expense.amount : expense.amount * (RATES[expense.currency] ?? 1)

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div role="group" aria-label="切換版本">
      <div className="grid grid-cols-2 gap-1 rounded-v2-md border border-v2-line bg-v2-surface p-1">
        {(
          [
            { value: "before", label: "改前" },
            { value: "after", label: "改後（已套用）" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-[44px] rounded-v2-sm text-[13px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none ${
              view === option.value ? "bg-v2-lake text-v2-on-lake" : "text-v2-ink-muted hover:bg-v2-sand"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AmountFilterDemoPage() {
  const [view, setView] = useState<View>("after")
  const [min, setMin] = useState(1000)
  const [max, setMax] = useState(2000)
  const before = view === "before"

  const rows = EXPENSES.map((expense) => {
    const converted = toTwd(expense)
    const rawMatch = expense.amount >= min && expense.amount <= max
    const convertedMatch = converted >= min && converted <= max
    const matches = before ? rawMatch : convertedMatch
    return {
      ...expense,
      converted,
      matches,
      wronglyIncluded: before && rawMatch && !convertedMatch,
      missed: before && !rawMatch && convertedMatch,
    }
  })
  const count = rows.filter((row) => row.matches).length
  const wrongCount = rows.filter((row) => row.wronglyIncluded).length
  const missedCount = rows.filter((row) => row.missed).length

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="px-4 pt-6">
        <h1 className="m-0 font-v2-serif text-[22px] font-bold leading-7 text-v2-ink">
          跨幣別金額篩選 · 改前／改後
        </h1>
        <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-v2-ink-muted">
          同一趟 TWD 旅程，含 JPY 與 USD 支出。區間以旅程幣別 TWD 為準，切換看目前與提案的差別。
        </p>
      </div>

      <div className="mt-4 px-4">
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="mt-4 border-y border-v2-line bg-v2-paper py-4">
        <div className="px-4 pb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              before ? "bg-v2-sand text-v2-ink" : "bg-v2-lake-soft text-v2-lake"
            }`}
          >
            {before ? "目前：原幣數字直接比" : "已套用：先換算成 TWD 再比"}
          </span>
        </div>

        <div className="mx-4 rounded-v2-lg border border-v2-line bg-v2-surface p-4">
          <p className="m-0 text-[12px] font-bold leading-4 text-v2-ink">金額區間（TWD）</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-v2-ink-muted">最低</span>
              <input
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-v2-sm border border-v2-line bg-v2-surface px-3 text-[16px] tabular-nums text-v2-ink outline-none focus-visible:border-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-v2-ink-muted">最高</span>
              <input
                type="number"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-v2-sm border border-v2-line bg-v2-surface px-3 text-[16px] tabular-nums text-v2-ink outline-none focus-visible:border-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake"
              />
            </label>
          </div>
          <p className="m-0 mt-3 text-[12px] font-bold text-v2-ink">
            符合 {count} 筆
            <span className={`ml-2 text-[11px] font-medium ${before && (wrongCount > 0 || missedCount > 0) ? "text-v2-danger" : "text-v2-ink-muted"}`}>
              {before
                ? `其中 ${wrongCount} 筆其實不在區間，另有 ${missedCount} 筆被漏掉`
                : "全部先換算成 TWD 再比較"}
            </span>
          </p>
        </div>

        <ul className="m-0 mt-3 list-none space-y-2 px-4 p-0">
          {rows.map((row) => {
            const wrong = row.wronglyIncluded
            const missed = row.missed
            return (
              <li
                key={row.id}
                className={`flex items-start gap-3 rounded-v2-sm border px-3 py-2.5 ${
                  wrong
                    ? "border-v2-danger-border bg-v2-danger-wash"
                    : missed
                      ? "border-dashed border-v2-danger-border bg-v2-surface"
                      : row.matches
                        ? "border-v2-lake-edge bg-v2-lake-soft"
                        : "border-v2-line bg-v2-surface"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[13px] font-semibold leading-5 text-v2-ink">{row.name}</p>
                  <p className="m-0 mt-0.5 text-[11px] leading-4 text-v2-ink-muted">
                    {formatCurrency(row.amount, row.currency)}
                    {row.currency !== "TWD" && <> · ≈ {formatCurrency(row.converted, "TWD")}</>}
                  </p>
                  {wrong && (
                    <p className="m-0 mt-1 text-[10px] font-semibold leading-4 text-v2-danger">
                      原幣在區間，但換算後是 {formatCurrency(row.converted, "TWD")}，不在區間
                    </p>
                  )}
                  {missed && (
                    <p className="m-0 mt-1 text-[10px] font-semibold leading-4 text-v2-danger">
                      原幣不在區間，但換算後是 {formatCurrency(row.converted, "TWD")}，應該符合
                    </p>
                  )}
                </div>
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    wrong || missed
                      ? "bg-v2-danger-soft text-v2-danger-strong"
                      : row.matches
                        ? "bg-v2-lake text-v2-on-lake"
                        : "bg-v2-sand text-v2-ink-muted"
                  }`}
                >
                  {wrong ? "誤抓" : missed ? "漏掉" : row.matches ? "符合" : "不符合"}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <section className="mt-7 px-4">
        <h2 className="m-0 font-v2-serif text-lg font-bold leading-6 text-v2-ink">差別在哪</h2>
        <dl className="m-0 mt-2 divide-y divide-v2-line border-y border-v2-line">
          <div className="grid grid-cols-[56px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-ink-muted">改前</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              直接把 `expense.amount` 跟 TWD 區間比。
              <span className="mt-0.5 block text-v2-ink-muted">JPY 1,280 會被當成 TWD 1,280；JPY 4,800 也會被當成 TWD 4,800。</span>
            </dd>
          </div>
          <div className="grid grid-cols-[56px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-lake">改後</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              先用旅程幣別換算，再比較區間。
              <span className="mt-0.5 block text-v2-ink-muted">JPY 4,800 → TWD 1,032，會正確落在 1,000–2,000。</span>
            </dd>
          </div>
          <div className="grid grid-cols-[56px_1fr] gap-3 py-3">
            <dt className="m-0 text-[12px] font-bold leading-5 text-v2-ink-muted">正式位置</dt>
            <dd className="m-0 text-[13px] leading-5 text-v2-ink">
              `useExpenseFilters.ts:203-207`
              <span className="mt-0.5 block text-v2-ink-muted">目前只比原始 amount；提案是先 convert，再做 range。</span>
            </dd>
          </div>
        </dl>
        <p className="m-0 mt-4 text-[11px] leading-5 text-v2-ink-muted">
          可以改上面的區間看結果變化；這裡的匯率固定為 JPY 0.215、USD 31.5，方便對照。
        </p>
      </section>
    </div>
  )
}
