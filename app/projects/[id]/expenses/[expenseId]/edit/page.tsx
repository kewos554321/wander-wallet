"use client"

import { use } from "react"
import { ExpenseForm } from "@/components/expense/expense-form"

export default function EditExpense({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = use(params)

  return <ExpenseForm projectId={id} expenseId={expenseId} mode="edit" />
}
