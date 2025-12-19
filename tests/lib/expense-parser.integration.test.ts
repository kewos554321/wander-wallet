/**
 * Integration Test - 實際呼叫 DeepSeek API
 *
 * 執行方式：
 *   DEEPSEEK_API_KEY=your_key npm run test:run -- tests/lib/expense-parser.integration.test.ts
 *
 * 注意：這會消耗 API 額度
 */
import { describe, it, expect } from "vitest"
import { parseExpenses, parseExpense, type MemberInfo } from "@/lib/ai/expense-parser"

// 如果沒有 API key，跳過測試
const SKIP_INTEGRATION = !process.env.DEEPSEEK_API_KEY

describe.skipIf(SKIP_INTEGRATION)("parseExpenses Integration (multi-expense)", () => {
  const members: MemberInfo[] = [
    { id: "member-1", displayName: "小明" },
    { id: "member-2", displayName: "小華" },
    { id: "member-3", displayName: "小美" },
  ]

  it("should parse single expense", async () => {
    const result = await parseExpenses({
      transcript: "午餐吃拉麵 280 元",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses).toHaveLength(1)
    expect(result.expenses[0].amount).toBe(280)
    expect(result.expenses[0].category).toBe("food")
    expect(result.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it("should parse multiple expenses", async () => {
    const result = await parseExpenses({
      transcript: "午餐 280 元、計程車 150 元、咖啡 80 元",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(2)

    // 檢查是否有找到預期的費用
    const amounts = result.expenses.map(e => e.amount)
    expect(amounts).toContain(280)
    expect(amounts).toContain(150)
  }, 30000)

  it("should parse expenses with shared payer", async () => {
    const result = await parseExpenses({
      transcript: "午餐 280、計程車 150，小華付的，大家分",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(2)
    expect(result.sharedContext.payerId).toBe("member-2") // 小華
    expect(result.sharedContext.participantIds).toHaveLength(3) // 全部成員
  }, 30000)

  it("should parse expenses with specific participants", async () => {
    const result = await parseExpenses({
      transcript: "晚餐 500 元、甜點 200 元，我跟小美分",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(2)
    expect(result.sharedContext.participantIds).toContain("member-1") // 小明
    expect(result.sharedContext.participantIds).toContain("member-3") // 小美
  }, 30000)
})

describe.skipIf(SKIP_INTEGRATION)("parseExpense Integration (legacy single)", () => {
  const members: MemberInfo[] = [
    { id: "member-1", displayName: "小明" },
    { id: "member-2", displayName: "小華" },
  ]

  it("should return first expense when using legacy parseExpense", async () => {
    const result = await parseExpense({
      transcript: "午餐 280 元、計程車 150 元",
      members,
      currentUserName: "小明",
    })

    // 應該只返回第一筆
    expect(result.amount).toBeDefined()
    expect(result.description).toBeDefined()
    expect(result.category).toBeDefined()
  }, 30000)
})
