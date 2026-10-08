"use client"

// Reassures the user that a foreign expense is converted to the settlement
// currency before the split/payment sections below run. Shown only for foreign
// expenses.
export function ConversionCheckpoint({ projectCurrency }: { projectCurrency: string }) {
  return (
    <div
      data-testid="conversion-checkpoint"
      aria-label="匯率換算"
      className="mx-4 mb-4 rounded-[14px] border border-v2-lake-border bg-v2-lake-soft px-3.5 py-2.5 text-[12px] text-v2-lake"
    >
      <p className="m-0">結算會先換匯，再以 {projectCurrency} 分攤</p>
    </div>
  )
}
