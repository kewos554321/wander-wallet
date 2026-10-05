import { describe, it, expect } from "vitest"
import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"

const base: ExpenseSnapshot = {
  amount: 100,
  currency: "TWD",
  description: "午餐",
  category: "food",
  paidByMemberId: "a",
  payerName: "小美",
  expenseDate: new Date(2026, 10, 16, 12),
  location: null,
  image: null,
  participantIds: ["a", "b"],
}

describe("buildExpenseChanges", () => {
  it("returns [] without changes", () => {
    expect(buildExpenseChanges(base, { ...base }, { imageReplaced: false })).toEqual([])
  })

  it("lists every changed field like the v1 form", () => {
    const changes = buildExpenseChanges(
      base,
      {
        ...base,
        amount: 200,
        description: null,
        category: "transport",
        paidByMemberId: "b",
        payerName: "志明",
        expenseDate: new Date(2026, 10, 17, 12),
        location: "上野",
        image: "https://x/y.jpg",
        participantIds: ["a", "b", "c"],
      },
      { imageReplaced: false }
    )
    expect(changes).toEqual([
      { field: "amount", label: "金額", oldValue: "TWD 100", newValue: "TWD 200" },
      { field: "description", label: "描述", oldValue: "午餐", newValue: "無" },
      { field: "category", label: "類別", oldValue: "餐飲", newValue: "交通" },
      { field: "payer", label: "付款人", oldValue: "小美", newValue: "志明" },
      { field: "date", label: "日期", oldValue: "2026/11/16", newValue: "2026/11/17" },
      { field: "location", label: "地點", oldValue: "無", newValue: "上野" },
      { field: "image", label: "圖片", oldValue: "無", newValue: "有圖片" },
      { field: "participants", label: "分攤者", oldValue: "2人", newValue: "3人" },
    ])
  })

  it("reports a replaced image", () => {
    const changes = buildExpenseChanges({ ...base, image: "old" }, { ...base, image: "new" }, { imageReplaced: true })
    expect(changes).toEqual([{ field: "image", label: "圖片", oldValue: "有圖片", newValue: "已更換" }])
  })
})
