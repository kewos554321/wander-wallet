import type { ReactNode } from "react"
import Link from "next/link"
import { BarChart3, ChevronRight, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SettleData } from "@/lib/hooks/useSettlement"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SettleSummaryGrid } from "./settle-summary-grid"
import { SettlementList } from "./settlement-list"
import { MemberBalances } from "./member-balances"
import { SponsorCard } from "./sponsor-card"

export interface SettleV2ViewProps {
  projectId: string
  data: SettleData
  currentMemberId: string | null
  dailyAverage: number
  displayCurrencyCode: string
  currencyOptions: string[]
  onDisplayCurrency: (code: string) => void
  toDisplay: (amount: number) => number
  adSlot?: ReactNode
  onShowCalc: () => void
  onShare: () => void
}

export function SettleV2View(props: SettleV2ViewProps) {
  const { data, toDisplay } = props
  const perPerson = data.balances.length > 0 ? data.summary.totalAmount / data.balances.length : 0
  const rates = data.summary.exchangeRatesUsed ?? {}

  const currencySelect =
    props.currencyOptions.length > 1 ? (
      <Select value={props.displayCurrencyCode} onValueChange={props.onDisplayCurrency}>
        <SelectTrigger size="sm" aria-label="顯示幣別" className="h-7 w-auto border-v2-line bg-v2-surface text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.currencyOptions.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null

  return (
    <>
      <V2TopBar title="結算" backHref={`/projects/${props.projectId}`} />
      <SettleSummaryGrid
        count={data.summary.totalExpenses}
        total={toDisplay(data.summary.totalAmount)}
        dailyAverage={toDisplay(props.dailyAverage)}
        perPerson={toDisplay(perPerson)}
        currencyCode={props.displayCurrencyCode}
        currencySelect={currencySelect}
      />
      {props.adSlot && <div className="mx-4 mt-3">{props.adSlot}</div>}
      {Object.keys(rates).length > 0 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-v2-line bg-v2-surface px-3 py-2.5 text-xs text-v2-ink-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="m-0 font-medium text-v2-ink">{data.summary.hasCustomRates ? "使用自訂匯率結算" : "使用即時匯率結算"}</p>
            {Object.entries(rates).map(([code, rate]) => (
              <p key={code} className="m-0">
                1 {code} = {rate.toFixed(data.summary.precision ?? 2)} {data.summary.currency}
                {data.summary.usingCustomRates?.[code] ? "（自訂）" : ""}
              </p>
            ))}
            <Link href={`/projects/${props.projectId}/settings`} className="mt-1 inline-block font-semibold text-v2-link">
              前往專案設定調整匯率
            </Link>
          </div>
        </div>
      )}
      <SettlementList
        settlements={data.settlements}
        memberIds={data.balances.map((b) => b.memberId)}
        currentMemberId={props.currentMemberId}
        currencyCode={props.displayCurrencyCode}
        toDisplay={toDisplay}
        onShowCalc={props.onShowCalc}
        onShare={props.onShare}
      />
      <MemberBalances
        balances={data.balances}
        currentMemberId={props.currentMemberId}
        currencyCode={props.displayCurrencyCode}
        toDisplay={toDisplay}
      />
      <div className="mx-4 mt-3.5 text-center">
        <Link href={`/projects/${props.projectId}/stats`} className="inline-flex items-center gap-[5px] text-xs font-semibold text-v2-ink-muted">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          查看統計
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <SponsorCard />
      <div className="h-8" />
    </>
  )
}
