"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { PhotosV1 } from "@/components/v1/photos/photos-v1"
import { PhotosV2 } from "@/components/v2/photos/photos-v2"

export default function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<PhotosV1 projectId={id} />} v2={<PhotosV2 projectId={id} />} />
}
