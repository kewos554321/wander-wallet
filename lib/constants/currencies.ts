export const SUPPORTED_CURRENCIES = [
  // International
  { code: "USD", name: "美元", locale: "en-US" },
  { code: "EUR", name: "歐元", locale: "de-DE" },
  { code: "GBP", name: "英鎊", locale: "en-GB" },
  { code: "AUD", name: "澳幣", locale: "en-AU" },
  { code: "CAD", name: "加幣", locale: "en-CA" },
  { code: "CHF", name: "瑞士法郎", locale: "de-CH" },
  { code: "NZD", name: "紐西蘭幣", locale: "en-NZ" },
  // Asian
  { code: "TWD", name: "新台幣", locale: "zh-TW", decimals: 0 },
  { code: "JPY", name: "日圓", locale: "ja-JP", decimals: 0 },
  { code: "KRW", name: "韓元", locale: "ko-KR", decimals: 0 },
  { code: "CNY", name: "人民幣", locale: "zh-CN" },
  { code: "HKD", name: "港幣", locale: "zh-HK" },
  { code: "SGD", name: "新加坡幣", locale: "en-SG" },
  { code: "THB", name: "泰銖", locale: "th-TH" },
  { code: "VND", name: "越南盾", locale: "vi-VN", decimals: 0 },
  // Others
  { code: "MYR", name: "馬來西亞令吉", locale: "ms-MY" },
  { code: "PHP", name: "菲律賓披索", locale: "en-PH" },
  { code: "AED", name: "阿聯酋迪拉姆", locale: "en-AE" },
  { code: "TRY", name: "土耳其里拉", locale: "tr-TR" },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"]

export const DEFAULT_CURRENCY: CurrencyCode = "TWD"

// Short display names (A9b / amount fields); falls back to the full name.
export const CURRENCY_SHORT_NAMES: Record<string, string> = {
  TWD: "台幣",
  CHF: "瑞郎",
  NZD: "紐幣",
  MYR: "馬幣",
  PHP: "披索",
  AED: "迪拉姆",
  TRY: "里拉",
}

export function getCurrencyInfo(code: string) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ||
    SUPPORTED_CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY)!
  )
}

export function formatCurrency(amount: number, currencyCode: string): string {
  return `${getCurrencyInfo(currencyCode).code} ${formatAmount(amount, currencyCode)}`
}

// Number only, formatted with the currency's locale and decimals.
export function formatAmount(amount: number, currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode)
  const decimals = "decimals" in info ? info.decimals : 2
  return amount.toLocaleString(info.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function getCurrencyDecimals(currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode)
  return "decimals" in info ? info.decimals : 2
}
