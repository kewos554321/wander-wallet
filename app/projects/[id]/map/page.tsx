"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { MapV1 } from "@/components/v1/map/map-v1"
import { MapV2 } from "@/components/v2/map/map-v2"

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<MapV1 projectId={id} />} v2={<MapV2 projectId={id} />} />
}
