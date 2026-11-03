"use client"

// The real add/edit expense form. The layout lives in
// ExpenseFormPlatformView; this wrapper pins the platform variant so the
// product can never drift onto the demo-only ledger layout.

import { ExpenseFormPlatformView, type ExpenseFormPlatformViewProps } from "./expense-form-platform-view"

export type ExpenseFormV2ViewProps = Omit<ExpenseFormPlatformViewProps, "variant">

export function ExpenseFormV2View(props: ExpenseFormV2ViewProps) {
  return <ExpenseFormPlatformView {...props} variant="platform" />
}
