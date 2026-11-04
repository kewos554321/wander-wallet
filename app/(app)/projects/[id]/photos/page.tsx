"use client"

import { use } from "react"
import { PhotosV2 } from "@/components/v2/photos/photos-v2"

export default function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PhotosV2 projectId={id} />
}
