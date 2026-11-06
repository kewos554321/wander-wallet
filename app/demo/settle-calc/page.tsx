"use client"

import { useState } from "react"
import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import { SettlementCalcDialog } from "@/components/v2/settle/settle-calc-dialog"
import { DEMO_CURRENCY, DEMO_CURRENT_MEMBER_ID, DEMO_PROJECT_ID, DEMO_SETTLE_CALC } from "@/app/demo/_data/fixtures"

// Dedicated tuning screen: the calculation dialog opens immediately over the
// real settlement page. The fixture includes personal items, shared splits,
// custom amounts, multiple payers, a foreign-currency row and one very wide
// balance row to exercise the table's horizontal scroll.
export default function SettleCalcDemoPage() {
  const [open, setOpen] = useState(true)

  return (
    <div className="mx-auto max-w-md">
      <SettleV2View
        projectId={DEMO_PROJECT_ID}
        data={DEMO_SETTLE_CALC}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
        dailyAverage={5932}
        displayCurrencyCode={DEMO_CURRENCY}
        currencyOptions={[DEMO_CURRENCY, "JPY"]}
        onDisplayCurrency={() => {}}
        toDisplay={(n) => n}
        onShowCalc={() => setOpen(true)}
        onShare={() => {}}
      />
      <SettlementCalcDialog
        open={open}
        onOpenChange={setOpen}
        data={DEMO_SETTLE_CALC}
        currentMemberId={DEMO_CURRENT_MEMBER_ID}
      />
    </div>
  )
}
