"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { MileageV1 } from "@/components/v1/mileage/mileage-v1"
import { MileageV2 } from "@/components/v2/mileage/mileage-v2"

export default function MileagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<MileageV1 projectId={id} />} v2={<MileageV2 projectId={id} />} />
}
