"use client"

import { use } from "react"
import { StatsV2 } from "@/components/v2/stats/stats-v2"

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StatsV2 projectId={id} />
}
