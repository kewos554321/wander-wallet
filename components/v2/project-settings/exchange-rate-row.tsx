// One "自訂匯率" row: <currency> = [input] <settlement currency>, with a
// live-rate hint underneath when the live rate is known.
export function ExchangeRateRow({
  currency,
  settlementCurrency,
  value,
  liveRate,
  onChange,
  disabled,
}: {
  currency: string
  settlementCurrency: string
  value: string
  liveRate: number | null
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="w-[52px] shrink-0 text-[13px] font-bold text-v2-lake">{currency}</span>
        <span className="text-v2-ink-subtle">=</span>
        <div className="relative flex-1">
          <input
            aria-label={`${currency} 匯率`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            inputMode="decimal"
            className="w-full rounded-xl border border-v2-line bg-v2-paper py-[10px] pl-3 pr-11 text-[13px]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-v2-ink-muted">{settlementCurrency}</span>
        </div>
      </div>
      {liveRate !== null && (
        <p className="mt-2 text-xs text-v2-ink-muted">
          目前使用即時匯率：1 {currency} = {liveRate} {settlementCurrency}
        </p>
      )}
    </div>
  )
}
