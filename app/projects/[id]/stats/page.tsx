"use client"

import { use } from "react"
import { StatsV1 } from "@/components/v1/stats/stats-v1"

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StatsV1 projectId={id} />
}
