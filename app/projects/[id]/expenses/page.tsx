"use client"

import { use } from "react"
import { ExpensesV2 } from "@/components/v2/expenses/expenses-v2"

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ExpensesV2 projectId={id} />
}
