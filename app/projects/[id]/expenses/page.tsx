"use client"

import { use } from "react"
import { ExpensesV1 } from "@/components/v1/expenses/expenses-v1"

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ExpensesV1 projectId={id} />
}
