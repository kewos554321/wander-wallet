"use client"

import { use } from "react"
import { MapV2 } from "@/components/v2/map/map-v2"

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <MapV2 projectId={id} />
}
