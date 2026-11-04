"use client"

import { use } from "react"
import { SettleV2 } from "@/components/v2/settle/settle-v2"

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SettleV2 projectId={id} />
}
