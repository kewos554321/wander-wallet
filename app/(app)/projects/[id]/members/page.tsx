"use client"

import { use } from "react"
import { MembersV2 } from "@/components/v2/members/members-v2"

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <MembersV2 projectId={id} />
}
