/**
 * Integration Test - 實際呼叫 DeepSeek API
 *
 * 執行方式：
 *   DEEPSEEK_API_KEY=your_key npm run test:run -- tests/lib/expense-parser.integration.test.ts
 *
 * 注意：這會消耗 API 額度
 */
import { describe, it, expect, beforeAll } from "vitest"
import { parseExpense, type MemberInfo } from "@/lib/ai/expense-parser"

// 如果沒有 API key，跳過測試
const SKIP_INTEGRATION = !process.env.DEEPSEEK_API_KEY

describe.skipIf(SKIP_INTEGRATION)("parseExpense Integration", () => {
  const members: MemberInfo[] = [
    { id: "member-1", displayName: "小明" },
    { id: "member-2", displayName: "小華" },
    { id: "member-3", displayName: "小美" },
  ]

  it("should parse simple expense: 午餐 280 元", async () => {
    const result = await parseExpense({
      transcript: "午餐吃拉麵 280 元",
      members,
      currentUserName: "小明",
    })

    expect(result.amount).toBe(280)
    expect(result.category).toBe("food")
    expect(result.confidence).toBeGreaterThan(0.5)
  }, 30000)

  it("should parse expense with payer: 小華付的", async () => {
    const result = await parseExpense({
      transcript: "晚餐 500 元，小華付的",
      members,
      currentUserName: "小明",
    })

    expect(result.amount).toBe(500)
    expect(result.payerId).toBe("member-2") // 小華
    expect(result.category).toBe("food")
  }, 30000)

  it("should parse expense with participants: 我跟小美分", async () => {
    const result = await parseExpense({
      transcript: "計程車 200 元，我跟小美分",
      members,
      currentUserName: "小明",
    })

    expect(result.amount).toBe(200)
    expect(result.category).toBe("transport")
    expect(result.participantIds).toContain("member-1") // 小明
    expect(result.participantIds).toContain("member-3") // 小美
    expect(result.participantIds).not.toContain("member-2") // 不含小華
  }, 30000)

  it("should parse expense with everyone: 大家一起分", async () => {
    const result = await parseExpense({
      transcript: "飯店住宿 3000 元，大家一起分",
      members,
      currentUserName: "小明",
    })

    expect(result.amount).toBe(3000)
    expect(result.category).toBe("accommodation")
    expect(result.participantIds).toHaveLength(3) // 全部成員
  }, 30000)

  it("should handle complex input", async () => {
    const result = await parseExpense({
      transcript: "我先付門票錢 1200 塊，小華跟小美要分攤",
      members,
      currentUserName: "小明",
    })

    expect(result.amount).toBe(1200)
    expect(result.payerId).toBe("member-1") // 小明（我）
    expect(result.category).toBe("ticket")
    expect(result.participantIds).toContain("member-2") // 小華
    expect(result.participantIds).toContain("member-3") // 小美
  }, 30000)
})
