import { z } from "zod"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createDeepSeekModel } from "./deepseek"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants/expenses"
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { derivePayerShares, primaryPayerId, type PayerShare } from "@/lib/expense-payers"

export { EXPENSE_CATEGORIES, type ExpenseCategory }

const CURRENCY_CODES = SUPPORTED_CURRENCIES.map(c => c.code) as [string, ...string[]]

/**
 * 單筆費用 Schema（用於 AI 輸出）
 */
const ExpenseItemSchema = z.object({
  amount: z.number().describe("消費金額，只取數字部分"),
  description: z.string().describe("簡短描述消費內容，10字以內"),
  category: z
    .enum(EXPENSE_CATEGORIES)
    .describe("分類：food=餐飲, transport=交通, accommodation=住宿, ticket=票券, shopping=購物, entertainment=娛樂, gift=禮品, other=其他"),
  currency: z
    .enum(CURRENCY_CODES)
    .optional()
    .describe("貨幣代碼：若有提到日圓/円/JPY=JPY, 韓元/韓幣/KRW=KRW, 美金/美元/USD=USD, 台幣/TWD=TWD, 等。若沒提到則不填"),
  payers: z
    .array(
      z.object({
        name: z
          .string()
          .describe("付款人名字；如果說「我付」「我先付」則填入目前用戶名字"),
        amount: z
          .number()
          .optional()
          .describe("這位付款人出的金額；只有在對話中有明確說出該人金額時才填"),
      })
    )
    .describe("這筆費用的付款人清單，可多人；未提及付款人時放入目前用戶一人"),
  participantNames: z
    .array(z.string())
    .describe("這筆費用的分擔者名字陣列，如果說「大家」「全部」則填入所有成員"),
})

/**
 * 多筆費用解析 Schema（AI 輸出格式）
 */
export const ParsedExpensesSchema = z.object({
  expenses: z
    .array(ExpenseItemSchema)
    .describe("解析出的費用列表，每個消費項目一筆，每筆費用有獨立的付款人和分擔者"),
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
  defaultCurrency?: string // 專案預設幣別
}

/**
 * 單筆解析結果（含 ID 對應）
 */
export interface ExpenseItemResult {
  id: string // 前端用的臨時 ID
  amount: number
  description: string
  category: ExpenseCategory
  currency: string // 幣別代碼
  payers: PayerShare[] // 這筆費用的付款人與各自金額（合計 = amount）
  participantIds: string[] // 這筆費用的分擔者 ID 陣列
  selected: boolean // 是否選中要儲存
}

/**
 * 多筆解析結果（含 ID 對應）
 */
export interface ParseExpensesResult {
  expenses: ExpenseItemResult[]
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

5. 每筆費用的付款人（payers）：
   - 特別注意：每筆費用可以有不同的付款人，而且同一筆可以有多位付款人！
   - 「我付 800、小明 480」→ 兩位付款人：目前用戶 amount 800，小明 amount 480
   - 只有「我付」「我先付」「我幫大家付」→ 一位付款人：目前用戶（不填 amount，代表全額）
   - 「XXX 付」「XXX 幫大家付」→ 一位付款人：XXX（不填 amount）
   - 多個名字但沒說各自金額，例如「小明、小華付」→ 多位付款人：小明、小華（都不填 amount，之後均分）
   - 若多筆費用連續出現且只有最後提到付款人，則這些費用共用該付款人
   - 例如「早餐50、午餐60，我幫大家先付」→ 兩筆費用，付款人都是目前用戶
   - 例如「晚餐100，tommy幫大家付」→ 一筆費用，付款人是 tommy
   - 如果沒提到 → 預設為目前用戶一位（全額）

6. 每筆費用的分擔者（participantNames）：
   - 特別注意：每筆費用可以有不同的分擔者！
   - 如果說「大家」「全部」「一起分」「AA」「大家分」→ 填入所有成員
   - 如果說「XXX 幫 A 跟 B 付」→ 分擔者是 A 和 B
   - 如果說「XXX 幫她自己跟 YYY 付」→ 分擔者是 XXX 和 YYY
   - 例如「交通 90, monica 幫她自己跟 tommy 付」→ 分擔者是 monica 和 tommy
   - 如果沒提到分擔者 → 預設所有成員`,
  ],
  ["human", "{transcript}"],
])

/**
 * 建立多筆費用解析 Chain
 */
/* c8 ignore start */
function createExpensesParserChain() {
  const model = createDeepSeekModel({ temperature: 0.1 })
  const structuredModel = model.withStructuredOutput(ParsedExpensesSchema)

  return EXPENSES_PARSER_PROMPT.pipe(structuredModel)
}
/* c8 ignore stop */

/**
 * 解析多筆費用內容
 *
 * @param input 解析輸入
 * @returns 多筆解析結果（含成員 ID 對應）
 */
/* c8 ignore start */
export async function parseExpenses(
  input: ParseExpenseInput
): Promise<ParseExpensesResult> {
  const { transcript, members, currentUserName, defaultCurrency = DEFAULT_CURRENCY } = input

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

  // 轉換費用項目，每筆費用有獨立的付款人和分擔者
  const allMemberIds = members.map((m) => m.id)
  const expenses: ExpenseItemResult[] = parsed.expenses.map((expense, index) => {
    // 將付款人名字轉換為 ID 並推算各自金額
    const payers = resolvePayers(expense.payers ?? [], expense.amount, members, currentUserName)

    // 將分擔者名字轉換為 ID
    const participantIds = mapNamesToIds(expense.participantNames, members)
    // 如果沒有找到任何分擔者，預設全部成員
    const finalParticipantIds = participantIds.length > 0 ? participantIds : allMemberIds

    // 幣別：AI 有解析到就用，否則用專案預設
    const expenseCurrency = expense.currency || defaultCurrency

    return {
      id: `temp-${Date.now()}-${index}`,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      currency: expenseCurrency,
      payers,
      participantIds: finalParticipantIds,
      selected: true, // 預設全部選中
    }
  })

  return {
    expenses,
    confidence: parsed.confidence,
  }
}
/* c8 ignore stop */

/**
 * 解析單筆費用內容（向後相容）
 *
 * @param input 解析輸入
 * @returns 單筆解析結果
 */
/* c8 ignore start */
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
    payerId: primaryPayerId(firstExpense.payers) || null,
    participantIds: firstExpense.participantIds,
    splitMode: "equal",
    confidence: result.confidence,
  }
}
/* c8 ignore stop */

/**
 * 單一 parsed 付款人（AI 原始輸出，名字 + 選填金額）
 */
export interface ParsedPayer {
  name: string
  amount?: number
}

/**
 * 將 AI 解析出的付款人名字對應到成員 ID 並推算金額。
 *
 * - 有提供金額者視為指定（pin），其餘付款人均分剩餘金額
 * - 多位付款人都沒提供金額 → 全額均分
 * - 完全沒提到付款人 → 目前用戶單獨付全額
 * - 若 AI 提供的金額合計超過支出金額，退回全額均分，讓使用者可在確認步驟修正
 *
 * 金額運算重用 lib/expense-payers.ts，確保與表單／伺服器一致。
 */
export function resolvePayers(
  parsed: ParsedPayer[],
  amount: number,
  members: MemberInfo[],
  currentUserName: string
): PayerShare[] {
  const ordered: { memberId: string; amount?: number }[] = []
  for (const payer of parsed) {
    const memberId = findMemberIdByName(payer.name, members, currentUserName)
    if (!memberId) continue
    const existing = ordered.find((p) => p.memberId === memberId)
    if (existing) {
      // 同一位成員被提到兩次：補上遺漏的金額，順序以第一次為準。
      if (existing.amount == null && payer.amount != null) existing.amount = payer.amount
      continue
    }
    ordered.push({ memberId, amount: payer.amount })
  }

  let payerIds = ordered.map((p) => p.memberId)
  if (payerIds.length === 0) {
    // 完全沒提到付款人 → 目前用戶單獨付全額（找不到時退回第一位成員）。
    const current = members.find((m) => m.displayName === currentUserName) ?? members[0]
    if (!current) return []
    payerIds = [current.id]
  }

  const pinned: Record<string, number> = {}
  for (const payer of ordered) {
    if (typeof payer.amount === "number" && Number.isFinite(payer.amount)) {
      pinned[payer.memberId] = payer.amount
    }
  }

  const result = derivePayerShares({ amount, payerIds, pinned })
  if (result.ok) return result.shares
  // 解析出的金額加總超過支出金額：退回均分，避免產生無法儲存的付款清單。
  return derivePayerShares({ amount, payerIds, pinned: {} }).shares
}

/**
 * 根據名字查找成員 ID
 */
export function findMemberIdByName(
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
export function mapNamesToIds(names: string[], members: MemberInfo[]): string[] {
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
