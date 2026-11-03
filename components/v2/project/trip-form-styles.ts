// Shared styles for the two trip-form views (create + edit). Both screens render
// the same card order and the same field shapes; keeping the classes here is
// what stops the pair from drifting apart (each view used to copy its own
// `cardClass`/label/input constants, and they slowly diverged).

export const CARD = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
export const CARD_TITLE = "m-0 text-[13px] font-bold text-v2-lake"
export const FIELD_LABEL = "mb-2 block text-xs font-semibold text-v2-ink-muted"
export const HELP_TEXT = "m-0 -mt-1 text-xs text-v2-ink-muted"

/** Visible keyboard focus for every text field (was `outline-none` with no replacement). */
export const FOCUS_RING =
  "transition focus-visible:border-v2-lake focus-visible:ring-2 focus-visible:ring-v2-lake/30"
/** A red ring for a field the user must fix. */
export const ERROR_RING = "border-v2-danger ring-2 ring-v2-danger/20"

export const NAME_INPUT = `w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none ${FOCUS_RING}`
export const NAME_PLACEHOLDER = "例如：日本關西 5 天"
export const TEXTAREA = `min-h-16 w-full rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[13px] outline-none ${FOCUS_RING}`
export const BUDGET_ROW =
  "flex items-center gap-1.5 rounded-[12px] border border-v2-line bg-v2-paper px-3.5 py-3 transition focus-within:border-v2-lake focus-within:ring-2 focus-within:ring-v2-lake/30"

export const CTA_PRIMARY = "rounded-[14px] bg-v2-lake py-[15px] text-base font-bold text-v2-on-lake disabled:opacity-40"
export const CTA_SECONDARY = "rounded-[14px] border border-v2-line bg-v2-surface py-[15px] text-sm font-bold disabled:opacity-40"

export const FIELD_ERROR = "m-0 text-xs font-semibold text-v2-danger"
