import { Calculator, Receipt, TrendingUp, Users, type LucideIcon } from "lucide-react"

interface Tile {
  label: string
  value: string
  icon: LucideIcon
  tone: { bg: string; iconBg: string; text: string }
}

const LAKE = { bg: "bg-v2-lake-soft", iconBg: "bg-v2-lake-tint", text: "text-v2-lake" }
const CORAL = { bg: "bg-v2-coral-soft", iconBg: "bg-v2-coral-tint", text: "text-v2-coral-strong" }
const PLUM = { bg: "bg-v2-plum-soft", iconBg: "bg-v2-plum-tint", text: "text-v2-plum" }

interface SettleSummaryGridProps {
  count: number
  total: number
  dailyAverage: number
  perPerson: number
  currencyCode: string
  currencySelect?: React.ReactNode
}

const n = (value: number) => Math.round(value).toLocaleString()

export function SettleSummaryGrid({ count, total, dailyAverage, perPerson, currencyCode, currencySelect }: SettleSummaryGridProps) {
  const tiles: Tile[] = [
    { label: "支出筆數", value: String(count), icon: Receipt, tone: LAKE },
    { label: `總金額 (${currencyCode})`, value: n(total), icon: Calculator, tone: CORAL },
    { label: `日均花費 (${currencyCode})`, value: n(dailyAverage), icon: TrendingUp, tone: LAKE },
    { label: `人均 (${currencyCode})`, value: n(perPerson), icon: Users, tone: PLUM },
  ]

  return (
    <div className="mx-4 mt-3.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">計算總覽</p>
        {currencySelect}
      </div>
      <div data-testid="settle-summary" className="grid grid-cols-2 gap-2.5 overflow-hidden rounded-2xl border border-v2-line bg-v2-surface p-4">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`flex flex-col items-center rounded-xl px-1 py-3 ${tone.bg}`}>
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${tone.iconBg} ${tone.text}`} aria-hidden="true">
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className={`font-v2-serif text-base font-bold tabular-nums ${tone.text}`}>{value}</span>
            <span className="mt-0.5 text-xs text-v2-ink-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
