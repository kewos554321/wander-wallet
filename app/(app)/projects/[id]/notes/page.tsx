"use client"

import { use } from "react"
import { NotesV2 } from "@/components/v2/notes/notes-v2"

export default function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <NotesV2 projectId={id} />
}
