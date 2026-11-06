import type { ReactNode } from "react"
import Link from "next/link"
import { BarChart3, ChevronRight } from "lucide-react"
import type { SettleData } from "@/lib/hooks/useSettlement"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SettleSummaryGrid } from "./settle-summary-grid"
import { SettlementList } from "./settlement-list"
import { SponsorCard } from "./sponsor-card"

export interface SettleV2ViewProps {
  projectId: string
  data: SettleData
  currentMemberId: string | null
  placeholderMemberIds?: ReadonlySet<string>
  memberSeeds?: ReadonlyMap<string, string>
  dailyAverage: number
  displayCurrencyCode: string
  toDisplay: (amount: number) => number
  adSlot?: ReactNode
  onShowCalc: () => void
  onShare: () => void
}

export function SettleV2View(props: SettleV2ViewProps) {
  const { data, toDisplay } = props
  const perPerson = data.balances.length > 0 ? data.summary.totalAmount / data.balances.length : 0

  return (
    <>
      <V2TopBar title="結算" backHref={`/projects/${props.projectId}`} titleClassName="font-bold" />
      {props.adSlot && <div className="mx-4 mt-3">{props.adSlot}</div>}
      <SettleSummaryGrid
        count={data.summary.totalExpenses}
        total={toDisplay(data.summary.totalAmount)}
        dailyAverage={toDisplay(props.dailyAverage)}
        perPerson={toDisplay(perPerson)}
        currencyCode={props.displayCurrencyCode}
      />
      <SettlementList
        settlements={data.settlements}
        placeholderMemberIds={props.placeholderMemberIds}
        memberSeeds={props.memberSeeds}
        currentMemberId={props.currentMemberId}
        currencyCode={props.displayCurrencyCode}
        toDisplay={toDisplay}
        onShowCalc={props.onShowCalc}
        onShare={props.onShare}
        expenseCount={data.summary.totalExpenses}
      />
      <div className="mx-4 mt-3.5 text-center">
        <Link
          href={`/projects/${props.projectId}/stats`}
          className="inline-flex items-center gap-[5px] rounded text-xs font-semibold text-v2-ink-muted transition-colors duration-150 hover:text-v2-lake focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-lake motion-reduce:transition-none"
        >
          <BarChart3 className="h-[13px] w-[13px]" aria-hidden="true" />
          查看統計
          <ChevronRight className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
      <SponsorCard />
      <div className="h-8" />
    </>
  )
}
