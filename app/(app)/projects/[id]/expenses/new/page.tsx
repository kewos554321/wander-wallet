"use client"

import { use } from "react"
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ExpenseFormV2 projectId={id} mode="create" />
}
