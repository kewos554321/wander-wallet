"use client"

// Two-segment control that flips a section between the expense currency and the
// settlement currency. Purely a display switch: the underlying amounts and the
// save payload stay in the expense currency. Rendered only when the two
// currencies differ and a usable rate exists.
export function CurrencyToggle({
  currency,
  projectCurrency,
  displayCurrency,
  onChange,
}: {
  currency: string
  projectCurrency: string
  displayCurrency: string
  onChange: (currency: string) => void
}) {
  return (
    <span
      role="group"
      aria-label="顯示幣別"
      className="inline-flex h-5 shrink-0 items-center rounded-full bg-v2-lake-tint p-0.5 text-[11px] font-bold"
    >
      {[currency, projectCurrency].map((code) => {
        const active = code === displayCurrency
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            aria-label={`顯示 ${code}`}
            onClick={() => onChange(code)}
            className={`flex h-full items-center rounded-full px-2 leading-none ${active ? "bg-v2-lake text-v2-on-lake" : "text-v2-lake"}`}
          >
            {code}
          </button>
        )
      })}
    </span>
  )
}
