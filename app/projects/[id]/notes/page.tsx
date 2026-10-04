"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { NotesV1 } from "@/components/v1/notes/notes-v1"
import { NotesV2 } from "@/components/v2/notes/notes-v2"

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<NotesV1 projectId={id} />} v2={<NotesV2 projectId={id} />} />
}
