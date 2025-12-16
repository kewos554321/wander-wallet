"use client"

import { use } from "react"
import { ExpenseForm } from "@/components/expense/expense-form"

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <ExpenseForm projectId={id} mode="create" />
}
