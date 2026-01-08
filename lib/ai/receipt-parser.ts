import { z } from "zod"
import { HumanMessage } from "@langchain/core/messages"
import { createGeminiModel } from "./gemini"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants/expenses"

/**
 * 發票/收據解析結果 Schema
 */
export const ParsedReceiptSchema = z.object({
  amount: z.number().describe("總金額，只取數字部分"),
  description: z.string().describe("商家名稱或消費描述，10字以內"),
  category: z
    .enum(EXPENSE_CATEGORIES)
    .describe("分類：food=餐飲, transport=交通, accommodation=住宿, ticket=票券, shopping=購物, entertainment=娛樂, gift=禮品, other=其他"),
  date: z
    .string()
    .nullable()
    .describe("發票日期，YYYY-MM-DD 格式，無法辨識則為 null"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("AI 對解析結果的信心度 0-1"),
})

export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>

/**
 * 解析發票/收據圖片的 Prompt
 */
const RECEIPT_PARSER_PROMPT = `你是一個發票/收據解析助手。請仔細分析這張圖片，提取以下資訊：

## 解析規則

1. **金額**：
   - 找出總金額（通常標示為「合計」「總計」「Total」「應付金額」）
   - 只取數字部分，忽略貨幣符號
   - 如果有多個金額，選擇最終的應付金額

2. **描述**：
   - 優先使用商家名稱（通常在發票最上方）
   - 如果找不到商家名稱，使用主要消費品項
   - 控制在 10 字以內

3. **類別**（根據內容判斷最適合的分類）：
   - food：餐廳、飲料、食品、便利商店食物
   - transport：交通、加油、停車、計程車、高鐵、捷運
   - accommodation：住宿、旅館、民宿
   - ticket：門票、票券、電影票
   - shopping：購物、服飾、3C、日用品
   - entertainment：娛樂、KTV、遊戲
   - gift：禮品、禮物
   - other：無法歸類的其他消費

4. **日期**：
   - 找出發票上的日期
   - 轉換為 YYYY-MM-DD 格式
   - 如果無法辨識，回傳 null

5. **信心度**：
   - 1.0：圖片清晰，所有資訊都能確定
   - 0.7-0.9：大部分資訊清晰，少數需要推測
   - 0.4-0.6：圖片模糊或部分遮擋，需要較多推測
   - 0.1-0.3：圖片非常模糊或不是發票/收據

請以 JSON 格式回覆（只回傳 JSON，不要其他文字）：
{
  "amount": number,
  "description": "string",
  "category": "food|transport|accommodation|ticket|shopping|entertainment|gift|other",
  "date": "YYYY-MM-DD" | null,
  "confidence": number
}`

/**
 * 解析發票/收據圖片
 *
 * @param imageData 圖片 base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @returns 解析結果
 */
/* c8 ignore start */
export async function parseReceipt(imageData: string): Promise<ParsedReceipt> {
  if (!imageData) {
    throw new Error("請提供圖片資料")
  }

  const model = createGeminiModel({ temperature: 0.1, maxOutputTokens: 512 })

  // 建立包含圖片的訊息
  const message = new HumanMessage({
    content: [
      {
        type: "text",
        text: RECEIPT_PARSER_PROMPT,
      },
      {
        type: "image_url",
        image_url: {
          url: imageData,
        },
      },
    ],
  })

  const response = await model.invoke([message])

  // 解析回應內容
  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content)

  // 嘗試提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("無法解析 AI 回應")
  }

  const parsed = JSON.parse(jsonMatch[0])

  // 驗證並返回結果
  const result = ParsedReceiptSchema.parse(parsed)

  return result
}
/* c8 ignore stop */

/**
 * 根據類別取得中文名稱
 */
export function getCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    food: "餐飲",
    transport: "交通",
    accommodation: "住宿",
    ticket: "票券",
    shopping: "購物",
    entertainment: "娛樂",
    gift: "禮品",
    other: "其他",
  }
  return labels[category] || "其他"
}
