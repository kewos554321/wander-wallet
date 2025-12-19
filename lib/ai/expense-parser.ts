import { z } from "zod"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createDeepSeekModel } from "./deepseek"

/**
 * 費用類別列表
 */
export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "accommodation",
  "ticket",
  "shopping",
  "entertainment",
  "gift",
  "other",
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * 單筆費用 Schema（用於 AI 輸出）
 */
const ExpenseItemSchema = z.object({
  amount: z.number().describe("消費金額，只取數字部分"),
  description: z.string().describe("簡短描述消費內容，10字以內"),
  category: z
    .enum(EXPENSE_CATEGORIES)
    .describe("分類：food=餐飲, transport=交通, accommodation=住宿, ticket=票券, shopping=購物, entertainment=娛樂, gift=禮品, other=其他"),
})

/**
 * 多筆費用解析 Schema（AI 輸出格式）
 */
export const ParsedExpensesSchema = z.object({
  expenses: z
    .array(ExpenseItemSchema)
    .describe("解析出的費用列表，每個消費項目一筆"),
  sharedContext: z.object({
    payerName: z
      .string()
      .describe("付款人名字，如果說「我付」「我先付」則填入目前用戶名字"),
    participantNames: z
      .array(z.string())
      .describe("分擔者名字陣列，如果說「大家」「全部」「一起」則填入所有成員"),
    splitMode: z
      .enum(["equal", "custom"])
      .describe("分帳方式：equal=均分, custom=自訂金額"),
  }).describe("所有費用共用的付款與分擔資訊"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("AI 對解析結果的信心度 0-1"),
})

export type ParsedExpenses = z.infer<typeof ParsedExpensesSchema>

/**
 * 成員資訊
 */
export interface MemberInfo {
  id: string
  displayName: string
}

/**
 * 解析輸入參數
 */
export interface ParseExpenseInput {
  transcript: string
  members: MemberInfo[]
  currentUserName: string
}

/**
 * 單筆解析結果（含 ID 對應）
 */
export interface ExpenseItemResult {
  id: string // 前端用的臨時 ID
  amount: number
  description: string
  category: ExpenseCategory
  selected: boolean // 是否選中要儲存
}

/**
 * 多筆解析結果（含 ID 對應）
 */
export interface ParseExpensesResult {
  expenses: ExpenseItemResult[]
  sharedContext: {
    payerId: string | null
    participantIds: string[]
    splitMode: "equal" | "custom"
  }
  confidence: number
}

/**
 * 舊版單筆解析結果（向後相容）
 */
export interface ParseExpenseResult {
  amount: number
  description: string
  category: ExpenseCategory
  payerId: string | null
  participantIds: string[]
  splitMode: "equal" | "custom"
  confidence: number
}

/**
 * 多筆費用解析 Prompt 模板
 */
const EXPENSES_PARSER_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一個費用解析助手。根據用戶描述的消費內容，提取一筆或多筆費用資訊。

## 成員列表
{memberList}

## 目前用戶
{currentUserName}

## 解析規則
1. 費用項目：
   - 仔細識別文字中的每一筆消費
   - 每個獨立的消費項目（有金額的）都要拆成一筆
   - 例如「午餐 280、計程車 150」→ 兩筆費用
   - 例如「買了咖啡和蛋糕共 200 元」→ 一筆費用（因為是合計）

2. 金額：只提取數字，忽略貨幣符號

3. 描述：簡短概括，10字以內

4. 類別：根據內容判斷最適合的分類

5. 付款人（共用）：
   - 如果說「我付」「我先付」「我請」→ 填入目前用戶名字
   - 如果提到其他成員名字 → 填入該成員名字
   - 如果沒提到 → 預設為目前用戶

6. 分擔者（共用）：
   - 如果說「大家」「全部」「一起分」「AA」→ 填入所有成員
   - 如果提到特定人名 → 只填入提到的人
   - 如果沒提到 → 預設所有成員

7. 分帳方式：預設為 equal（均分）`,
  ],
  ["human", "{transcript}"],
])

/**
 * 建立多筆費用解析 Chain
 */
function createExpensesParserChain() {
  const model = createDeepSeekModel({ temperature: 0.1 })
  const structuredModel = model.withStructuredOutput(ParsedExpensesSchema)

  return EXPENSES_PARSER_PROMPT.pipe(structuredModel)
}

/**
 * 解析多筆費用內容
 *
 * @param input 解析輸入
 * @returns 多筆解析結果（含成員 ID 對應）
 */
export async function parseExpenses(
  input: ParseExpenseInput
): Promise<ParseExpensesResult> {
  const { transcript, members, currentUserName } = input

  if (!transcript.trim()) {
    throw new Error("請輸入或說出消費內容")
  }

  if (members.length === 0) {
    throw new Error("專案沒有成員")
  }

  const chain = createExpensesParserChain()

  const memberList = members.map((m) => m.displayName).join("、")

  const parsed = await chain.invoke({
    transcript,
    memberList,
    currentUserName,
  })

  // 將名字轉換為 ID
  const payerId = findMemberIdByName(
    parsed.sharedContext.payerName,
    members,
    currentUserName
  )
  const participantIds = mapNamesToIds(
    parsed.sharedContext.participantNames,
    members
  )

  // 如果沒有找到任何分擔者，預設全部成員
  const finalParticipantIds =
    participantIds.length > 0 ? participantIds : members.map((m) => m.id)

  // 轉換費用項目，加上臨時 ID
  const expenses: ExpenseItemResult[] = parsed.expenses.map((expense, index) => ({
    id: `temp-${Date.now()}-${index}`,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    selected: true, // 預設全部選中
  }))

  return {
    expenses,
    sharedContext: {
      payerId,
      participantIds: finalParticipantIds,
      splitMode: parsed.sharedContext.splitMode,
    },
    confidence: parsed.confidence,
  }
}

/**
 * 解析單筆費用內容（向後相容）
 *
 * @param input 解析輸入
 * @returns 單筆解析結果
 */
export async function parseExpense(
  input: ParseExpenseInput
): Promise<ParseExpenseResult> {
  const result = await parseExpenses(input)

  // 取第一筆費用
  const firstExpense = result.expenses[0]

  if (!firstExpense) {
    throw new Error("無法解析費用內容")
  }

  return {
    amount: firstExpense.amount,
    description: firstExpense.description,
    category: firstExpense.category,
    payerId: result.sharedContext.payerId,
    participantIds: result.sharedContext.participantIds,
    splitMode: result.sharedContext.splitMode,
    confidence: result.confidence,
  }
}

/**
 * 根據名字查找成員 ID
 */
function findMemberIdByName(
  name: string,
  members: MemberInfo[],
  currentUserName: string
): string | null {
  // 先嘗試精確匹配
  const exactMatch = members.find((m) => m.displayName === name)
  if (exactMatch) return exactMatch.id

  // 嘗試部分匹配
  const partialMatch = members.find(
    (m) =>
      m.displayName.includes(name) || name.includes(m.displayName)
  )
  if (partialMatch) return partialMatch.id

  // 如果是「我」相關的詞，找目前用戶
  if (["我", "自己", "本人"].some((w) => name.includes(w))) {
    const currentUser = members.find((m) => m.displayName === currentUserName)
    if (currentUser) return currentUser.id
  }

  // 預設返回第一個成員（通常是目前用戶）
  return members[0]?.id || null
}

/**
 * 將名字陣列轉換為 ID 陣列
 */
function mapNamesToIds(names: string[], members: MemberInfo[]): string[] {
  const ids: string[] = []

  for (const name of names) {
    const member = members.find(
      (m) =>
        m.displayName === name ||
        m.displayName.includes(name) ||
        name.includes(m.displayName)
    )
    if (member && !ids.includes(member.id)) {
      ids.push(member.id)
    }
  }

  return ids
}

// 匯出舊版 Schema（向後相容）
export const ParsedExpenseSchema = z.object({
  amount: z.number(),
  description: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  payerName: z.string(),
  participantNames: z.array(z.string()),
  splitMode: z.enum(["equal", "custom"]),
  confidence: z.number().min(0).max(1),
})

export type ParsedExpense = z.infer<typeof ParsedExpenseSchema>
