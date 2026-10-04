interface V2BrandMarkProps {
  /** Override the mark's box (size/rounding/shadow); defaults to the 32px trip-list lockup. */
  className?: string
}

/** Wander Wallet brand mark: gradient rounded square wrapping the wallet glyph. */
export function V2BrandMark({ className }: V2BrandMarkProps) {
  return (
    <span
      data-testid="v2-brand-mark"
      aria-hidden="true"
      className={
        className ??
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-v2-link to-v2-lake text-v2-paper shadow-[0_2px_6px_rgba(27,88,71,.35)]"
      }
    >
      <svg viewBox="0 0 32 32" className="h-[19px] w-[19px]" fill="none" aria-hidden="true">
        <rect x="4" y="8" width="24" height="18" rx="4" stroke="currentColor" strokeWidth="2.5" />
        <path d="M4 14 H28" stroke="currentColor" strokeWidth="2" />
        <circle cx="22" cy="19" r="3" fill="currentColor" fillOpacity="0.4" />
      </svg>
    </span>
  )
}
