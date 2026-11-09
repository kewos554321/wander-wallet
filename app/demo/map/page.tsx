"use client"

import { MapV2View } from "@/components/v2/map/map-v2-view"
import { DEMO_CURRENCY, DEMO_MAP_EXPENSES, DEMO_PROJECT_ID } from "@/app/demo/_data/fixtures"

// Real map view fed by the shared 東京之旅 fixtures. Expenses carry real Tokyo
// coordinates so the Leaflet pins, category filter and list can all be previewed.
export default function MapDemoPage() {
  return (
    <MapV2View
      projectId={DEMO_PROJECT_ID}
      projectCurrency={DEMO_CURRENCY}
      expenses={DEMO_MAP_EXPENSES}
      loading={false}
      onSelectExpense={(id) => alert(`（demo）開啟支出 ${id}`)}
    />
  )
}
