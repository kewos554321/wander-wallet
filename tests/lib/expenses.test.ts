import { describe, it, expect } from "vitest"
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  CATEGORY_STYLES,
  CATEGORIES,
  getCategoryInfo,
  getCategoryLabel,
  getCategoryColor,
  type ExpenseCategory,
} from "@/lib/constants/expenses"

describe("EXPENSE_CATEGORIES", () => {
  it("should have 8 categories", () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8)
  })

  it("should contain all expected categories", () => {
    expect(EXPENSE_CATEGORIES).toContain("food")
    expect(EXPENSE_CATEGORIES).toContain("transport")
    expect(EXPENSE_CATEGORIES).toContain("accommodation")
    expect(EXPENSE_CATEGORIES).toContain("ticket")
    expect(EXPENSE_CATEGORIES).toContain("shopping")
    expect(EXPENSE_CATEGORIES).toContain("entertainment")
    expect(EXPENSE_CATEGORIES).toContain("gift")
    expect(EXPENSE_CATEGORIES).toContain("other")
  })
})

describe("CATEGORY_LABELS", () => {
  it("should have Chinese labels for all categories", () => {
    expect(CATEGORY_LABELS.food).toBe("餐飲")
    expect(CATEGORY_LABELS.transport).toBe("交通")
    expect(CATEGORY_LABELS.accommodation).toBe("住宿")
    expect(CATEGORY_LABELS.ticket).toBe("票券")
    expect(CATEGORY_LABELS.shopping).toBe("購物")
    expect(CATEGORY_LABELS.entertainment).toBe("娛樂")
    expect(CATEGORY_LABELS.gift).toBe("禮品")
    expect(CATEGORY_LABELS.other).toBe("其他")
  })
})

describe("CATEGORY_ICONS", () => {
  it("should have icon for all categories", () => {
    EXPENSE_CATEGORIES.forEach((category) => {
      expect(CATEGORY_ICONS[category]).toBeDefined()
    })
  })
})

describe("CATEGORY_COLORS", () => {
  it("should have hex color for all categories", () => {
    EXPENSE_CATEGORIES.forEach((category) => {
      expect(CATEGORY_COLORS[category]).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })

  it("should have specific colors", () => {
    expect(CATEGORY_COLORS.food).toBe("#f97316")
    expect(CATEGORY_COLORS.transport).toBe("#3b82f6")
    expect(CATEGORY_COLORS.other).toBe("#64748b")
  })
})

describe("CATEGORY_STYLES", () => {
  it("should have Tailwind classes for all categories", () => {
    EXPENSE_CATEGORIES.forEach((category) => {
      expect(CATEGORY_STYLES[category]).toContain("bg-")
      expect(CATEGORY_STYLES[category]).toContain("text-")
    })
  })
})

describe("CATEGORIES", () => {
  it("should have 8 category info objects", () => {
    expect(CATEGORIES).toHaveLength(8)
  })

  it("should have correct structure for each category", () => {
    CATEGORIES.forEach((category) => {
      expect(category).toHaveProperty("value")
      expect(category).toHaveProperty("label")
      expect(category).toHaveProperty("icon")
      expect(category).toHaveProperty("color")
    })
  })

  it("should have matching values and labels", () => {
    CATEGORIES.forEach((category) => {
      expect(CATEGORY_LABELS[category.value]).toBe(category.label)
    })
  })
})

describe("getCategoryInfo", () => {
  it("should return correct info for food", () => {
    const info = getCategoryInfo("food")
    expect(info.value).toBe("food")
    expect(info.label).toBe("餐飲")
    expect(info.icon).toBeDefined()
    expect(info.color).toContain("bg-orange")
  })

  it("should return correct info for transport", () => {
    const info = getCategoryInfo("transport")
    expect(info.value).toBe("transport")
    expect(info.label).toBe("交通")
  })

  it("should return correct info for accommodation", () => {
    const info = getCategoryInfo("accommodation")
    expect(info.value).toBe("accommodation")
    expect(info.label).toBe("住宿")
  })

  it("should return correct info for ticket", () => {
    const info = getCategoryInfo("ticket")
    expect(info.value).toBe("ticket")
    expect(info.label).toBe("票券")
  })

  it("should return correct info for shopping", () => {
    const info = getCategoryInfo("shopping")
    expect(info.value).toBe("shopping")
    expect(info.label).toBe("購物")
  })

  it("should return correct info for entertainment", () => {
    const info = getCategoryInfo("entertainment")
    expect(info.value).toBe("entertainment")
    expect(info.label).toBe("娛樂")
  })

  it("should return correct info for gift", () => {
    const info = getCategoryInfo("gift")
    expect(info.value).toBe("gift")
    expect(info.label).toBe("禮品")
  })

  it("should return correct info for other", () => {
    const info = getCategoryInfo("other")
    expect(info.value).toBe("other")
    expect(info.label).toBe("其他")
  })

  it("should return 'other' for unknown category", () => {
    const info = getCategoryInfo("unknown")
    expect(info.value).toBe("other")
    expect(info.label).toBe("其他")
  })

  it("should return 'other' for empty string", () => {
    const info = getCategoryInfo("")
    expect(info.value).toBe("other")
  })
})

describe("getCategoryLabel", () => {
  it("should return correct label for valid category", () => {
    expect(getCategoryLabel("food")).toBe("餐飲")
    expect(getCategoryLabel("transport")).toBe("交通")
    expect(getCategoryLabel("accommodation")).toBe("住宿")
    expect(getCategoryLabel("ticket")).toBe("票券")
    expect(getCategoryLabel("shopping")).toBe("購物")
    expect(getCategoryLabel("entertainment")).toBe("娛樂")
    expect(getCategoryLabel("gift")).toBe("禮品")
    expect(getCategoryLabel("other")).toBe("其他")
  })

  it("should return input for unknown category", () => {
    expect(getCategoryLabel("unknown")).toBe("unknown")
    expect(getCategoryLabel("custom")).toBe("custom")
  })
})

describe("getCategoryColor", () => {
  it("should return correct color for valid category", () => {
    expect(getCategoryColor("food")).toBe("#f97316")
    expect(getCategoryColor("transport")).toBe("#3b82f6")
    expect(getCategoryColor("accommodation")).toBe("#7c3aed")
    expect(getCategoryColor("ticket")).toBe("#06b6d4")
    expect(getCategoryColor("shopping")).toBe("#10b981")
    expect(getCategoryColor("entertainment")).toBe("#ec4899")
    expect(getCategoryColor("gift")).toBe("#f59e0b")
    expect(getCategoryColor("other")).toBe("#64748b")
  })

  it("should return 'other' color for unknown category", () => {
    expect(getCategoryColor("unknown")).toBe("#64748b")
    expect(getCategoryColor("")).toBe("#64748b")
  })
})
