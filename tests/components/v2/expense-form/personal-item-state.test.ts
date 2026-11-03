import { describe, expect, it } from "vitest"
import {
  countIncompleteItems,
  isCompleteItem,
  isIncompleteItem,
  isTouchedItem,
} from "@/components/v2/expense-form/personal-item-state"

describe("personal item state", () => {
  it("treats an entirely blank row as untouched", () => {
    const item = { name: "", amount: "" }
    expect(isTouchedItem(item)).toBe(false)
    expect(isIncompleteItem(item)).toBe(false)
  })

  it("requires a non-empty name and an amount greater than zero", () => {
    expect(isCompleteItem({ name: "咖啡", amount: "120" })).toBe(true)
    expect(isCompleteItem({ name: "咖啡", amount: "0" })).toBe(false)
    expect(isCompleteItem({ name: " ", amount: "120" })).toBe(false)
  })

  it("flags name-only and amount-only rows as incomplete", () => {
    expect(isIncompleteItem({ name: "咖啡", amount: "" })).toBe(true)
    expect(isIncompleteItem({ name: "", amount: "120" })).toBe(true)
  })

  it("counts only touched incomplete rows", () => {
    expect(
      countIncompleteItems([
        { name: "", amount: "" },
        { name: "咖啡", amount: "" },
        { name: "午餐", amount: "240" },
      ]),
    ).toBe(1)
  })
})
