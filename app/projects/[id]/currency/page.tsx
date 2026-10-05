"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { CurrencyV1 } from "@/components/v1/currency/currency-v1"
import { CurrencyV2 } from "@/components/v2/currency/currency-v2"

export default function CurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<CurrencyV1 projectId={id} />} v2={<CurrencyV2 projectId={id} />} />
}
