"use client"

import { use } from "react"
import { MembersV1 } from "@/components/v1/members/members-v1"

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <MembersV1 projectId={id} />
}
