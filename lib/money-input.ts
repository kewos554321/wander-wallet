// Money inputs accept digits with at most one decimal point and two decimals.
// Full-width digits/period from CJK keyboards are normalized first.
const MONEY_PATTERN = /^\d*(\.\d{0,2})?$/

export function toMoneyInput(raw: string): string | null {
  const v = raw.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  return MONEY_PATTERN.test(v) ? v : null
}
