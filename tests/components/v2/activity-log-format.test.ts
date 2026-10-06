import { describe, it, expect } from "vitest"
import { getActionText, getActionTone, categoryLabel, formatChanges } from "@/components/v2/activity-logs/format"

describe("getActionText", () => {
  it("names the action and entity", () => {
    expect(getActionText("create", "expense")).toBe("新增費用")
    expect(getActionText("update", "member")).toBe("編輯成員")
    expect(getActionText("delete", "project")).toBe("刪除項目")
  })
})

describe("getActionTone", () => {
  it("maps action to a tone", () => {
    expect(getActionTone("create")).toBe("create")
    expect(getActionTone("update")).toBe("update")
    expect(getActionTone("delete")).toBe("delete")
    expect(getActionTone("unknown")).toBe("update")
  })
})

describe("categoryLabel", () => {
  it("translates categories and blanks null", () => {
    expect(categoryLabel("food")).toBe("餐飲")
    expect(categoryLabel(null)).toBe("")
  })
})

describe("formatChanges", () => {
  it("returns an empty list for null changes (Review Focus 4)", () => {
    expect(formatChanges(null, "TWD")).toEqual([])
  })

  it("merges amount and currency into one row", () => {
    expect(formatChanges({ amount: { from: 12000, to: 14000 }, currency: { from: "JPY", to: "TWD" } }, "TWD")).toEqual([
      { label: "金額", from: "JPY 12,000", to: "TWD 14,000" },
    ])
  })

  it("defaults to the project currency for an amount-only change", () => {
    expect(formatChanges({ amount: { from: 100, to: 200 } }, "TWD")).toEqual([
      { label: "金額", from: "TWD 100", to: "TWD 200" },
    ])
  })

  it("formats a participants change", () => {
    expect(
      formatChanges({ participants: { from: { count: 2, removed: ["小美"] }, to: { count: 3, added: ["阿明"] } } }, "TWD")
    ).toEqual([{ label: "分攤者", from: "2人", to: "3人（移除：小美；加入：阿明）" }])
  })

  it("labels a payer change (multi-payer joined names)", () => {
    expect(formatChanges({ payer: { from: "志明", to: "志明、小美" } }, "TWD")).toEqual([
      { label: "付款成員", from: "志明", to: "志明、小美" },
    ])
  })

  it("translates category and null values", () => {
    expect(formatChanges({ category: { from: "food", to: "transport" } }, "TWD")).toEqual([
      { label: "類別", from: "餐飲", to: "交通" },
    ])
    expect(formatChanges({ description: { from: null, to: "晚餐" } }, "TWD")).toEqual([
      { label: "描述", from: "無", to: "晚餐" },
    ])
  })
})
