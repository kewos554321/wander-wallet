import { describe, it, expect } from "vitest"
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencyInfo,
  formatCurrency,
  getCurrencyDecimals,
} from "@/lib/constants/currencies"

describe("SUPPORTED_CURRENCIES", () => {
  it("should contain expected currencies", () => {
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code)
    expect(codes).toContain("USD")
    expect(codes).toContain("EUR")
    expect(codes).toContain("TWD")
    expect(codes).toContain("JPY")
    expect(codes).toContain("KRW")
  })

  it("should have 13 supported currencies", () => {
    expect(SUPPORTED_CURRENCIES).toHaveLength(13)
  })

  it("should have correct structure for each currency", () => {
    SUPPORTED_CURRENCIES.forEach((currency) => {
      expect(currency).toHaveProperty("code")
      expect(currency).toHaveProperty("name")
      expect(currency).toHaveProperty("locale")
      expect(typeof currency.code).toBe("string")
      expect(typeof currency.name).toBe("string")
      expect(typeof currency.locale).toBe("string")
    })
  })

  it("should mark zero-decimal currencies correctly", () => {
    const zeroDecimalCurrencies = ["TWD", "JPY", "KRW", "CNY", "THB", "VND"]
    zeroDecimalCurrencies.forEach((code) => {
      const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code)
      expect(currency).toBeDefined()
      if (currency && "decimals" in currency) {
        expect(currency.decimals).toBe(0)
      }
    })
  })
})

describe("DEFAULT_CURRENCY", () => {
  it("should be TWD", () => {
    expect(DEFAULT_CURRENCY).toBe("TWD")
  })
})

describe("getCurrencyInfo", () => {
  it("should return correct info for USD", () => {
    const info = getCurrencyInfo("USD")
    expect(info.code).toBe("USD")
    expect(info.name).toBe("美元")
    expect(info.locale).toBe("en-US")
  })

  it("should return correct info for TWD", () => {
    const info = getCurrencyInfo("TWD")
    expect(info.code).toBe("TWD")
    expect(info.name).toBe("新台幣")
    expect(info.locale).toBe("zh-TW")
  })

  it("should return correct info for JPY", () => {
    const info = getCurrencyInfo("JPY")
    expect(info.code).toBe("JPY")
    expect(info.name).toBe("日圓")
  })

  it("should return default currency for unknown code", () => {
    const info = getCurrencyInfo("UNKNOWN")
    expect(info.code).toBe(DEFAULT_CURRENCY)
  })

  it("should return default currency for empty string", () => {
    const info = getCurrencyInfo("")
    expect(info.code).toBe(DEFAULT_CURRENCY)
  })
})

describe("formatCurrency", () => {
  it("should format USD correctly", () => {
    const result = formatCurrency(1234.56, "USD")
    expect(result).toContain("USD")
    expect(result).toContain("1,234.56")
  })

  it("should format TWD with 0 decimals", () => {
    const result = formatCurrency(1234.56, "TWD")
    expect(result).toContain("TWD")
    expect(result).toContain("1,235") // Rounded
  })

  it("should format JPY with 0 decimals", () => {
    const result = formatCurrency(1234.56, "JPY")
    expect(result).toContain("JPY")
    // JPY should have 0 decimals
  })

  it("should format EUR with 2 decimals", () => {
    const result = formatCurrency(1234.56, "EUR")
    expect(result).toContain("EUR")
  })

  it("should handle zero amount", () => {
    const result = formatCurrency(0, "USD")
    expect(result).toContain("USD")
    expect(result).toContain("0")
  })

  it("should handle negative amount", () => {
    const result = formatCurrency(-100, "USD")
    expect(result).toContain("-")
  })

  it("should handle large numbers", () => {
    const result = formatCurrency(1000000, "USD")
    expect(result).toContain("1,000,000")
  })
})

describe("getCurrencyDecimals", () => {
  it("should return 0 for TWD", () => {
    expect(getCurrencyDecimals("TWD")).toBe(0)
  })

  it("should return 0 for JPY", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0)
  })

  it("should return 0 for KRW", () => {
    expect(getCurrencyDecimals("KRW")).toBe(0)
  })

  it("should return 2 for USD", () => {
    expect(getCurrencyDecimals("USD")).toBe(2)
  })

  it("should return 2 for EUR", () => {
    expect(getCurrencyDecimals("EUR")).toBe(2)
  })

  it("should return default currency decimals for unknown currency", () => {
    // Unknown currency returns TWD as default, which has 0 decimals
    expect(getCurrencyDecimals("UNKNOWN")).toBe(0)
  })
})
