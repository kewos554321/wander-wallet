"use client"

import { use } from "react"
import { SettleV1 } from "@/components/v1/settle/settle-v1"

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SettleV1 projectId={id} />
}
