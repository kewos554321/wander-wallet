"use client"

import { use } from "react"
import { MileageV2 } from "@/components/v2/mileage/mileage-v2"

export default function MileagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <MileageV2 projectId={id} />
}
