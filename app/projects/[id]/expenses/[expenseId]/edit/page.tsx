"use client"

import { use } from "react"
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

export default function EditExpense({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = use(params)
  return <ExpenseFormV2 projectId={id} expenseId={expenseId} mode="edit" />
}
