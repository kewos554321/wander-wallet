"use client"

import { use } from "react"
import { ExpenseForm } from "@/components/expense/expense-form"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

export default function EditExpense({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = use(params)
  return (
    <UiVersionSwitch
      v1={<ExpenseForm projectId={id} expenseId={expenseId} mode="edit" />}
      v2={<ExpenseFormV2 projectId={id} expenseId={expenseId} mode="edit" />}
    />
  )
}
