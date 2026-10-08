import { Calculator, Receipt, TrendingUp, Users, type LucideIcon } from "lucide-react"
import { formatAmount } from "@/lib/constants/currencies"

interface Tile {
  label: string
  value: string
  icon: LucideIcon
  tone: { bg: string; iconBg: string; text: string }
  testId?: string
}

const LAKE = { bg: "bg-v2-lake-soft", iconBg: "bg-v2-lake-tint", text: "text-v2-lake" }
const SKY = { bg: "bg-v2-sky-soft", iconBg: "bg-v2-sky-tint", text: "text-v2-sky" }
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

const n = (value: number, currencyCode: string) => formatAmount(value, currencyCode)

export function SettleSummaryGrid({ count, total, dailyAverage, perPerson, currencyCode, currencySelect }: SettleSummaryGridProps) {
  const tiles: Tile[] = [
    { label: "支出筆數", value: String(count), icon: Receipt, tone: LAKE },
    { label: `總金額 (${currencyCode})`, value: n(total, currencyCode), icon: Calculator, tone: CORAL },
    { label: `日均花費 (${currencyCode})`, value: n(dailyAverage, currencyCode), icon: TrendingUp, tone: SKY, testId: "settle-tile-daily" },
    { label: `人均 (${currencyCode})`, value: n(perPerson, currencyCode), icon: Users, tone: PLUM },
  ]

  return (
    <div data-testid="settle-summary" className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-[13px] font-bold text-v2-lake">計算總覽</p>
        {currencySelect}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(({ label, value, icon: Icon, tone, testId }) => (
          <div key={label} data-testid={testId} className={`flex flex-col items-center rounded-[12px] px-1 py-3 ${tone.bg}`}>
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${tone.iconBg} ${tone.text}`} aria-hidden="true">
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
            </div>
            <span className="font-v2-serif text-base font-bold tabular-nums text-v2-ink">{value}</span>
            <span className="mt-0.5 text-xs text-v2-ink-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
