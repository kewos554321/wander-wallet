"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExpensesV1 } from "@/components/v1/expenses/expenses-v1"
import { ExpensesV2 } from "@/components/v2/expenses/expenses-v2"

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ExpensesV1 projectId={id} />} v2={<ExpensesV2 projectId={id} />} />
}
