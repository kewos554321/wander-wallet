"use client"

import { useState, type ReactNode } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import { AdContainer } from "@/components/ads/ad-container"
import { ShareSettlementDialog } from "@/components/settle/share-settlement-dialog"
import { SettlementCalcDialog } from "@/components/settle/settlement-calc-dialog"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectData } from "@/lib/hooks"
import { useSettlement } from "@/lib/hooks/useSettlement"
import { computeDailyAverage } from "@/lib/settlement"
import { SettleV2View } from "./settle-v2-view"

export function SettleV2({ projectId }: { projectId: string }) {
  const { user } = useLiff()
  const { project, members } = useProjectData(projectId)
  const s = useSettlement(projectId)
  const [showShare, setShowShare] = useState(false)
  const [showCalc, setShowCalc] = useState(false)

  const baseCurrency = s.data?.summary.currency || DEFAULT_CURRENCY
  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null

  let content: ReactNode
  if (s.loading) {
    content = (
      <>
        <V2TopBar title="結算" backHref={`/projects/${projectId}`} />
        <div data-testid="v2-settle-skeleton" className="space-y-3 p-4">
          <div className="h-48 animate-pulse rounded-2xl bg-v2-sand" />
          <div className="h-32 animate-pulse rounded-2xl bg-v2-sand" />
        </div>
      </>
    )
  } else if (s.error || !s.data) {
    content = (
      <>
        <V2TopBar title="結算" backHref={`/projects/${projectId}`} />
        <p className="py-8 text-center text-v2-ink-muted">{s.error || "獲取結算數據失敗"}</p>
      </>
    )
  } else {
    const dailyAverage = computeDailyAverage(
      s.data.summary.totalAmount,
      { startDate: project?.startDate ?? null, endDate: project?.endDate ?? null },
      (project?.expenses ?? []).map((e) => e.expenseDate)
    )
    content = (
      <>
        <SettleV2View
          projectId={projectId}
          data={s.data}
          currentMemberId={currentMemberId}
          dailyAverage={dailyAverage}
          displayCurrencyCode={s.displayCurrencyCode}
          currencyOptions={[baseCurrency, ...Object.keys(s.data.summary.exchangeRatesUsed ?? {})]}
          onDisplayCurrency={(code) => s.setDisplayCurrency(code === baseCurrency ? null : code)}
          toDisplay={s.toDisplay}
          adSlot={<AdContainer placement="settle" variant="banner" />}
          onShowCalc={() => setShowCalc(true)}
          onShare={() => setShowShare(true)}
        />
        <ShareSettlementDialog open={showShare} onOpenChange={setShowShare} shareText={s.shareText} />
        <SettlementCalcDialog open={showCalc} onOpenChange={setShowCalc} data={s.data} />
      </>
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
