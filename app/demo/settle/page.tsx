"use client"

import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import { DEMO_CURRENCY, DEMO_CURRENT_MEMBER_ID, DEMO_PROJECT_ID, DEMO_SETTLE } from "@/app/demo/_data/fixtures"

// Real settlement view fed by the shared fixtures; calc/share are demo no-ops.
export default function SettleDemoPage() {
  return (
    <div className="mx-auto max-w-md">
      <SettleV2View
        projectId={DEMO_PROJECT_ID}
        data={DEMO_SETTLE}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
        dailyAverage={5932}
        displayCurrencyCode={DEMO_CURRENCY}
        currencyOptions={[DEMO_CURRENCY, "JPY"]}
        onDisplayCurrency={() => {}}
        toDisplay={(n) => n}
        onShowCalc={() => alert("（demo）分帳計算")}
        onShare={() => alert("（demo）分享結算")}
      />
    </div>
  )
}
