"use client"

import { use } from "react"
import { ExportV2 } from "@/components/v2/export/export-v2"

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ExportV2 projectId={id} />
}
