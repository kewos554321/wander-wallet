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
    // 每筆費用都應該有小華作為付款人
    result.expenses.forEach(expense => {
      expect(expense.payerId).toBe("member-2") // 小華
      expect(expense.participantIds).toHaveLength(3) // 全部成員
    })
  }, 30000)

  it("should parse expenses with specific participants", async () => {
    const result = await parseExpenses({
      transcript: "晚餐 500 元、甜點 200 元，我跟小美分",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(2)
    // 每筆費用都應該有小明和小美作為分擔者
    result.expenses.forEach(expense => {
      expect(expense.participantIds).toContain("member-1") // 小明
      expect(expense.participantIds).toContain("member-3") // 小美
    })
  }, 30000)

  it("should parse expenses with different payers per expense", async () => {
    const result = await parseExpenses({
      transcript: "早餐 50、午餐 60，我幫大家先付。晚餐 100，小華幫大家付",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(2)

    // 找出各筆費用
    const breakfast = result.expenses.find(e => e.amount === 50)
    const lunch = result.expenses.find(e => e.amount === 60)
    const dinner = result.expenses.find(e => e.amount === 100)

    // 早餐和午餐應該是小明付的
    if (breakfast) expect(breakfast.payerId).toBe("member-1")
    if (lunch) expect(lunch.payerId).toBe("member-1")
    // 晚餐應該是小華付的
    if (dinner) expect(dinner.payerId).toBe("member-2")
  }, 30000)

  it("should parse expenses with different participants per expense", async () => {
    const result = await parseExpenses({
      transcript: "交通 90, 小美幫她自己跟小華付",
      members,
      currentUserName: "小明",
    })

    expect(result.expenses.length).toBeGreaterThanOrEqual(1)

    const transport = result.expenses.find(e => e.amount === 90)
    if (transport) {
      expect(transport.payerId).toBe("member-3") // 小美
      expect(transport.participantIds).toContain("member-3") // 小美
      expect(transport.participantIds).toContain("member-2") // 小華
      expect(transport.participantIds).not.toContain("member-1") // 不包含小明
    }
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
