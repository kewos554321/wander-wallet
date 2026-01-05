export const SUPPORTED_CURRENCIES = [
  // International
  { code: "USD", name: "美元", locale: "en-US" },
  { code: "EUR", name: "歐元", locale: "de-DE" },
  { code: "GBP", name: "英鎊", locale: "en-GB" },
  { code: "AUD", name: "澳幣", locale: "en-AU" },
  { code: "CAD", name: "加幣", locale: "en-CA" },
  // Asian
  { code: "TWD", name: "新台幣", locale: "zh-TW", decimals: 0 },
  { code: "JPY", name: "日圓", locale: "ja-JP", decimals: 0 },
  { code: "KRW", name: "韓元", locale: "ko-KR", decimals: 0 },
  { code: "CNY", name: "人民幣", locale: "zh-CN", decimals: 0 },
  { code: "HKD", name: "港幣", locale: "zh-HK" },
  { code: "SGD", name: "新加坡幣", locale: "en-SG" },
  { code: "THB", name: "泰銖", locale: "th-TH", decimals: 0 },
  { code: "VND", name: "越南盾", locale: "vi-VN", decimals: 0 },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"]

export const DEFAULT_CURRENCY: CurrencyCode = "TWD"

export function getCurrencyInfo(code: string) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ||
    SUPPORTED_CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY)!
  )
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode)
  const decimals = "decimals" in info ? info.decimals : 2
  return `${info.code} ${amount.toLocaleString(info.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function getCurrencyDecimals(currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode)
  return "decimals" in info ? info.decimals : 2
}
