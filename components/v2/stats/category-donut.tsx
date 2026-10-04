import { getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import type { CategoryStat } from "@/lib/project-stats"

// Colors follow the design's legend order; extra categories cycle.
const COLORS = ["var(--v2-coral)", "var(--v2-plum)", "var(--v2-lake-mid)", "var(--v2-gold)", "var(--v2-rose)", "var(--v2-lake)", "var(--v2-coral-strong)", "var(--v2-ink-muted)"]
const R = 42
const CIRCUMFERENCE = 2 * Math.PI * R

export function CategoryDonut({ categories, currency }: { categories: CategoryStat[]; currency: string }) {
  if (categories.length === 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  // Prefix-sum offsets computed without mutating a render-scoped variable
  // (the react-hooks/immutability lint rule forbids reassignment during render).
  const lengths = categories.map((c) => (c.percent / 100) * CIRCUMFERENCE)
  const arcs = categories.map((c, i) => ({
    color: COLORS[i % COLORS.length],
    length: lengths[i],
    offset: lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
  }))

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" width="108" height="108" className="shrink-0" aria-hidden="true">
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="15" style={{ stroke: "var(--v2-line-soft)" }} />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              style={{ stroke: a.color }}
              strokeWidth="15"
              strokeDasharray={`${a.length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </g>
      </svg>
      <ul aria-label="類別佔比" className="m-0 flex flex-1 list-none flex-col gap-[9px] p-0">
        {categories.map((c, i) => (
          <li key={c.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
            <span className="flex flex-1 items-baseline gap-1 text-xs font-semibold">
              <span>{getCategoryLabel(c.category)}</span>
              <span className="font-medium text-v2-ink-subtle">{Math.round(c.percent)}%</span>
            </span>
            <span className="text-xs font-semibold text-v2-ink-muted">{formatCurrency(Math.round(c.amount), currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
