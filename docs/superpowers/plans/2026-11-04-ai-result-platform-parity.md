# AI 辨識結果共用新增支出表單 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 AI 快速記帳的確認頁與新增支出共用同一套 draft state、表單欄位、驗證與 payload，同時保留 AI 的多筆導覽與批次新增。

**Architecture:** 先把 `useExpenseDraft` 的表單核心抽成純模組 `lib/expense-draft.ts`，再把 `ExpenseFormPlatformView` 的欄位抽成 `ExpenseFormFields`。AI 的 `QuickItem` 改成 `DraftState & { id }`，確認頁用同一個核心組出 `Draft` 後渲染 `ExpenseFormFields`；外殼（AI header、1/N、滑動、批次 footer）各自保留。最後兩邊共用 `buildExpensePayload`。

**Tech Stack:** Next.js 16、React 19、TypeScript 5、Tailwind v4、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-11-04-ai-result-platform-parity-design.md`

## Global Constraints

- 只改 v2（`components/v2/**`、`lib/**`、`app/demo/**`、`tests/**`）；v1 表單不得修改。
- UI 文案用繁體中文；程式註解與識別字用英文。
- 不新增 `any`；`npx tsc --noEmit` 必須通過。
- 不改支出 API payload 欄位、資料模型、分帳數學。
- 不提交與本計畫無關的既有改動（目前工作區有 `app/demo/page.tsx`、`.impeccable/**`、`app/demo/ui-consistency/**`）。
- 每個 task 結束都要跑該 task 指定的測試，並確認既有 `tests/components/v2/expense-form-v2-view.test.tsx` 沒有退化。

## Review Focus

- AI 回傳沒有描述時，確認頁應像新增支出一樣擋下儲存並顯示「請填寫描述，讓大家知道這筆是什麼」，而不是存成 `null`。
- AI 回傳外幣但匯率尚未載入或抓取失敗時，金額與分攤不可默默用 0 或 1 計算；應沿用新增支出的 rate sheet／錯誤狀態。
- AI 回傳的付款金額加總不等於支出金額時，必須顯示與新增支出相同的付款錯誤，且不可送出。
- 批次儲存部分成功後，畫面只保留未儲存項目；重試不可重複建立已成功項目，LINE 通知也只送一次。
- 收據圖片在 AI 流程中先以 object URL 預覽，切換／移除／離開相機後不可留下失效 URL 或重複上傳。

---

### Task 1: 抽出 draft core

**Files:**
- Create: `lib/expense-draft.ts`
- Modify: `components/v2/expense-form/use-expense-draft.ts`
- Modify: `components/v2/expense-form/split-guardrails.ts`（只改 type import）
- Test: `tests/lib/expense-draft.test.ts`

**Interfaces:**
- Produces:
  - `DraftState`、`DraftActions`、`DraftDerived`、`Draft`、`DraftItem`、`DraftMember`、`DraftExpense`、`DraftInit`
  - `initialState(init: DraftInit): DraftState`
  - `createDraftActions(setState: (updater: (state: DraftState) => DraftState) => void, members: DraftMember[]): DraftActions`
  - `deriveParticipantOrder(init: DraftInit): string[]`
  - `deriveExpenseDraft(input: { state: DraftState; members: DraftMember[]; projectCurrency: string; participantOrder: string[]; previewRateInfo?: (currency: string) => PreviewRateInfo }): DraftDerived`
- Consumes: `lib/split-draft`、`lib/expense-split`、`lib/expense-payers` 既有函式。
- `use-expense-draft.ts` 必須繼續匯出 `DraftInit`、`DraftMember`、`DraftItem`、`useExpenseDraft`，讓既有 import 不必一次全改。

- [ ] **Step 1: 寫失敗測試**

建立 `tests/lib/expense-draft.test.ts`：

```ts
import { describe, it, expect } from "vitest"
import {
  createDraftActions,
  deriveExpenseDraft,
  initialState,
  type DraftInit,
} from "@/lib/expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]
const init: DraftInit = { members, currency: "TWD", paidBy: "a" }

describe("initialState", () => {
  it("seeds a new expense from the payer", () => {
    const state = initialState(init)
    expect(state.amount).toBe("")
    expect(state.payerIds).toEqual(["a"])
    expect(state.pool).toEqual(["a"])
    expect(state.description).toBe("")
    expect(state.notifyLine).toBe(true)
  })
})

describe("createDraftActions", () => {
  it("applies sequential updates through one functional updater", () => {
    let state = initialState(init)
    const actions = createDraftActions((updater) => { state = updater(state) }, members)
    actions.setAmount("100")
    actions.setDescription("午餐")
    actions.togglePool("b")
    expect(state.amount).toBe("100")
    expect(state.description).toBe("午餐")
    expect(state.pool).toEqual(["a", "b"])
  })
})

describe("deriveExpenseDraft", () => {
  it("derives an equal split that sums to the amount", () => {
    const base = initialState(init)
    const state = { ...base, amount: "100", pool: ["a", "b"] }
    const draft = deriveExpenseDraft({
      state,
      members,
      projectCurrency: "TWD",
      participantOrder: ["a", "b"],
    })
    expect(draft.splitInput.amount).toBe(100)
    expect(draft.shares.map((s) => s.shareAmount)).toEqual([50, 50])
    expect(draft.error).toBeNull()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/lib/expense-draft.test.ts`
Expected: FAIL，`Cannot find module '@/lib/expense-draft'`。

- [ ] **Step 3: 建立 `lib/expense-draft.ts`**

把 `use-expense-draft.ts` 的型別、`initialState`、actions、participant order 與 `derived` 計算搬過來；`deriveExpenseDraft` 的內容就是目前 `useMemo` 內的運算。`createDraftActions` 的每個 action 都必須用 `setState((s) => ...)` 形式，讓外部 state 能安全連續更新。

- [ ] **Step 4: 改寫 `use-expense-draft.ts`**

保留同名 hook，實作改成：

```ts
export function useExpenseDraft(init: DraftInit, previewRateInfo?: (currency: string) => PreviewRateInfo): Draft {
  const [state, setState] = useState(() => initialState(init))
  const actions = useMemo(() => createDraftActions((updater) => setState(updater), init.members), [init.members])
  const participantOrder = useMemo(() => deriveParticipantOrder(init), [init.expense, init.members])
  const projectCurrency = init.projectCurrency ?? init.currency
  const derived = useMemo(
    () => deriveExpenseDraft({ state, members: init.members, projectCurrency, participantOrder, previewRateInfo }),
    [state, init.members, projectCurrency, participantOrder, previewRateInfo],
  )
  return { state, actions, derived }
}
```

同時 `export type { Draft, DraftActions, DraftDerived, DraftExpense, DraftInit, DraftItem, DraftMember, DraftState } from "@/lib/expense-draft"`。

- [ ] **Step 5: 更新 `split-guardrails.ts` 的 type import**

把 `type Draft = ReturnType<typeof useExpenseDraft>` 改成：

```ts
import type { Draft, DraftMember } from "@/lib/expense-draft"
```

- [ ] **Step 6: 執行測試**

Run: `npx vitest run tests/lib/expense-draft.test.ts tests/components/v2/expense-form-v2-view.test.tsx`
Expected: PASS。既有表單行為不變。

- [ ] **Step 7: Commit**

```bash
git add lib/expense-draft.ts components/v2/expense-form/use-expense-draft.ts components/v2/expense-form/split-guardrails.ts tests/lib/expense-draft.test.ts
git commit -m "refactor(expense): extract the draft core from the form hook"
```

---

### Task 2: 抽出共用欄位與驗證 helper

**Files:**
- Create: `components/v2/expense-form/expense-form-fields.tsx`
- Modify: `components/v2/expense-form/expense-form-platform-view.tsx`
- Modify: `components/v2/expense-form/split-guardrails.ts`
- Test: `tests/components/v2/expense-form-fields.test.tsx`
- Test: `tests/components/v2/expense-form/split-guardrails.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `Draft`、`DraftMember`。
- Produces:
  - `ExpenseFormFields(props: ExpenseFormFieldsProps)`
  - `amountIssueFor(amount: string, currency: string): string | null`
  - `expenseFormIssues(draft: Draft, members: DraftMember[]): { amountIssue: string | null; splitIssue: string | null; blockingError: string | null; descMissing: boolean }`

`ExpenseFormFieldsProps`：

```ts
export interface ExpenseFormFieldsProps {
  draft: Draft
  members: DraftMember[]
  projectCurrency?: string
  displayCurrency?: string
  previewRateInfo?: (currency: string) => PreviewRateInfo
  rateContext?: (currency: string) => { liveRate: number | null; liveTimestamp: number | null }
  recentRates?: (currency: string) => RecentRate[]
  showNotifyLine?: boolean
  notifyLineLabel?: string
  mode?: "create" | "edit" | "quick"
}
```

- [ ] **Step 1: 寫失敗測試**

建立 `tests/components/v2/expense-form-fields.test.tsx`，用最小 `Draft` fixture 渲染：

```tsx
it("renders the required description marker", () => {
  render(<ExpenseFormFields draft={draft} members={members} />)
  expect(screen.getByText(/描述/)).toBeInTheDocument()
  expect(screen.getByText("*")).toBeInTheDocument()
})

it("hides the LINE checkbox when showNotifyLine is false", () => {
  render(<ExpenseFormFields draft={draft} members={members} showNotifyLine={false} />)
  expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
})

it("writes amount edits back through the draft actions", () => {
  const setAmount = vi.fn()
  render(<ExpenseFormFields draft={{ ...draft, actions: { ...draft.actions, setAmount } }} members={members} />)
  fireEvent.change(screen.getByLabelText("金額"), { target: { value: "120" } })
  expect(setAmount).toHaveBeenCalled()
})
```

（實際的 `draft` fixture 用 `initialState` + `createDraftActions` 建立，避免手寫整份 state。）

在 `tests/components/v2/expense-form/split-guardrails.test.ts` 補：

```ts
it("reports an empty or non-positive amount", () => {
  expect(amountIssueFor("", "TWD")).toBe("請輸入金額")
  expect(amountIssueFor("0", "TWD")).toBe("金額必須大於 0")
  expect(amountIssueFor("12", "TWD")).toBeNull()
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/components/v2/expense-form-fields.test.tsx tests/components/v2/expense-form/split-guardrails.test.ts`
Expected: FAIL，找不到 `ExpenseFormFields` / `amountIssueFor`。

- [ ] **Step 3: 建立 `ExpenseFormFields`**

把 `ExpenseFormPlatformView` 中「金額卡 → rate sheet → 描述 → 類別 → SplitPanel → 選填 → LINE」整段搬進來；保留原本的 local UI state（`showCalculator`、`rateOpen`、`optionalOpen`、`amountNote`、`descTouched`、`useImageSource`）。`displayCurrency` 直接傳給 `SplitPanel`。LINE 區塊只在 `showNotifyLine` 為 true 時渲染。

- [ ] **Step 4: 改寫 `ExpenseFormPlatformView`**

只留 topbar、`<ExpenseFormFields />`、footer 高度量測、footer（含顯示幣別切換與 submit）。footer 的錯誤改用 `expenseFormIssues(draft, members)`；`descMissing` 也從這個 helper 取。

- [ ] **Step 5: 執行測試**

Run: `npx vitest run tests/components/v2/expense-form-fields.test.tsx tests/components/v2/expense-form/split-guardrails.test.ts tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/expense-form-platform-view.test.tsx`
Expected: PASS。正式表單畫面與行為維持不變。

- [ ] **Step 6: Commit**

```bash
git add components/v2/expense-form/expense-form-fields.tsx components/v2/expense-form/expense-form-platform-view.tsx components/v2/expense-form/split-guardrails.ts tests/components/v2/expense-form-fields.test.tsx tests/components/v2/expense-form/split-guardrails.test.ts
git commit -m "refactor(expense): extract shared form fields and validation"
```

---

### Task 3: AI draft 遷移到 `DraftState`

**Files:**
- Modify: `lib/quick-expense/draft.ts`
- Modify: `lib/quick-expense/parse.ts`
- Modify: `app/demo/_data/fixtures.ts`（若 fixture 直接建立 `QuickItem`）
- Test: `tests/lib/quick-expense/draft.test.ts`
- Test: `tests/lib/quick-expense/parse.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `DraftState`、`DraftMember`、`deriveExpenseDraft`、`expenseFormIssues`。
- Produces:
  - `export type QuickItem = DraftState & { id: string }`
  - `parsedToQuickItems(results: ExpenseItemResult[], ctx: { today?: Date }): QuickItem[]`
  - `receiptToQuickItem(result: ReceiptResult, ctx: { currency: string; payerId: string; memberIds: string[]; file: File; preview: string; today?: Date }): QuickItem`
  - `validateItems(items: QuickItem[], members: { id: string; displayName: string }[]): { index: number; message: string } | null`
  - `itemTotals(items: QuickItem[]): { currency: string; total: number }[]`

移除 `fromParsed`、`receiptToItem`、`itemDerivedPayers`；付款人推導改用 `deriveExpenseDraft(...).payers`。

- [ ] **Step 1: 改寫失敗測試**

把 `tests/lib/quick-expense/draft.test.ts` 的 import 改成新 API，並補：

```ts
it("maps an AI result into the shared draft shape", () => {
  const [q] = parsedToQuickItems([base], new Date("2026-09-28T10:00:00Z"))
  expect(q).toMatchObject({
    id: "x",
    amount: "100",
    pool: ["a", "b"],
    payerIds: ["a"],
    location: { location: null, latitude: null, longitude: null },
    personalMode: false,
    customShares: {},
  })
  expect("participantIds" in q).toBe(false)
})

it("keeps the AI batch message prefix", () => {
  expect(validateItems([item({ amount: "" })], members)).toEqual({ index: 0, message: "第 1 筆請輸入有效金額" })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/lib/quick-expense/draft.test.ts`
Expected: FAIL，`parsedToQuickItems` 不存在或形狀不符。

- [ ] **Step 3: 改寫 `lib/quick-expense/draft.ts`**

用 `DraftState` 的欄位直接組 item；`initialState` 不適用（AI 有自己的預設），所以建立 `EMPTY_QUICK_DRAFT` 常數或 helper 補齊 `notifyLine`、`rateKind`、`rateDate`、`location`、`exchangeRate` 等欄位。

`validateItems` 對每筆建立 `Draft`：

```ts
const draft: Draft = {
  state: item,
  actions: createDraftActions(() => {}, members),
  derived: deriveExpenseDraft({
    state: item,
    members,
    projectCurrency: item.currency,
    participantOrder: members.map((m) => m.id),
  }),
}
const issues = expenseFormIssues(draft, members)
```

若 `issues.blockingError` 或 `issues.descMissing`，回傳 `{ index: i, message: \`第 ${i + 1} 筆${issues.blockingError ?? "請填寫描述"}\` }`。既有訊息文字（付款、分攤、個人項目）要保留，測試會鎖定。

- [ ] **Step 4: 更新 `lib/quick-expense/parse.ts`**

`parseText` 保持回傳 `ExpenseItemResult[]`；刪除 `receiptToItem`，改由 `receiptToQuickItem` 負責映射。`parseReceipt` 不變。

- [ ] **Step 5: 更新 fixtures**

把 `app/demo/_data/fixtures.ts` 內直接建立 `QuickItem` 的地方改成 `parsedToQuickItems(...)` 或補上新的 `pool`、`location` 巢狀欄位。

- [ ] **Step 6: 執行測試**

Run: `npx vitest run tests/lib/quick-expense/draft.test.ts tests/lib/quick-expense/parse.test.ts tests/demo/fixtures.test.ts`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add lib/quick-expense/draft.ts lib/quick-expense/parse.ts app/demo/_data/fixtures.ts tests/lib/quick-expense/draft.test.ts tests/lib/quick-expense/parse.test.ts
git commit -m "refactor(quick-expense): store AI items as the shared draft state"
```

---

### Task 4: AI 確認頁改用 `<ExpenseFormFields>`

**Files:**
- Modify: `components/v2/quick-expense/quick-item-card.tsx`
- Modify: `components/v2/quick-expense/confirm-step.tsx`
- Modify: `components/v2/quick-expense/quick-expense-v2.tsx`
- Modify: `app/demo/quick-expense/page.tsx`
- Test: `tests/components/v2/quick-expense/quick-item-card.test.tsx`
- Test: `tests/components/v2/quick-expense/confirm-step.test.tsx`
- Test: `tests/components/v2/quick-expense/quick-expense-v2.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `ExpenseFormFields`；Task 3 的 `QuickItem`。
- Produces:
  - `QuickItemCard({ item, members, onChange, projectCurrency, displayCurrency, previewRateInfo, rateContext, recentRates })`
  - `onChange: (updater: (state: DraftState) => DraftState) => void`

`ConfirmStep` 不再接受 `onItemsChange: (items: QuickItem[]) => void` 來回寫整批；改成：

```ts
onItemChange: (index: number, updater: (state: DraftState) => DraftState) => void
```

刪除、重新輸入、批次送出仍由 `ConfirmStep` 呼叫上層 callback。

- [ ] **Step 1: 改寫失敗測試**

`quick-item-card.test.tsx` 改成用新的 `QuickItem` fixture，保留原有行為斷言（金額、描述、類別、付款、分攤、日期、地點、圖片、外幣匯率），並新增：

```tsx
it("renders the shared platform split panel", () => {
  render(<QuickItemCard {...props} />)
  expect(screen.getByText("誰付這筆")).toBeInTheDocument()
  expect(screen.getByText("誰一起分")).toBeInTheDocument()
})

it("writes edits back through the functional updater", () => {
  const onChange = vi.fn((updater) => updater(item))
  render(<QuickItemCard {...props} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText("描述"), { target: { value: "晚餐" } })
  expect(onChange).toHaveBeenCalled()
})
```

`confirm-step.test.tsx` 的 `onItemsChange` 改成 `onItemChange`，行為斷言不變。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/components/v2/quick-expense/quick-item-card.test.tsx tests/components/v2/quick-expense/confirm-step.test.tsx`
Expected: FAIL，props 型別或 DOM 不符。

- [ ] **Step 3: 改寫 `QuickItemCard`**

```tsx
export function QuickItemCard({ item, members, onChange, ...context }: Props) {
  const actions = useMemo(
    () => createDraftActions((updater) => onChange(updater), members),
    [members, onChange],
  )
  const derived = useMemo(
    () => deriveExpenseDraft({
      state: item,
      members,
      projectCurrency: context.projectCurrency ?? item.currency,
      participantOrder: members.map((m) => m.id),
      previewRateInfo: context.previewRateInfo,
    }),
    [item, members, context.projectCurrency, context.previewRateInfo],
  )
  return <ExpenseFormFields draft={{ state: item, actions, derived }} members={members} {...context} showNotifyLine={false} mode="quick" />
}
```

- [ ] **Step 4: 更新 `ConfirmStep` 與 `QuickExpenseFlow`**

- `ConfirmStep` 的 `patch` 改成呼叫 `onItemChange(index, (s) => ({ ...s, ...p }))`。
- `handleItemsChange` 改成 `handleItemChange(index, updater)`，用 `setItems(prev => prev.map((it, i) => i === index ? updater(it) : it))`。
- `quick-expense-v2.tsx` 補上 `rateContext`（用 `ratesTimestamp`）與 `recentRates`（quick 流程沒有歷史匯率，傳 `() => []`）。
- 收據流程改成 `receiptToQuickItem`。
- `app/demo/quick-expense/page.tsx` 的 `onItemsChange` 改成 `onItemChange`。

- [ ] **Step 5: 執行測試**

Run: `npx vitest run tests/components/v2/quick-expense tests/demo/quick-expense-page.test.tsx`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add components/v2/quick-expense app/demo/quick-expense/page.tsx tests/components/v2/quick-expense tests/demo/quick-expense-page.test.tsx
git commit -m "feat(quick-expense): render the shared expense form fields"
```

---

### Task 5: 共用 payload 與儲存

**Files:**
- Create: `lib/expense-payload.ts`
- Modify: `lib/hooks/useSaveExpense.ts`
- Modify: `components/v2/expense-form/expense-form-v2.tsx`
- Modify: `lib/quick-expense/use-quick-save.ts`
- Test: `tests/lib/expense-payload.test.ts`
- Test: `tests/lib/quick-expense/use-quick-save.test.ts`

**Interfaces:**
- Produces: `ExpensePayload`、`buildExpensePayload(draft: Draft): ExpensePayload`。
- `useSaveExpense.ts` 改從 `lib/expense-payload` import `ExpensePayload`，並保留 `export type { ExpensePayload }` 以免既有 import 壞掉。

- [ ] **Step 1: 寫失敗測試**

建立 `tests/lib/expense-payload.test.ts`：

```ts
it("builds the same payload the create form sent", () => {
  const draft = makeDraft({ amount: "1280", currency: "JPY", exchangeRate: "0.21", ratePinned: true, rateKind: "custom" })
  expect(buildExpensePayload(draft)).toMatchObject({
    amount: 1280,
    currency: "JPY",
    exchangeRate: 0.21,
    rateKind: "custom",
    description: "晚餐",
    category: "food",
    participants: [{ memberId: "a", shareAmount: 640 }, { memberId: "b", shareAmount: 640 }],
  })
})

it("omits exchangeRate when the rate is not pinned", () => {
  const draft = makeDraft({ exchangeRate: "", ratePinned: false })
  expect(buildExpensePayload(draft).exchangeRate).toBeUndefined()
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/lib/expense-payload.test.ts`
Expected: FAIL，找不到 `buildExpensePayload`。

- [ ] **Step 3: 建立 `lib/expense-payload.ts`**

把 `useSaveExpense.ts` 的 `ExpensePayload` 介面搬過來，實作 `buildExpensePayload`，內容與目前 `expense-form-v2.tsx` 的 `handleSubmit` payload 完全一致。

- [ ] **Step 4: 改兩邊的儲存流程**

- `expense-form-v2.tsx`：payload 改成 `buildExpensePayload(draft)`，其餘（`image`、`notification`、`changes`）不變。
- `use-quick-save.ts`：每筆改成 `buildExpensePayload({ state: item, actions: noopActions, derived: deriveExpenseDraft(...) })`，再附上上傳後的 `image`。通知摘要可用同一個 `derived`。
- `useSaveExpense.ts` 只改 import 路徑。

- [ ] **Step 5: 執行測試**

Run: `npx vitest run tests/lib/expense-payload.test.ts tests/lib/quick-expense/use-quick-save.test.ts tests/components/v2/expense-form-v2.test.tsx`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add lib/expense-payload.ts lib/hooks/useSaveExpense.ts components/v2/expense-form/expense-form-v2.tsx lib/quick-expense/use-quick-save.ts tests/lib/expense-payload.test.ts tests/lib/quick-expense/use-quick-save.test.ts
git commit -m "refactor(expense): share the payload builder with quick expenses"
```

---

### Task 6: AI footer 與新增支出對齊

**Files:**
- Modify: `components/v2/quick-expense/confirm-step.tsx`
- Test: `tests/components/v2/quick-expense/confirm-step.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `expenseFormIssues`；Task 4 的 `onItemChange`。
- Produces: ConfirmStep 的 footer 顯示「顯示幣別」切換（外幣時）、共用 `blockingError`、描述必填提示、submit disabled 規則。

- [ ] **Step 1: 寫失敗測試**

在 `confirm-step.test.tsx` 補：

```tsx
it("blocks submit when the description is empty", () => {
  render(<ConfirmStep {...props} items={[item({ description: "" })]} />)
  expect(screen.getByRole("button", { name: /新增 1 筆/ })).toBeDisabled()
})

it("shows the same amount error as the expense form", () => {
  render(<ConfirmStep {...props} items={[item({ amount: "0" })]} />)
  expect(screen.getByRole("alert")).toHaveTextContent("金額必須大於 0")
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run tests/components/v2/quick-expense/confirm-step.test.tsx`
Expected: FAIL，按鈕仍可點或沒有對應錯誤。

- [ ] **Step 3: 更新 footer**

`ConfirmStep` 用目前的 item 建 `Draft`（`createDraftActions` + `deriveExpenseDraft`）並呼叫 `expenseFormIssues`。footer 的 `error` 顯示 `blockingError ?? props.error`；submit disabled 條件加上 `descMissing`。外幣時在 footer 顯示與新增支出相同的 `[原幣, 專案幣]` 切換，滑動切換項目時保留切換狀態。

- [ ] **Step 4: 執行測試**

Run: `npx vitest run tests/components/v2/quick-expense/confirm-step.test.tsx tests/components/v2/quick-expense/quick-expense-v2.test.tsx`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add components/v2/quick-expense/confirm-step.tsx tests/components/v2/quick-expense/confirm-step.test.tsx
git commit -m "feat(quick-expense): align the confirm footer with the expense form"
```

---

### Task 7: 清理與全量驗證

**Files:**
- Modify: 移除 `lib/quick-expense/draft.ts` 中不再使用的 helper（`itemDerivedPayers` 等）。
- Modify: `components/v2/quick-expense/quick-item-card.tsx`（移除舊 `PayerPicker` / `SplitEditor` / `V2ImagePicker` import）。
- Test: 全量測試。

- [ ] **Step 1: 移除死碼**

Run: `grep -rn "itemDerivedPayers\|fromParsed\|receiptToItem\|participantIds" lib/quick-expense components/v2/quick-expense app/demo/quick-expense`
把不再被引用的舊 helper / import 刪掉；`participantIds` 只應出現在 API payload 映射或 `ExpenseItemResult`。

- [ ] **Step 2: 跑全量測試**

Run: `npm run test:run`
Expected: PASS。

- [ ] **Step 3: 型別與 lint**

Run: `npx tsc --noEmit`
Expected: 無錯誤。

Run: `npx eslint components/v2/quick-expense components/v2/expense-form lib/quick-expense lib/expense-draft.ts lib/expense-payload.ts`
Expected: 無錯誤。

- [ ] **Step 4: 手動驗證**

在 dev server 走過：

1. 一句話多筆 → 確認頁可切換、每筆欄位與新增支出相同。
2. 收據 → 圖片自動帶入、可移除／替換。
3. 外幣 → rate sheet 與顯示幣別切換。
4. 個人項目／固定金額 → 錯誤訊息與新增支出相同。
5. 刪除一筆、重新輸入。
6. 批次新增部分失敗 → 只留未儲存項目，重試不重複。
7. LINE 通知只送一次。
8. 手機返回鍵可離開相機與確認頁。

- [ ] **Step 5: Commit**

```bash
git add -A -- components/v2/quick-expense lib/quick-expense
git commit -m "chore(quick-expense): remove the duplicated form implementation"
```

---

## Self-Review Checklist

- [ ] 每個 spec 的 requirement 都對應到至少一個 task。
- [ ] 新函式名稱在各 task 一致：`initialState`、`createDraftActions`、`deriveExpenseDraft`、`expenseFormIssues`、`buildExpensePayload`、`parsedToQuickItems`、`receiptToQuickItem`。
- [ ] 沒有 task 依賴未定義的型別或函式。
- [ ] Review Focus 的每個項目都有對應測試（Task 3、4、5、6）。
- [ ] 每個 task 都有可獨立執行的測試指令與 commit。
