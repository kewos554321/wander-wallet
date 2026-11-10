import { z } from "zod"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createDeepSeekModel } from "./deepseek"
import { EXPENSE_CATEGORIES } from "@/lib/constants/expenses"

/**
 * AI 類別分類結果 Schema
 */
export const CategoryClassificationSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).describe("最適合的支出類別"),
  confidence: z.number().min(0).max(1).describe("分類信心度 0-1"),
})

export type CategoryClassification = z.infer<typeof CategoryClassificationSchema>

const CATEGORY_CLASSIFIER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一個記帳分類助手。根據使用者提供的消費描述，選出最適合的類別。

## 類別定義
- food：餐飲、餐廳、飲料、咖啡、小吃、便利商店食物
- transport：交通、計程車、捷運、高鐵、公車、加油、停車
- accommodation：住宿、旅館、飯店、民宿
- ticket：門票、票券、電影票、展覽票
- shopping：購物、服飾、3C、日用品、伴手禮
- entertainment：娛樂、KTV、遊戲、活動
- gift：禮品、禮物、送人的東西
- other：無法歸類的其他消費

## 規則
1. 只選一個最適合的類別。
2. 描述不明確或資訊不足時，選 other。
3. confidence 反映你對這個分類的信心程度（0-1）。`,
  ],
  ["human", "{description}"],
])

/* c8 ignore start */
function createCategoryClassifierChain() {
  const model = createDeepSeekModel({ temperature: 0, maxTokens: 64 })
  return CATEGORY_CLASSIFIER_PROMPT.pipe(model.withStructuredOutput(CategoryClassificationSchema))
}
/* c8 ignore stop */

/**
 * 根據消費描述判斷支出類別。
 *
 * @param description 使用者輸入的消費描述
 * @returns AI 判斷的類別與信心度
 */
export async function classifyExpenseCategory(description: string): Promise<CategoryClassification> {
  const text = description.trim()
  if (!text) {
    throw new Error("請提供描述")
  }

  return createCategoryClassifierChain().invoke({ description: text })
}
