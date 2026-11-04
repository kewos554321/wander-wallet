"use client"

import { use } from "react"
import { CurrencyV2 } from "@/components/v2/currency/currency-v2"

export default function CurrencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CurrencyV2 projectId={id} />
}
