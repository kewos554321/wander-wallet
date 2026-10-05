"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExportV1 } from "@/components/v1/export/export-v1"
import { ExportV2 } from "@/components/v2/export/export-v2"

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ExportV1 projectId={id} />} v2={<ExportV2 projectId={id} />} />
}
