# UI v2 里程碑 3a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2 新增／編輯支出表單（A3），並把「個人項目」與「指定金額」明細存入 `Expense.splitDetail`，v1、v2 都能讀寫。

**Architecture:** 分帳計算、`splitDetail` 轉換與驗證集中在純函式 `lib/expense-split.ts`（前後端共用）；送出與刪除集中在 `useSaveExpense`；v1 表單保留自己的畫面狀態，只改為呼叫共用程式；v2 表單以 `useExpenseDraft` 管理草稿狀態並共用同一套計算與送出。

**Tech Stack:** Next.js 16、React 19、TypeScript 5、Prisma 6（PostgreSQL，`db push` 流程）、Tailwind v4、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-28-ui-v2-milestone-3a-design.md`

## Global Constraints

- 網址不變；不新增 `/v2` 路由。
- **不得執行** `prisma db push`、`prisma migrate`、或任何連線資料庫的指令；只修改 `prisma/schema.prisma` 並執行 `npx prisma generate`（不需連線）。
- 不建立 `prisma/migrations` 下的檔案。
- 每人應付金額只以 `ExpenseParticipant.shareAmount` 為準；結算、統計、匯出不讀 `splitDetail`。
- v1 表單畫面與文案不變；行為差異只有：個人項目／指定金額可正確還原、`unsupported` 唯讀、以及下方「先扣再分零頭修正」。
- **先扣再分零頭修正**：v1 現行「先扣再分」的第一人金額以未四捨五入的均分額計算，總和可能差 0.01；共用公式讓第一位自動均分者吸收零頭，總和永遠等於金額。此模式下第一人金額可能與舊版差 0.01。均分、指定金額兩種模式結果必須與舊版完全相同。
- v2 只有淺色；v2 元件不得使用 `dark:` variant；視覺數值以 `design/project/AddExpense.dc.html` 為準。
- 對話框與輸入元件（計算機 `Calculator`、`CurrencySelect`、`Calendar`／`Popover`、`LocationPicker`、`ImagePicker`、`ConfirmDeleteDialog`）沿用 v1 元件。
- 程式碼註解用英文；UI 文案用繁體中文。
- Commit 訊息結尾必須是（HEREDOC，位於 body）：
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
  ```
- 每個 task 結束時 `npm run test:run` 0 失敗（`tests/api/admin-ads.test.ts` 偶發 flake，需單獨重跑確認）、`npm run lint` 無新錯誤、`npx tsc --noEmit -p .` 變更檔案無錯誤。
- 工作目錄：`/Users/kewos/Documents/projects/wander-wallet/.claude/worktrees/ui-v2-m1`，分支 `feat/ui-v2-m3a`。

## Review Focus

1. **舊版頁面（未更新的 v1 bundle）修改分攤**：PUT 附 `participants` 未附 `splitDetail` → 資料庫的 `splitDetail` 變 `null`。→ Task 2 測試。
2. **個人項目合計超過總額**：前端擋下並顯示訊息；後端驗證回 400。→ Task 1、Task 5 測試。
3. **只有個人項目、沒有加入共同分攤的成員**：分攤額＝個人項目合計；存成 `customShares[m] = 0`，v1 開啟時為 `unsupported`。→ Task 1、Task 5 測試。
4. **編輯時只改描述**：v1、v2 都不應改動 `splitDetail`；v1「無變更」判斷不因 `splitDetail` 誤判。→ Task 2、Task 4 測試。
5. **均分、指定金額兩種 v1 模式的分攤結果與舊版完全相同**（含零頭）。→ Task 1 測試。

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `prisma/schema.prisma` | `Expense.splitDetail Json?` |
| `lib/expense-split.ts` | 分帳公式、splitDetail 建立／還原／比較／v1 模式判斷／驗證 |
| `lib/expense-changes.ts` | 編輯前後差異（LINE 更新通知） |
| `lib/hooks/useSaveExpense.ts` | 圖片上傳、POST／PUT、刪除、LINE 通知 |
| `app/api/projects/[id]/expenses/route.ts` | POST 接收 splitDetail |
| `app/api/projects/[id]/expenses/[expenseId]/route.ts` | PUT 更新／清除 splitDetail |
| `components/expense/expense-form.tsx` | v1：改用共用程式、讀寫 splitDetail、唯讀保護 |
| `components/v2/expense-form/use-expense-draft.ts` | v2 草稿狀態與衍生分攤 |
| `components/v2/expense-form/*.tsx` | v2 表單各區塊與容器 |
| `app/projects/[id]/expenses/new/page.tsx`、`.../[expenseId]/edit/page.tsx` | 分流 |

---

### Task 1: `splitDetail` 欄位與 `lib/expense-split.ts`

**Files:**
- Modify: `prisma/schema.prisma`（`model Expense` 內，`image` 欄位之後）
- Create: `lib/expense-split.ts`
- Test: `tests/lib/expense-split.test.ts`

**Interfaces:**
- Produces:
  - `interface SplitItem { name: string; amount: number }`
  - `interface SplitInput { amount: number; participantIds: string[]; personalItems: Record<string, SplitItem[]>; customShares: Record<string, number> }`
  - `interface SplitDetail { version: 1; personalItems: Record<string, SplitItem[]>; customShares: Record<string, number> }`
  - `interface ParticipantShare { memberId: string; shareAmount: number }`
  - `computeShares(input: SplitInput): ParticipantShare[]`
  - `buildSplitDetail(input: SplitInput): SplitDetail | null`
  - `splitDetailToInput(detail: SplitDetail): { personalItems: Record<string, SplitItem[]>; customShares: Record<string, number> }`
  - `isSameSplitDetail(a: SplitDetail | null, b: SplitDetail | null): boolean`
  - `type V1SplitMode = "none" | "personal" | "custom" | "unsupported"`；`getV1SplitMode(detail: SplitDetail | null): V1SplitMode`
  - `validateSplitDetail(value: unknown, participants: ParticipantShare[]): { ok: true; detail: SplitDetail } | { ok: false; error: string }`
  - 錯誤訊息常數（皆匯出）：`SPLIT_DETAIL_FORMAT_ERROR = "分攤明細格式不正確"`、`SPLIT_DETAIL_MEMBER_ERROR = "分攤明細包含非分攤成員"`、`SPLIT_DETAIL_AMOUNT_ERROR = "分攤明細金額不正確"`、`SPLIT_DETAIL_NAME_ERROR = "個人項目名稱需為 1–30 字"`、`SPLIT_DETAIL_COUNT_ERROR = "每人最多 20 個個人項目"`、`SPLIT_DETAIL_MISMATCH_ERROR = "分攤明細與分攤金額不一致"`

- [ ] **Step 1: Schema**

在 `prisma/schema.prisma` 的 `model Expense` 中 `image` 那一行之後加：

```prisma
  splitDetail Json?    @map("split_detail") // 分攤明細：個人項目與指定金額（v2）
```

Run: `npx prisma generate`（不連線資料庫）
Expected: 產生 Prisma Client 成功。**不要**執行 `db push` 或 `migrate`。

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/expense-split.test.ts
import { describe, it, expect } from "vitest"
import {
  buildSplitDetail,
  computeShares,
  getV1SplitMode,
  isSameSplitDetail,
  splitDetailToInput,
  validateSplitDetail,
  SPLIT_DETAIL_AMOUNT_ERROR,
  SPLIT_DETAIL_COUNT_ERROR,
  SPLIT_DETAIL_FORMAT_ERROR,
  SPLIT_DETAIL_MEMBER_ERROR,
  SPLIT_DETAIL_MISMATCH_ERROR,
  SPLIT_DETAIL_NAME_ERROR,
  type SplitInput,
} from "@/lib/expense-split"

const ids = ["a", "b", "c"]
const input = (overrides: Partial<SplitInput>): SplitInput => ({
  amount: 100,
  participantIds: ids,
  personalItems: {},
  customShares: {},
  ...overrides,
})

describe("computeShares — v1 equal mode", () => {
  it("gives the rounding remainder to the first member (same as v1)", () => {
    expect(computeShares(input({}))).toEqual([
      { memberId: "a", shareAmount: 33.34 },
      { memberId: "b", shareAmount: 33.33 },
      { memberId: "c", shareAmount: 33.33 },
    ])
  })

  it("returns [] without participants", () => {
    expect(computeShares(input({ participantIds: [] }))).toEqual([])
  })
})

describe("computeShares — v1 fixed (custom) mode", () => {
  it("splits the remainder among non-fixed members (same as v1)", () => {
    // v1: fixed b=30; remaining 70 over a,c → per 35
    expect(computeShares(input({ customShares: { b: 30 } }))).toEqual([
      { memberId: "a", shareAmount: 35 },
      { memberId: "b", shareAmount: 30 },
      { memberId: "c", shareAmount: 35 },
    ])
  })

  it("keeps odd remainders on the first auto member (same as v1)", () => {
    // fixed a=1 → remaining 100 over b,c,d → per 33.33; v1 gives b = round2(100 - 33.33*2) = 33.34
    expect(
      computeShares(input({ amount: 101, participantIds: ["a", "b", "c", "d"], customShares: { a: 1 } }))
    ).toEqual([
      { memberId: "a", shareAmount: 1 },
      { memberId: "b", shareAmount: 33.34 },
      { memberId: "c", shareAmount: 33.33 },
      { memberId: "d", shareAmount: 33.33 },
    ])
  })

  it("does not absorb a mismatch when everyone is fixed", () => {
    expect(computeShares(input({ customShares: { a: 10, b: 10, c: 10 } }))).toEqual([
      { memberId: "a", shareAmount: 10 },
      { memberId: "b", shareAmount: 10 },
      { memberId: "c", shareAmount: 10 },
    ])
  })
})

describe("computeShares — personal items", () => {
  it("adds personal items and splits the rest; total always equals amount", () => {
    const shares = computeShares(
      input({ personalItems: { b: [{ name: "計程車", amount: 10 }] } })
    )
    expect(shares).toEqual([
      { memberId: "a", shareAmount: 30 },
      { memberId: "b", shareAmount: 40 },
      { memberId: "c", shareAmount: 30 },
    ])
    const total = shares.reduce((s, x) => s + x.shareAmount, 0)
    expect(Math.round(total * 100) / 100).toBe(100)
  })

  it("fixes v1's 0.01 drift: 100 with no items over 3 still sums to 100", () => {
    const shares = computeShares(input({ personalItems: { a: [] } }))
    expect(Math.round(shares.reduce((s, x) => s + x.shareAmount, 0) * 100) / 100).toBe(100)
  })

  it("combines personal items and custom shares", () => {
    // a: item 20 + auto; b: item 10 + custom 30; c: auto. auto pool = 100-30-30=40 → a,c 20 each
    expect(
      computeShares(
        input({
          personalItems: { a: [{ name: "x", amount: 20 }], b: [{ name: "y", amount: 10 }] },
          customShares: { b: 30 },
        })
      )
    ).toEqual([
      { memberId: "a", shareAmount: 40 },
      { memberId: "b", shareAmount: 40 },
      { memberId: "c", shareAmount: 20 },
    ])
  })

  it("personal-only member (custom 0) pays only their items", () => {
    expect(
      computeShares(
        input({ personalItems: { c: [{ name: "紀念品", amount: 10 }] }, customShares: { c: 0 } })
      )
    ).toEqual([
      { memberId: "a", shareAmount: 45 },
      { memberId: "b", shareAmount: 45 },
      { memberId: "c", shareAmount: 10 },
    ])
  })
})

describe("buildSplitDetail / splitDetailToInput / isSameSplitDetail", () => {
  it("returns null for a plain equal split", () => {
    expect(buildSplitDetail(input({}))).toBeNull()
    expect(buildSplitDetail(input({ personalItems: { a: [] } }))).toBeNull()
  })

  it("drops empty arrays and non-participants, and round-trips", () => {
    const detail = buildSplitDetail(
      input({
        personalItems: { a: [{ name: " 咖啡 ", amount: 5 }], b: [], z: [{ name: "x", amount: 1 }] },
        customShares: { c: 20, z: 3 },
      })
    )
    expect(detail).toEqual({
      version: 1,
      personalItems: { a: [{ name: "咖啡", amount: 5 }] },
      customShares: { c: 20 },
    })
    expect(splitDetailToInput(detail!)).toEqual({
      personalItems: { a: [{ name: "咖啡", amount: 5 }] },
      customShares: { c: 20 },
    })
  })

  it("compares details independent of key order", () => {
    const a = { version: 1 as const, personalItems: {}, customShares: { x: 1, y: 2 } }
    const b = { version: 1 as const, personalItems: {}, customShares: { y: 2, x: 1 } }
    expect(isSameSplitDetail(a, b)).toBe(true)
    expect(isSameSplitDetail(a, null)).toBe(false)
    expect(isSameSplitDetail(null, null)).toBe(true)
  })
})

describe("getV1SplitMode", () => {
  it.each([
    [null, "none"],
    [{ version: 1, personalItems: { a: [{ name: "x", amount: 1 }] }, customShares: {} }, "personal"],
    [{ version: 1, personalItems: {}, customShares: { a: 1 } }, "custom"],
    [{ version: 1, personalItems: { a: [{ name: "x", amount: 1 }] }, customShares: { b: 1 } }, "unsupported"],
  ] as const)("%j → %s", (detail, mode) => {
    expect(getV1SplitMode(detail as never)).toBe(mode)
  })
})

describe("validateSplitDetail", () => {
  const shares = [
    { memberId: "a", shareAmount: 40 },
    { memberId: "b", shareAmount: 40 },
    { memberId: "c", shareAmount: 20 },
  ]
  const valid = {
    version: 1,
    personalItems: { a: [{ name: "x", amount: 20 }], b: [{ name: "y", amount: 10 }] },
    customShares: { b: 30 },
  }

  it("accepts a consistent detail and normalizes names", () => {
    const r = validateSplitDetail(
      { ...valid, personalItems: { ...valid.personalItems, a: [{ name: " x ", amount: 20 }] } },
      shares
    )
    expect(r).toEqual({ ok: true, detail: valid })
  })

  it.each([
    ["not an object", "x", SPLIT_DETAIL_FORMAT_ERROR],
    ["wrong version", { ...valid, version: 2 }, SPLIT_DETAIL_FORMAT_ERROR],
    ["non-participant", { ...valid, customShares: { z: 1 } }, SPLIT_DETAIL_MEMBER_ERROR],
    ["negative amount", { ...valid, personalItems: { a: [{ name: "x", amount: -1 }] } }, SPLIT_DETAIL_AMOUNT_ERROR],
    ["empty name", { ...valid, personalItems: { a: [{ name: "  ", amount: 20 }] } }, SPLIT_DETAIL_NAME_ERROR],
    ["long name", { ...valid, personalItems: { a: [{ name: "字".repeat(31), amount: 20 }] } }, SPLIT_DETAIL_NAME_ERROR],
    [
      "too many items",
      { ...valid, personalItems: { a: Array.from({ length: 21 }, () => ({ name: "x", amount: 0 })) } },
      SPLIT_DETAIL_COUNT_ERROR,
    ],
    ["custom share mismatch", { ...valid, customShares: { b: 29 } }, SPLIT_DETAIL_MISMATCH_ERROR],
    [
      "personal items above share",
      { version: 1, personalItems: { c: [{ name: "x", amount: 25 }] }, customShares: {} },
      SPLIT_DETAIL_MISMATCH_ERROR,
    ],
  ])("rejects %s", (_label, value, error) => {
    expect(validateSplitDetail(value, shares)).toEqual({ ok: false, error })
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/lib/expense-split.test.ts`
Expected: FAIL，無法解析 `@/lib/expense-split`

- [ ] **Step 4: Write `lib/expense-split.ts`**

```ts
// lib/expense-split.ts
export interface SplitItem {
  name: string
  amount: number
}

export interface SplitInput {
  amount: number
  participantIds: string[]
  personalItems: Record<string, SplitItem[]>
  customShares: Record<string, number>
}

export interface SplitDetail {
  version: 1
  personalItems: Record<string, SplitItem[]>
  customShares: Record<string, number>
}

export interface ParticipantShare {
  memberId: string
  shareAmount: number
}

export type V1SplitMode = "none" | "personal" | "custom" | "unsupported"

export const SPLIT_DETAIL_FORMAT_ERROR = "分攤明細格式不正確"
export const SPLIT_DETAIL_MEMBER_ERROR = "分攤明細包含非分攤成員"
export const SPLIT_DETAIL_AMOUNT_ERROR = "分攤明細金額不正確"
export const SPLIT_DETAIL_NAME_ERROR = "個人項目名稱需為 1–30 字"
export const SPLIT_DETAIL_COUNT_ERROR = "每人最多 20 個個人項目"
export const SPLIT_DETAIL_MISMATCH_ERROR = "分攤明細與分攤金額不一致"

const MAX_ITEMS = 20
const MAX_NAME = 30
const TOLERANCE = 0.01

const round2 = (n: number) => Math.round(n * 100) / 100
const sumItems = (items: SplitItem[] | undefined) => (items ?? []).reduce((s, i) => s + i.amount, 0)
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

// share = personal items + (custom share if set, otherwise the auto share).
// The first auto member absorbs the rounding remainder; with no auto members
// nothing is absorbed so a mismatch surfaces in validation.
export function computeShares(input: SplitInput): ParticipantShare[] {
  const { amount, participantIds, personalItems, customShares } = input
  if (participantIds.length === 0) return []

  const personal = (id: string) => sumItems(personalItems[id])
  const autoIds = participantIds.filter((id) => !hasOwn(customShares, id))

  if (autoIds.length === 0) {
    return participantIds.map((id) => ({ memberId: id, shareAmount: round2(personal(id) + customShares[id]) }))
  }

  const personalTotal = participantIds.reduce((s, id) => s + personal(id), 0)
  const customTotal = participantIds.reduce((s, id) => s + (hasOwn(customShares, id) ? customShares[id] : 0), 0)
  const perAuto = round2((amount - personalTotal - customTotal) / autoIds.length)
  const firstAuto = autoIds[0]

  const shares = participantIds.map((id) => ({
    memberId: id,
    shareAmount: hasOwn(customShares, id) ? round2(personal(id) + customShares[id]) : round2(personal(id) + perAuto),
  }))
  const others = shares.filter((s) => s.memberId !== firstAuto).reduce((s, x) => s + x.shareAmount, 0)
  const first = shares.find((s) => s.memberId === firstAuto)!
  first.shareAmount = round2(amount - others)
  return shares
}

export function buildSplitDetail(input: SplitInput): SplitDetail | null {
  const members = new Set(input.participantIds)
  const personalItems: Record<string, SplitItem[]> = {}
  for (const [id, items] of Object.entries(input.personalItems)) {
    if (!members.has(id) || items.length === 0) continue
    personalItems[id] = items.map((i) => ({ name: i.name.trim(), amount: i.amount }))
  }
  const customShares: Record<string, number> = {}
  for (const [id, value] of Object.entries(input.customShares)) {
    if (members.has(id)) customShares[id] = value
  }
  if (Object.keys(personalItems).length === 0 && Object.keys(customShares).length === 0) return null
  return { version: 1, personalItems, customShares }
}

export function splitDetailToInput(detail: SplitDetail) {
  return {
    personalItems: Object.fromEntries(
      Object.entries(detail.personalItems).map(([id, items]) => [id, items.map((i) => ({ ...i }))])
    ),
    customShares: { ...detail.customShares },
  }
}

function canonical(detail: SplitDetail): string {
  const sortObj = <T>(obj: Record<string, T>) =>
    Object.keys(obj)
      .sort()
      .map((k) => [k, obj[k]])
  return JSON.stringify([sortObj(detail.personalItems), sortObj(detail.customShares)])
}

export function isSameSplitDetail(a: SplitDetail | null, b: SplitDetail | null): boolean {
  if (!a || !b) return a === b
  return canonical(a) === canonical(b)
}

export function getV1SplitMode(detail: SplitDetail | null): V1SplitMode {
  if (!detail) return "none"
  const hasPersonal = Object.keys(detail.personalItems).length > 0
  const hasCustom = Object.keys(detail.customShares).length > 0
  if (hasPersonal && hasCustom) return "unsupported"
  if (hasPersonal) return "personal"
  if (hasCustom) return "custom"
  return "none"
}

const isAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0

export function validateSplitDetail(
  value: unknown,
  participants: ParticipantShare[]
): { ok: true; detail: SplitDetail } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(SPLIT_DETAIL_FORMAT_ERROR)
  const raw = value as Record<string, unknown>
  if (raw.version !== 1) return fail(SPLIT_DETAIL_FORMAT_ERROR)
  const rawItems = raw.personalItems ?? {}
  const rawCustom = raw.customShares ?? {}
  if (typeof rawItems !== "object" || Array.isArray(rawItems) || typeof rawCustom !== "object" || Array.isArray(rawCustom)) {
    return fail(SPLIT_DETAIL_FORMAT_ERROR)
  }

  const shareOf = new Map(participants.map((p) => [p.memberId, Number(p.shareAmount)]))
  const personalItems: Record<string, SplitItem[]> = {}
  for (const [id, items] of Object.entries(rawItems as Record<string, unknown>)) {
    if (!shareOf.has(id)) return fail(SPLIT_DETAIL_MEMBER_ERROR)
    if (!Array.isArray(items)) return fail(SPLIT_DETAIL_FORMAT_ERROR)
    if (items.length > MAX_ITEMS) return fail(SPLIT_DETAIL_COUNT_ERROR)
    const clean: SplitItem[] = []
    for (const item of items) {
      if (!item || typeof item !== "object") return fail(SPLIT_DETAIL_FORMAT_ERROR)
      const { name, amount } = item as Record<string, unknown>
      if (!isAmount(amount)) return fail(SPLIT_DETAIL_AMOUNT_ERROR)
      const trimmed = typeof name === "string" ? name.trim() : ""
      if (trimmed.length === 0 || trimmed.length > MAX_NAME) return fail(SPLIT_DETAIL_NAME_ERROR)
      clean.push({ name: trimmed, amount })
    }
    if (clean.length > 0) personalItems[id] = clean
  }

  const customShares: Record<string, number> = {}
  for (const [id, amount] of Object.entries(rawCustom as Record<string, unknown>)) {
    if (!shareOf.has(id)) return fail(SPLIT_DETAIL_MEMBER_ERROR)
    if (!isAmount(amount)) return fail(SPLIT_DETAIL_AMOUNT_ERROR)
    customShares[id] = amount
  }

  for (const [id, share] of shareOf) {
    const personal = sumItems(personalItems[id])
    if (hasOwn(customShares, id)) {
      if (Math.abs(share - (personal + customShares[id])) > TOLERANCE) return fail(SPLIT_DETAIL_MISMATCH_ERROR)
    } else if (share < personal - TOLERANCE) {
      return fail(SPLIT_DETAIL_MISMATCH_ERROR)
    }
  }

  return { ok: true, detail: { version: 1, personalItems, customShares } }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/lib/expense-split.test.ts`
Expected: PASS

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add prisma/schema.prisma lib/expense-split.ts tests/lib/expense-split.test.ts
git commit -F - <<'EOF'
feat: Add Expense.splitDetail column and shared split calculation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 2: API 支援 `splitDetail`

**Files:**
- Modify: `app/api/projects/[id]/expenses/route.ts`（POST）
- Modify: `app/api/projects/[id]/expenses/[expenseId]/route.ts`（PUT）
- Test: `tests/api/expenses.test.ts`（在既有 `describe("POST ...")` 與 `describe("PUT ...")` 內新增案例）

**Interfaces:**
- Consumes: `validateSplitDetail`、`SplitDetail`（Task 1）
- Produces: POST／PUT 接收 `splitDetail`；GET 回傳（`include` 已包含所有 scalar 欄位，不需修改）

- [ ] **Step 1: Write the failing tests**

在 `tests/api/expenses.test.ts` 的 `describe("POST /api/projects/[id]/expenses", ...)` 最後加入：

```ts
  it("stores a valid splitDetail", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.expense.create).mockResolvedValue(mockExpense as never)

    const splitDetail = { version: 1, personalItems: { "member-123": [{ name: "咖啡", amount: 100 }] }, customShares: {} }
    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        paidByMemberId: "member-123",
        amount: 1000,
        participants: [
          { memberId: "member-123", shareAmount: 550 },
          { memberId: "member-456", shareAmount: 450 },
        ],
        splitDetail,
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })

    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.expense.create).mock.calls[0][0].data).toMatchObject({ splitDetail })
  })

  it("rejects an inconsistent splitDetail with 400", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const req = new NextRequest("http://localhost:3000/api/projects/project-123/expenses", {
      method: "POST",
      body: JSON.stringify({
        paidByMemberId: "member-123",
        amount: 1000,
        participants: [
          { memberId: "member-123", shareAmount: 500 },
          { memberId: "member-456", shareAmount: 500 },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: { "member-456": 300 } },
      }),
    })
    const response = await POST(req, { params: createParams("project-123") })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("分攤明細與分攤金額不一致")
    expect(prisma.expense.create).not.toHaveBeenCalled()
  })
```

在 `describe("PUT /api/projects/[id]/expenses/[expenseId]", ...)` 最後加入。先在該 describe 內加一個 helper（沿用既有「should update expense successfully」的 mock 寫法）：

```ts
  function mockUpdateTransaction() {
    const update = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (cb) =>
      cb({
        expenseParticipant: { deleteMany: vi.fn(), createMany: vi.fn() },
        expense: { update },
      } as never)
    )
    return update
  }

  function putRequest(body: unknown) {
    return new NextRequest("http://localhost:3000/api/projects/project-123/expenses/expense-123", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  function mockExisting(splitDetail: unknown = null) {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(prisma.projectMember.findFirst).mockResolvedValue(mockMembership as never)
    vi.mocked(prisma.expense.findFirst).mockResolvedValue({ ...mockExpense, splitDetail } as never)
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([{ id: "member-123" }, { id: "member-456" }] as never)
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as never)
  }

  const oldDetail = { version: 1, personalItems: { "member-123": [{ name: "x", amount: 100 }] }, customShares: {} }

  it("clears splitDetail when participants change without splitDetail (old clients)", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({ participants: [{ memberId: "member-123", shareAmount: 500 }, { memberId: "member-456", shareAmount: 500 }] }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toBe(Prisma.DbNull)
  })

  it("leaves splitDetail alone when only the description changes", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(putRequest({ description: "新描述" }), {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data).not.toHaveProperty("splitDetail")
  })

  it("updates a valid splitDetail", async () => {
    mockExisting(null)
    const update = mockUpdateTransaction()
    const splitDetail = { version: 1, personalItems: {}, customShares: { "member-456": 300 } }
    const response = await PUT_EXPENSE(
      putRequest({
        participants: [{ memberId: "member-123", shareAmount: 700 }, { memberId: "member-456", shareAmount: 300 }],
        splitDetail,
      }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toEqual(splitDetail)
  })

  it("validates splitDetail against existing participants when participants are not sent", async () => {
    mockExisting(null)
    mockUpdateTransaction()
    const response = await PUT_EXPENSE(
      putRequest({ splitDetail: { version: 1, personalItems: {}, customShares: { "member-456": 999 } } }),
      { params: createExpenseParams("project-123", "expense-123") }
    )
    expect(response.status).toBe(400)
  })

  it("clears splitDetail when null is sent", async () => {
    mockExisting(oldDetail)
    const update = mockUpdateTransaction()
    const response = await PUT_EXPENSE(putRequest({ splitDetail: null }), {
      params: createExpenseParams("project-123", "expense-123"),
    })
    expect(response.status).toBe(200)
    expect(update.mock.calls[0][0].data.splitDetail).toBe(Prisma.DbNull)
  })
```

在檔案頂端 import 加上 `import { Prisma } from "@prisma/client"`。若 `vi.mock("@/lib/db", ...)` 讓 `Prisma` 無法取得，改從 `@/lib/generated/prisma`（依專案實際 Prisma Client 路徑，讀 `lib/db.ts` 確認）import。

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: 新案例 FAIL（splitDetail 未被存入／未被清除）

- [ ] **Step 3: Implement POST**

在 `app/api/projects/[id]/expenses/route.ts`：
1. import：`import { validateSplitDetail } from "@/lib/expense-split"`。
2. 解構 body 時加上 `splitDetail`。
3. 在「計算分擔總額並驗證」通過之後、`prisma.expense.create` 之前加入：
   ```ts
    // Optional v2 split detail; must match the submitted shares
    let validatedSplitDetail = null
    if (splitDetail !== undefined && splitDetail !== null) {
      const result = validateSplitDetail(
        splitDetail,
        participants.map((p: Participant) => ({ memberId: p.memberId, shareAmount: Number(p.shareAmount) }))
      )
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      validatedSplitDetail = result.detail
    }
   ```
4. `prisma.expense.create` 的 `data` 中加入 `...(validatedSplitDetail ? { splitDetail: validatedSplitDetail } : {}),`。若型別要求 `Prisma.InputJsonValue`，以 `validatedSplitDetail as unknown as Prisma.InputJsonValue` 轉型。

- [ ] **Step 4: Implement PUT**

在 `app/api/projects/[id]/expenses/[expenseId]/route.ts`：
1. import `validateSplitDetail`；確認已 import `Prisma`（檔案中已用到 `Prisma.TransactionClient`）。
2. 解構 body 時加上 `splitDetail`，並記錄 `const hasSplitDetailField = Object.prototype.hasOwnProperty.call(body, "splitDetail")`。
3. 在「如果更新了參與者，需要重新驗證」區塊之後加入：
   ```ts
    // splitDetail: explicit value wins; changed shares without it (old clients) clear it
    let splitDetailUpdate: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined
    if (hasSplitDetailField) {
      if (splitDetail === null) {
        splitDetailUpdate = Prisma.DbNull
      } else {
        const shares = participants && Array.isArray(participants)
          ? participants.map((p: Participant) => ({ memberId: p.memberId, shareAmount: Number(p.shareAmount) }))
          : existingExpense.participants.map((p) => ({ memberId: p.member.id, shareAmount: Number(p.shareAmount) }))
        const result = validateSplitDetail(splitDetail, shares)
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        splitDetailUpdate = result.detail as unknown as Prisma.InputJsonValue
      }
    } else if (participants && Array.isArray(participants)) {
      splitDetailUpdate = Prisma.DbNull
    }
   ```
4. **在 `diffChanges(...)` 計算完之後**（避免 activity log 出現 splitDetail 雜訊），把它加進 `updateData`：
   ```ts
    if (splitDetailUpdate !== undefined) {
      updateData.splitDetail = splitDetailUpdate
    }
   ```
   並在 `updateData` 的型別宣告加上 `splitDetail?: Prisma.InputJsonValue | typeof Prisma.DbNull`。
5. 確認 `existingExpense.participants` 的每筆有 `shareAmount`（目前 `include` 已包含 participant scalar 欄位）。

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: PASS（含既有案例）

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add "app/api/projects/[id]/expenses/route.ts" "app/api/projects/[id]/expenses/[expenseId]/route.ts" tests/api/expenses.test.ts
git commit -F - <<'EOF'
feat: Accept and validate splitDetail in expense create and update APIs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 3: `lib/expense-changes.ts` 與 `useSaveExpense`

**Files:**
- Create: `lib/expense-changes.ts`
- Create: `lib/hooks/useSaveExpense.ts`
- Test: `tests/lib/expense-changes.test.ts`、`tests/lib/hooks/useSaveExpense.test.tsx`

**Interfaces:**
- Consumes: `SplitDetail`、`ParticipantShare`（Task 1）；`ExpenseChange`、`sendExpenseNotificationToChat`、`sendDeleteNotificationToChat`（`@/lib/liff`）；`uploadImageToR2`（`@/lib/image-utils`）；`mergePreferences`
- Produces:
  - `interface ExpenseSnapshot { amount: number; currency: string; description: string | null; category: string | null; paidByMemberId: string; payerName: string; expenseDate: Date; location: string | null; image: string | null; participantIds: string[] }`
  - `buildExpenseChanges(original: ExpenseSnapshot, next: ExpenseSnapshot, opts: { imageReplaced: boolean }): ExpenseChange[]`
  - `interface ExpensePayload { paidByMemberId: string; amount: number; currency: string; description: string | null; category: string; location: string | null; latitude: number | null; longitude: number | null; expenseDate: string; participants: ParticipantShare[]; splitDetail: SplitDetail | null }`
  - `useSaveExpense(projectId: string): { save; remove; saving: boolean; uploadingImage: boolean; deleting: boolean; canNotifyLine: boolean }`
    - `save(req: { mode: "create" | "edit"; expenseId?: string; payload: ExpensePayload; image: { url: string | null; pendingFile: File | null; pendingDeleteUrl: string | null }; notification: { requested: boolean; projectName: string; payerName: string; changes: ExpenseChange[] } }): Promise<{ ok: true } | { ok: false; error: string }>`
    - `remove(req: { expenseId: string; notification: { requested: boolean; projectName: string; payerName: string; amount: number; description: string | null; category: string | null; participantCount: number } }): Promise<{ ok: true } | { ok: false; error: string }>`
    - `canNotifyLine` = `canSendMessages && !isDevMode`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/expense-changes.test.ts
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
```

```tsx
// tests/lib/hooks/useSaveExpense.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => mockUseLiff(),
}))
const mockNotify = vi.fn()
const mockNotifyDelete = vi.fn()
vi.mock("@/lib/liff", () => ({
  sendExpenseNotificationToChat: (p: unknown) => mockNotify(p),
  sendDeleteNotificationToChat: (p: unknown) => mockNotifyDelete(p),
}))
const mockUpload = vi.fn()
vi.mock("@/lib/image-utils", () => ({ uploadImageToR2: (...args: unknown[]) => mockUpload(...args) }))

import { useSaveExpense, type ExpensePayload } from "@/lib/hooks/useSaveExpense"

const payload: ExpensePayload = {
  paidByMemberId: "a",
  amount: 100,
  currency: "TWD",
  description: "午餐",
  category: "food",
  location: null,
  latitude: null,
  longitude: null,
  expenseDate: "2026-11-16T04:00:00.000Z",
  participants: [
    { memberId: "a", shareAmount: 50 },
    { memberId: "b", shareAmount: 50 },
  ],
  splitDetail: null,
}
const noImage = { url: null, pendingFile: null, pendingDeleteUrl: null }
const notify = { requested: true, projectName: "東京", payerName: "小美", changes: [] }
const ok = (body: unknown = {}) => ({ ok: true, json: async () => body })

describe("useSaveExpense", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockNotify.mockReset().mockResolvedValue(undefined)
    mockNotifyDelete.mockReset().mockResolvedValue(undefined)
    mockUpload.mockReset()
    mockUseLiff.mockReturnValue({ isDevMode: false, canSendMessages: true, user: { preferences: null } })
  })

  it("creates an expense with splitDetail and notifies", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(res).toEqual({ ok: true })
    const [url, init] = mockAuthFetch.mock.calls[0]
    expect(url).toBe("/api/projects/p1/expenses")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ ...payload, image: null })
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ operationType: "create", projectId: "p1", payerName: "小美", participantCount: 2 })
    )
  })

  it("updates with PUT and skips notification when the user disabled update notices", async () => {
    mockUseLiff.mockReturnValue({
      isDevMode: false,
      canSendMessages: true,
      user: { preferences: { notifications: { expenseUpdated: false } } },
    })
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({ mode: "edit", expenseId: "e1", payload, image: noImage, notification: notify })
    })
    expect(mockAuthFetch.mock.calls[0][0]).toBe("/api/projects/p1/expenses/e1")
    expect(mockAuthFetch.mock.calls[0][1].method).toBe("PUT")
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("uploads a pending image and deletes the replaced one", async () => {
    mockUpload.mockResolvedValueOnce({ url: "https://r2/new.jpg" })
    mockAuthFetch.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok())
    const file = new File(["x"], "r.jpg", { type: "image/jpeg" })
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({
        mode: "edit",
        expenseId: "e1",
        payload,
        image: { url: "https://r2/old.jpg", pendingFile: file, pendingDeleteUrl: "https://r2/old.jpg" },
        notification: { ...notify, requested: false },
      })
    })
    expect(JSON.parse(mockAuthFetch.mock.calls[0][1].body).image).toBe("https://r2/new.jpg")
    expect(mockAuthFetch.mock.calls[1][0]).toBe(`/api/upload?url=${encodeURIComponent("https://r2/old.jpg")}`)
  })

  it("returns the upload error without saving", async () => {
    mockUpload.mockRejectedValueOnce(new Error("boom"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const file = new File(["x"], "r.jpg", { type: "image/jpeg" })
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({
        mode: "create",
        payload,
        image: { url: null, pendingFile: file, pendingDeleteUrl: null },
        notification: notify,
      })
    })
    expect(res).toEqual({ ok: false, error: "圖片上傳失敗，請重試" })
    expect(mockAuthFetch).not.toHaveBeenCalled()
  })

  it("returns the server error", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "分攤明細與分攤金額不一致" }) })
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(res).toEqual({ ok: false, error: "分攤明細與分攤金額不一致" })
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("does not notify in dev mode", async () => {
    mockUseLiff.mockReturnValue({ isDevMode: true, canSendMessages: true, user: { preferences: null } })
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    await act(async () => {
      await result.current.save({ mode: "create", payload, image: noImage, notification: notify })
    })
    expect(mockNotify).not.toHaveBeenCalled()
    expect(result.current.canNotifyLine).toBe(false)
  })

  it("removes an expense and sends the delete notice", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useSaveExpense("p1"))
    let res: unknown
    await act(async () => {
      res = await result.current.remove({
        expenseId: "e1",
        notification: {
          requested: true,
          projectName: "東京",
          payerName: "小美",
          amount: 100,
          description: "午餐",
          category: "food",
          participantCount: 2,
        },
      })
    })
    expect(res).toEqual({ ok: true })
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/expenses/e1", { method: "DELETE" })
    expect(mockNotifyDelete).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p1", amount: 100 }))
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/lib/expense-changes.test.ts tests/lib/hooks/useSaveExpense.test.tsx`
Expected: FAIL，模組不存在

- [ ] **Step 3: Write `lib/expense-changes.ts`**

邏輯與 v1 `calculateChanges`（`components/expense/expense-form.tsx` 約 700–810 行）相同：

```ts
// lib/expense-changes.ts
import { format } from "date-fns"
import type { ExpenseChange } from "@/lib/liff"
import { CATEGORIES } from "@/lib/constants/expenses"

export interface ExpenseSnapshot {
  amount: number
  currency: string
  description: string | null
  category: string | null
  paidByMemberId: string
  payerName: string
  expenseDate: Date
  location: string | null
  image: string | null
  participantIds: string[]
}

function categoryLabel(category: string | null): string {
  if (!category) return "其他"
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function buildExpenseChanges(
  original: ExpenseSnapshot,
  next: ExpenseSnapshot,
  opts: { imageReplaced: boolean }
): ExpenseChange[] {
  const changes: ExpenseChange[] = []

  if (original.amount !== next.amount || original.currency !== next.currency) {
    changes.push({
      field: "amount",
      label: "金額",
      oldValue: `${original.currency} ${original.amount.toLocaleString()}`,
      newValue: `${next.currency} ${next.amount.toLocaleString()}`,
    })
  }
  if (original.description !== next.description) {
    changes.push({ field: "description", label: "描述", oldValue: original.description || "無", newValue: next.description || "無" })
  }
  if (original.category !== next.category) {
    changes.push({ field: "category", label: "類別", oldValue: categoryLabel(original.category), newValue: categoryLabel(next.category) })
  }
  if (original.paidByMemberId !== next.paidByMemberId) {
    changes.push({ field: "payer", label: "付款人", oldValue: original.payerName, newValue: next.payerName })
  }
  const oldDate = format(original.expenseDate, "yyyy/MM/dd")
  const newDate = format(next.expenseDate, "yyyy/MM/dd")
  if (oldDate !== newDate) {
    changes.push({ field: "date", label: "日期", oldValue: oldDate, newValue: newDate })
  }
  if (original.location !== next.location) {
    changes.push({ field: "location", label: "地點", oldValue: original.location || "無", newValue: next.location || "無" })
  }
  const hadImage = !!original.image
  const hasImage = !!next.image
  const replaced = hadImage && hasImage && opts.imageReplaced
  if (hadImage !== hasImage || replaced) {
    changes.push({
      field: "image",
      label: "圖片",
      oldValue: hadImage ? "有圖片" : "無",
      newValue: replaced ? "已更換" : hasImage ? "有圖片" : "無",
    })
  }
  const oldIds = [...original.participantIds].sort()
  const newIds = [...next.participantIds].sort()
  if (oldIds.length !== newIds.length || oldIds.some((id, i) => id !== newIds[i])) {
    changes.push({ field: "participants", label: "分攤者", oldValue: `${oldIds.length}人`, newValue: `${newIds.length}人` })
  }
  return changes
}
```

- [ ] **Step 4: Write `lib/hooks/useSaveExpense.ts`**

邏輯與 v1 `handleSubmit`（上傳、送出、刪舊圖、通知）與 `handleDelete` 相同：

```ts
// lib/hooks/useSaveExpense.ts
"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { uploadImageToR2 } from "@/lib/image-utils"
import { sendDeleteNotificationToChat, sendExpenseNotificationToChat, type ExpenseChange } from "@/lib/liff"
import type { ParticipantShare, SplitDetail } from "@/lib/expense-split"
import { mergePreferences } from "@/types/user-preferences"

export interface ExpensePayload {
  paidByMemberId: string
  amount: number
  currency: string
  description: string | null
  category: string
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  participants: ParticipantShare[]
  splitDetail: SplitDetail | null
}

interface SaveRequest {
  mode: "create" | "edit"
  expenseId?: string
  payload: ExpensePayload
  image: { url: string | null; pendingFile: File | null; pendingDeleteUrl: string | null }
  notification: { requested: boolean; projectName: string; payerName: string; changes: ExpenseChange[] }
}

interface RemoveRequest {
  expenseId: string
  notification: {
    requested: boolean
    projectName: string
    payerName: string
    amount: number
    description: string | null
    category: string | null
    participantCount: number
  }
}

type Result = { ok: true } | { ok: false; error: string }

export function useSaveExpense(projectId: string) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canNotifyLine = canSendMessages && !isDevMode
  const prefs = mergePreferences(user?.preferences).notifications

  const save = useCallback(
    async (req: SaveRequest): Promise<Result> => {
      const fallback = req.mode === "create" ? "新增失敗" : "更新失敗"
      setSaving(true)
      try {
        let imageUrl = req.image.url
        if (req.image.pendingFile) {
          setUploadingImage(true)
          try {
            imageUrl = (await uploadImageToR2(req.image.pendingFile, projectId, authFetch)).url
          } catch (error) {
            console.error("圖片上傳失敗:", error)
            return { ok: false, error: "圖片上傳失敗，請重試" }
          } finally {
            setUploadingImage(false)
          }
        }

        const url =
          req.mode === "create"
            ? `/api/projects/${projectId}/expenses`
            : `/api/projects/${projectId}/expenses/${req.expenseId}`
        const res = await authFetch(url, {
          method: req.mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...req.payload, image: imageUrl || null }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return { ok: false, error: data.error || fallback }
        }

        if (req.image.pendingDeleteUrl && req.image.pendingDeleteUrl !== imageUrl) {
          authFetch(`/api/upload?url=${encodeURIComponent(req.image.pendingDeleteUrl)}`, { method: "DELETE" }).catch(
            (error) => console.error("刪除舊圖片失敗:", error)
          )
        }

        const enabled = req.mode === "create" ? prefs.expenseCreated : prefs.expenseUpdated
        if (req.notification.requested && canNotifyLine && enabled) {
          sendExpenseNotificationToChat({
            operationType: req.mode === "create" ? "create" : "update",
            projectName: req.notification.projectName,
            projectId,
            payerName: req.notification.payerName,
            amount: req.payload.amount,
            description: req.payload.description || undefined,
            category: req.payload.category || undefined,
            participantCount: req.payload.participants.length,
            changes: req.notification.changes.length > 0 ? req.notification.changes : undefined,
          }).catch(() => {
            // Notification failures must not affect the save.
          })
        }
        return { ok: true }
      } catch (error) {
        console.error(req.mode === "create" ? "新增支出錯誤:" : "更新支出錯誤:", error)
        return { ok: false, error: fallback }
      } finally {
        setSaving(false)
      }
    },
    [authFetch, projectId, canNotifyLine, prefs.expenseCreated, prefs.expenseUpdated]
  )

  const remove = useCallback(
    async (req: RemoveRequest): Promise<Result> => {
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/${req.expenseId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          return { ok: false, error: data.error || "刪除失敗" }
        }
        const n = req.notification
        if (n.requested && canNotifyLine && prefs.expenseDeleted) {
          sendDeleteNotificationToChat({
            projectName: n.projectName,
            projectId,
            payerName: n.payerName,
            amount: n.amount,
            description: n.description || undefined,
            category: n.category || undefined,
            participantCount: n.participantCount,
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        return { ok: true }
      } catch (error) {
        console.error("刪除支出錯誤:", error)
        return { ok: false, error: "刪除失敗" }
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, canNotifyLine, prefs.expenseDeleted]
  )

  return { save, remove, saving, uploadingImage, deleting, canNotifyLine }
}
```

讀 v1 `handleDelete` 其餘部分（刪除成功後的導頁與錯誤訊息），確認 `remove` 的錯誤文字與 v1 相同；若 v1 用不同文字，以 v1 為準並更新測試。

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run tests/lib/expense-changes.test.ts tests/lib/hooks/useSaveExpense.test.tsx`
Expected: PASS

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add lib/expense-changes.ts lib/hooks/useSaveExpense.ts tests/lib/expense-changes.test.ts tests/lib/hooks/useSaveExpense.test.tsx
git commit -F - <<'EOF'
feat: Extract expense change list and save/delete hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 4: v1 表單改用共用程式並讀寫 `splitDetail`

**Files:**
- Modify: `components/expense/expense-form.tsx`
- Test: `tests/components/expense-form.test.tsx`（新增案例；沿用檔內既有的 `mockAuthFetch` 回應寫法）

**Interfaces:**
- Consumes: Task 1（`computeShares`、`buildSplitDetail`、`splitDetailToInput`、`getV1SplitMode`、`isSameSplitDetail`、`SplitInput`、`SplitDetail`）；Task 3（`useSaveExpense`、`buildExpenseChanges`、`ExpenseSnapshot`）

- [ ] **Step 1: Write the failing tests**

在 `tests/components/expense-form.test.tsx` 新增 `describe("splitDetail")`。依檔內既有測試的方式渲染 edit／create 模式（讀檔內現有的 `mockAuthFetch.mockImplementation` 與 `render` helper 並照用）。案例：

1. **create 先扣再分會送出 splitDetail**：切到「自訂」→「先扣再分」，為 Bob 新增項目「咖啡」50，金額 300、三人分攤，送出後攔截 POST body，斷言
   ```ts
   expect(body.splitDetail).toEqual({ version: 1, personalItems: { "member-2": [{ name: "咖啡", amount: 50 }] }, customShares: {} })
   expect(body.participants.reduce((s: number, p: { shareAmount: number }) => s + p.shareAmount, 0)).toBeCloseTo(300)
   ```
2. **create 均分送出 `splitDetail: null`**。
3. **edit 還原個人項目**：`mockExpense` 加上 `splitDetail: { version: 1, personalItems: { "member-2": [{ name: "咖啡", amount: 50 }] }, customShares: {} }` 與對應的 participants（Alice 83.34、Bob 133.33、Charlie 83.33），斷言畫面上看得到「咖啡」項目輸入框值與「先扣再分」為選中狀態。
4. **edit unsupported 唯讀**：`splitDetail` 同時有 `personalItems` 與 `customShares`，斷言出現文字「此支出使用新版功能建立，請切換到新版編輯」，且送出按鈕為 disabled。
5. **edit 只改描述不會誤判無變更，且送出時 splitDetail 保持原值**：載入含個人項目的支出，只改描述，送出按鈕可按；PUT body 的 `splitDetail` 等於原本的明細。

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/components/expense-form.test.tsx`
Expected: 新案例 FAIL

- [ ] **Step 3: Replace `calculateShares` with the shared formula**

在 `components/expense/expense-form.tsx`：

1. import：
   ```ts
   import {
     buildSplitDetail,
     computeShares,
     getV1SplitMode,
     isSameSplitDetail,
     splitDetailToInput,
     type SplitDetail,
     type SplitInput,
   } from "@/lib/expense-split"
   import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"
   import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
   ```
2. 在 `interface Expense` 加 `splitDetail?: SplitDetail | null`。
3. 新增函式（放在 `calculateShares` 前），把 v1 的三種模式轉成 `SplitInput`：
   ```ts
   // Maps the v1 split modes onto the shared split input.
   function currentSplitInput(): SplitInput {
     const participantIds = Array.from(selectedParticipants)
     const base = { amount: Number(amount) || 0, participantIds, personalItems: {}, customShares: {} }
     if (splitMode === "equal") return base
     if (customMode === "personal") {
       const items: SplitInput["personalItems"] = {}
       participantIds.forEach((id) => {
         const list = (personalItems[id] || []).map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 0 }))
         if (list.length > 0) items[id] = list
       })
       return { ...base, personalItems: items }
     }
     const fixedIds = fixedMembers.size > 0 ? participantIds.filter((id) => fixedMembers.has(id)) : participantIds
     const custom: SplitInput["customShares"] = {}
     fixedIds.forEach((id) => {
       custom[id] = Number(customShares[id]) || 0
     })
     return { ...base, customShares: custom }
   }
   ```
4. `calculateShares()` 整個函式本體替換為 `return computeShares(currentSplitInput())`。

- [ ] **Step 4: Save through `useSaveExpense`**

1. 刪除 state `submitting`／`setSubmitting` 與 `uploadingImage`／`setUploadingImage`，改為：
   ```ts
   const { save, remove, saving: submitting, uploadingImage, deleting: removing } = useSaveExpense(projectId)
   ```
2. `handleSubmit` 的欄位檢查（到「分擔總額 ... 不符」為止）保持不變。之後的 `setSubmitting(true)` 到函式結尾替換為：
   ```ts
    const finalCategory = category === "other" && customCategory.trim() ? customCategory.trim() : category || "other"
    const payerName = members.find((m) => m.id === paidBy)?.displayName || "未知"
    const nextSnapshot: ExpenseSnapshot = {
      amount: amountNum,
      currency,
      description: description.trim() || null,
      category: finalCategory,
      paidByMemberId: paidBy,
      payerName,
      expenseDate,
      location: locationData.location,
      image: imageValue.pendingFile ? "pending" : imageValue.image,
      participantIds: participants.map((p) => p.memberId),
    }
    const changes =
      mode === "edit" && originalData
        ? buildExpenseChanges(
            { ...originalData, participantIds: Array.from(originalData.participantIds) },
            nextSnapshot,
            { imageReplaced: imageValue.pendingFile !== null }
          )
        : []

    const result = await save({
      mode,
      expenseId,
      payload: {
        paidByMemberId: paidBy,
        amount: amountNum,
        currency,
        description: description.trim() || null,
        category: finalCategory,
        location: locationData.location,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        expenseDate: expenseDate.toISOString(),
        participants,
        splitDetail: buildSplitDetail(currentSplitInput()),
      },
      image: { url: imageValue.image, pendingFile: imageValue.pendingFile, pendingDeleteUrl: pendingImageDelete },
      notification: { requested: notifyLine, projectName, payerName, changes },
    })
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
   ```
   `originalData` 的欄位名稱與 `ExpenseSnapshot` 相同（`participantIds` 由 Set 轉為陣列）；若有欄位名稱差異，以 `ExpenseSnapshot` 為準做對應。
3. 刪除舊的 `calculateChanges` 函式。
4. `handleDelete` 改用 `remove`（保留 v1 原本成功後的導頁與失敗時的 `alert` 文字）：
   ```ts
   async function handleDelete() {
     if (!expenseId || mode !== "edit" || !originalData) return
     const result = await remove({
       expenseId,
       notification: {
         requested: notifyLine,
         projectName,
         payerName: members.find((m) => m.id === originalData.paidByMemberId)?.displayName || originalData.payerName,
         amount: originalData.amount,
         description: originalData.description,
         category: originalData.category,
         participantCount: originalData.participantIds.size,
       },
     })
     if (!result.ok) {
       alert(result.error)
       return
     }
     // keep the original post-delete navigation here
   }
   ```
   刪除 `deleting` state，`ConfirmDeleteDialog` 的 `loading` 改為 `removing`。讀原 `handleDelete` 成功後做的事（導頁、關閉對話框）並原樣保留。

- [ ] **Step 5: Restore splitDetail on edit and guard unsupported**

1. 新增 state：
   ```ts
   const [originalSplitDetail, setOriginalSplitDetail] = useState<SplitDetail | null>(null)
   const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null)
   ```
2. 在 `fetchExpenseData` 中，**既有的分攤模式判斷之後**、`setOriginalData` 之前加入：
   ```ts
        const detail = expense.splitDetail ?? null
        setOriginalSplitDetail(detail)
        const v1Mode = getV1SplitMode(detail)
        if (v1Mode === "personal" && detail) {
          const { personalItems: items } = splitDetailToInput(detail)
          setSplitMode("custom")
          setCustomMode("personal")
          setFixedMembers(new Set())
          setPersonalItems(
            Object.fromEntries(
              Object.entries(items).map(([id, list]) => [
                id,
                list.map((i, idx) => ({ id: `item-${id}-${idx}`, name: i.name, amount: String(i.amount) })),
              ])
            )
          )
        } else if (v1Mode === "custom" && detail) {
          const { customShares: custom } = splitDetailToInput(detail)
          setSplitMode("custom")
          setCustomMode("full")
          setCustomShares(Object.fromEntries(Object.entries(custom).map(([id, v]) => [id, String(v)])))
          setFixedMembers(new Set(Object.keys(custom)))
        } else if (v1Mode === "unsupported") {
          setReadOnlyReason("此支出使用新版功能建立，請切換到新版編輯")
        }
   ```
3. `hasChanges()` 最後的 `return false` 之前加入：
   ```ts
    if (!isSameSplitDetail(originalSplitDetail, buildSplitDetail(currentSplitInput()))) return true
   ```
4. 唯讀提示：在表單最上方（`<form>` 內第一個子元素之前）加入：
   ```tsx
        {readOnlyReason && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {readOnlyReason}
          </div>
        )}
   ```
   送出按鈕的 `disabled` 加上 `|| !!readOnlyReason`；`handleSubmit` 開頭加 `if (readOnlyReason) return`。刪除按鈕不受影響。

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/components/expense-form.test.tsx`
Expected: 新舊案例全數 PASS。若既有案例因零頭修正失敗，只可能出現在「先扣再分」模式，確認差異 ≤ 0.01 且是第一位成員後更新該斷言，並在報告中列出。

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add components/expense/expense-form.tsx tests/components/expense-form.test.tsx
git commit -F - <<'EOF'
feat: v1 expense form uses shared split logic and persists splitDetail

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 5: v2 草稿狀態 `useExpenseDraft`

**Files:**
- Create: `components/v2/expense-form/use-expense-draft.ts`
- Test: `tests/components/v2/use-expense-draft.test.tsx`

**Interfaces:**
- Consumes: Task 1
- Produces:
  - `interface DraftItem { id: string; name: string; amount: string }`
  - `interface DraftMember { id: string; displayName: string }`
  - `interface DraftInit { members: DraftMember[]; currency: string; paidBy: string; expense?: { amount: number; currency: string; description: string | null; category: string | null; paidByMemberId: string; expenseDate: string; location: string | null; latitude: number | null; longitude: number | null; image: string | null; participants: { memberId: string }[]; splitDetail: SplitDetail | null } }`
  - `useExpenseDraft(init: DraftInit)` 回傳 `{ state, actions, derived }`：
    - `state`：`amount`、`currency`、`description`、`category`、`paidBy`、`expenseDate: Date`、`location: { location; latitude; longitude }`、`image: { image: string | null; pendingFile: File | null; preview: string | null }`、`notifyLine: boolean`、`pool: string[]`、`personalMode: boolean`、`personalItems: Record<string, DraftItem[]>`、`personalMembers: string[]`、`customShares: Record<string, string>`
    - `actions`：`setAmount`、`setCurrency`、`setDescription`、`setCategory`、`setPaidBy`、`setExpenseDate`、`setLocation`、`setImage`、`setNotifyLine`、`togglePool(id)`、`setPoolAll(selectAll: boolean)`、`setPersonalMode(on)`、`togglePersonalMember(id)`、`addItem(memberId)`、`updateItem(memberId, itemId, field: "name" | "amount", value)`、`removeItem(memberId, itemId)`、`setCustomShare(memberId, value: string)`、`clearCustomShare(memberId)`
    - `derived`：`splitInput: SplitInput`、`shares: ParticipantShare[]`、`splitDetail: SplitDetail | null`、`personalTotal: number`、`itemCount: number`、`autoRemaining: number`、`matches: boolean`、`error: string | null`
  - 規則：
    - 參與者 = `members` 順序中，在 `pool` 內、或（`personalMode` 且在 `personalMembers` 且有項目）的成員
    - `personalItems` 只在 `personalMode` 時計入；項目名稱去頭尾空白，金額 `Number(x) || 0`
    - `customShares`：pool 成員若 `customShares[id]` 非空字串 → `Number`；personal-only 成員（不在 pool）→ `0`
    - `autoRemaining` = 金額 − 個人項目合計 − 指定金額合計（≥ 0 時才顯示，負值照回傳）
    - `matches` = 有參與者，且 shares 總和與金額差 ≤ 0.01，且每人 shareAmount ≥ 0
    - `error`（依序第一個成立者）：金額非有效數字或 < 0 →「請輸入有效金額」；未選付款人 →「請選擇付款人」；無參與者 →「請選擇至少一位分擔者」；有項目名稱為空 →「{成員名} 有個人項目未填寫名稱」；個人項目合計 > 金額 →「個人項目總額不可超過支出總額」；`!matches` →「分攤金額與支出金額不符」；否則 `null`
  - 初始值：新增時 `pool` = 所有成員、`personalMode` = false、`category` = ""、`expenseDate` = now；編輯時由 `expense` 還原（`splitDetail` 的 personalItems 開啟 personalMode；`customShares` 中值為 0 且不在 pool 的成員視為 personal-only；pool = participants 中不是 personal-only 的成員）

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/use-expense-draft.test.tsx
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useExpenseDraft, type DraftInit } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
  { id: "c", displayName: "阿凱" },
]
const init: DraftInit = { members, currency: "TWD", paidBy: "a" }

function setup(extra: Partial<DraftInit> = {}) {
  return renderHook(() => useExpenseDraft({ ...init, ...extra }))
}

describe("useExpenseDraft", () => {
  it("starts with everyone in the pool and an equal split", () => {
    const { result } = setup()
    act(() => result.current.actions.setAmount("300"))
    expect(result.current.state.pool).toEqual(["a", "b", "c"])
    expect(result.current.derived.shares.map((s) => s.shareAmount)).toEqual([100, 100, 100])
    expect(result.current.derived.splitDetail).toBeNull()
    expect(result.current.derived.matches).toBe(true)
    expect(result.current.derived.error).toBeNull()
  })

  it("adds personal items and builds splitDetail", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("300")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("b")
    })
    const itemId = result.current.state.personalItems.b[0].id
    act(() => {
      result.current.actions.updateItem("b", itemId, "name", "咖啡")
      result.current.actions.updateItem("b", itemId, "amount", "60")
    })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 80 },
      { memberId: "b", shareAmount: 140 },
      { memberId: "c", shareAmount: 80 },
    ])
    expect(result.current.derived.splitDetail).toEqual({
      version: 1,
      personalItems: { b: [{ name: "咖啡", amount: 60 }] },
      customShares: {},
    })
    expect(result.current.derived.personalTotal).toBe(60)
    expect(result.current.derived.itemCount).toBe(1)
  })

  it("treats a personal-only member as custom 0", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.togglePool("c")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("c")
    })
    const itemId = result.current.state.personalItems.c[0].id
    act(() => {
      result.current.actions.updateItem("c", itemId, "name", "紀念品")
      result.current.actions.updateItem("c", itemId, "amount", "10")
    })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 45 },
      { memberId: "b", shareAmount: 45 },
      { memberId: "c", shareAmount: 10 },
    ])
    expect(result.current.derived.splitDetail?.customShares).toEqual({ c: 0 })
  })

  it("applies a custom share and reports the auto remainder", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
      result.current.actions.setCustomShare("a", "40")
    })
    expect(result.current.derived.autoRemaining).toBe(60)
    expect(result.current.derived.shares.map((s) => s.shareAmount)).toEqual([40, 30, 30])
    act(() => result.current.actions.clearCustomShare("a"))
    expect(result.current.derived.splitDetail).toBeNull()
  })

  it.each([
    ["invalid amount", (d: ReturnType<typeof useExpenseDraft>) => d.actions.setAmount("abc"), "請輸入有效金額"],
    ["no payer", (d: ReturnType<typeof useExpenseDraft>) => d.actions.setPaidBy(""), "請選擇付款人"],
    ["no participants", (d: ReturnType<typeof useExpenseDraft>) => d.actions.setPoolAll(false), "請選擇至少一位分擔者"],
  ])("reports %s", (_label, act_, message) => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("100")
    })
    act(() => act_(result.current))
    expect(result.current.derived.error).toBe(message)
  })

  it("blocks personal items above the total and unnamed items", () => {
    const { result } = setup()
    act(() => {
      result.current.actions.setAmount("50")
      result.current.actions.setPersonalMode(true)
      result.current.actions.togglePersonalMember("a")
    })
    const itemId = result.current.state.personalItems.a[0].id
    act(() => result.current.actions.updateItem("a", itemId, "amount", "60"))
    expect(result.current.derived.error).toBe("小雨 有個人項目未填寫名稱")
    act(() => result.current.actions.updateItem("a", itemId, "name", "晚餐"))
    expect(result.current.derived.error).toBe("個人項目總額不可超過支出總額")
  })

  it("restores an existing expense with personal items and custom shares", () => {
    const { result } = setup({
      expense: {
        amount: 100,
        currency: "JPY",
        description: "晚餐",
        category: "food",
        paidByMemberId: "b",
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        location: null,
        latitude: null,
        longitude: null,
        image: null,
        participants: [{ memberId: "a" }, { memberId: "b" }, { memberId: "c" }],
        splitDetail: {
          version: 1,
          personalItems: { c: [{ name: "紀念品", amount: 10 }] },
          customShares: { c: 0, a: 40 },
        },
      },
    })
    expect(result.current.state.pool).toEqual(["a", "b"])
    expect(result.current.state.personalMode).toBe(true)
    expect(result.current.state.personalMembers).toEqual(["c"])
    expect(result.current.state.customShares).toEqual({ a: "40" })
    expect(result.current.derived.shares).toEqual([
      { memberId: "a", shareAmount: 40 },
      { memberId: "b", shareAmount: 50 },
      { memberId: "c", shareAmount: 10 },
    ])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/v2/use-expense-draft.test.tsx`
Expected: FAIL，模組不存在

- [ ] **Step 3: Write the hook**

```ts
// components/v2/expense-form/use-expense-draft.ts
"use client"

import { useMemo, useState } from "react"
import {
  buildSplitDetail,
  computeShares,
  type SplitDetail,
  type SplitInput,
} from "@/lib/expense-split"

export interface DraftItem {
  id: string
  name: string
  amount: string
}

export interface DraftMember {
  id: string
  displayName: string
}

export interface DraftInit {
  members: DraftMember[]
  currency: string
  paidBy: string
  expense?: {
    amount: number
    currency: string
    description: string | null
    category: string | null
    paidByMemberId: string
    expenseDate: string
    location: string | null
    latitude: number | null
    longitude: number | null
    image: string | null
    participants: { memberId: string }[]
    splitDetail: SplitDetail | null
  }
}

let itemSeq = 0
const newItem = (name = "", amount = ""): DraftItem => ({ id: `draft-item-${++itemSeq}`, name, amount })

function initialState(init: DraftInit) {
  const e = init.expense
  if (!e) {
    return {
      amount: "",
      currency: init.currency,
      description: "",
      category: "",
      paidBy: init.paidBy,
      expenseDate: new Date(),
      location: { location: null as string | null, latitude: null as number | null, longitude: null as number | null },
      image: { image: null as string | null, pendingFile: null as File | null, preview: null as string | null },
      notifyLine: true,
      pool: init.members.map((m) => m.id),
      personalMode: false,
      personalItems: {} as Record<string, DraftItem[]>,
      personalMembers: [] as string[],
      customShares: {} as Record<string, string>,
    }
  }
  const detail = e.splitDetail
  const personalOnly = new Set(
    Object.entries(detail?.customShares ?? {})
      .filter(([id, v]) => v === 0 && (detail?.personalItems[id]?.length ?? 0) > 0)
      .map(([id]) => id)
  )
  const personalItems: Record<string, DraftItem[]> = {}
  for (const [id, items] of Object.entries(detail?.personalItems ?? {})) {
    personalItems[id] = items.map((i) => newItem(i.name, String(i.amount)))
  }
  const customShares: Record<string, string> = {}
  for (const [id, v] of Object.entries(detail?.customShares ?? {})) {
    if (!personalOnly.has(id)) customShares[id] = String(v)
  }
  return {
    amount: String(e.amount),
    currency: e.currency,
    description: e.description ?? "",
    category: e.category ?? "",
    paidBy: e.paidByMemberId,
    expenseDate: new Date(e.expenseDate),
    location: { location: e.location, latitude: e.latitude, longitude: e.longitude },
    image: { image: e.image, pendingFile: null, preview: null },
    notifyLine: true,
    pool: e.participants.map((p) => p.memberId).filter((id) => !personalOnly.has(id)),
    personalMode: Object.keys(personalItems).length > 0,
    personalItems,
    personalMembers: Object.keys(personalItems),
    customShares,
  }
}

export function useExpenseDraft(init: DraftInit) {
  const [state, setState] = useState(() => initialState(init))
  const set = <K extends keyof typeof state>(key: K) => (value: (typeof state)[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const actions = {
    setAmount: set("amount"),
    setCurrency: set("currency"),
    setDescription: set("description"),
    setCategory: set("category"),
    setPaidBy: set("paidBy"),
    setExpenseDate: set("expenseDate"),
    setLocation: set("location"),
    setImage: set("image"),
    setNotifyLine: set("notifyLine"),
    setPersonalMode: set("personalMode"),
    togglePool: (id: string) =>
      setState((s) => {
        const next = s.pool.includes(id) ? s.pool.filter((x) => x !== id) : [...s.pool, id]
        const customShares = { ...s.customShares }
        if (!next.includes(id)) delete customShares[id]
        return { ...s, pool: next, customShares }
      }),
    setPoolAll: (selectAll: boolean) =>
      setState((s) => ({ ...s, pool: selectAll ? init.members.map((m) => m.id) : [], customShares: selectAll ? s.customShares : {} })),
    togglePersonalMember: (id: string) =>
      setState((s) => {
        if (s.personalMembers.includes(id)) {
          const personalItems = { ...s.personalItems }
          delete personalItems[id]
          return { ...s, personalMembers: s.personalMembers.filter((x) => x !== id), personalItems }
        }
        return {
          ...s,
          personalMembers: [...s.personalMembers, id],
          personalItems: { ...s.personalItems, [id]: [newItem()] },
        }
      }),
    addItem: (memberId: string) =>
      setState((s) => ({ ...s, personalItems: { ...s.personalItems, [memberId]: [...(s.personalItems[memberId] ?? []), newItem()] } })),
    updateItem: (memberId: string, itemId: string, field: "name" | "amount", value: string) =>
      setState((s) => ({
        ...s,
        personalItems: {
          ...s.personalItems,
          [memberId]: (s.personalItems[memberId] ?? []).map((i) => (i.id === itemId ? { ...i, [field]: value } : i)),
        },
      })),
    removeItem: (memberId: string, itemId: string) =>
      setState((s) => ({
        ...s,
        personalItems: { ...s.personalItems, [memberId]: (s.personalItems[memberId] ?? []).filter((i) => i.id !== itemId) },
      })),
    setCustomShare: (memberId: string, value: string) =>
      setState((s) => ({ ...s, customShares: { ...s.customShares, [memberId]: value } })),
    clearCustomShare: (memberId: string) =>
      setState((s) => {
        const customShares = { ...s.customShares }
        delete customShares[memberId]
        return { ...s, customShares }
      }),
  }

  const derived = useMemo(() => {
    const amountNum = Number(state.amount)
    const withItems = (id: string) =>
      state.personalMode && state.personalMembers.includes(id) && (state.personalItems[id]?.length ?? 0) > 0
    const participantIds = init.members.map((m) => m.id).filter((id) => state.pool.includes(id) || withItems(id))

    const personalItems: SplitInput["personalItems"] = {}
    if (state.personalMode) {
      for (const id of participantIds) {
        const items = state.personalItems[id] ?? []
        if (items.length > 0) personalItems[id] = items.map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 0 }))
      }
    }
    const customShares: SplitInput["customShares"] = {}
    for (const id of participantIds) {
      if (!state.pool.includes(id)) customShares[id] = 0
      else if ((state.customShares[id] ?? "").trim() !== "") customShares[id] = Number(state.customShares[id]) || 0
    }

    const splitInput: SplitInput = {
      amount: Number.isFinite(amountNum) ? amountNum : 0,
      participantIds,
      personalItems,
      customShares,
    }
    const shares = computeShares(splitInput)
    const personalTotal = Object.values(personalItems).flat().reduce((s, i) => s + i.amount, 0)
    const itemCount = Object.values(personalItems).flat().length
    const customTotal = Object.values(customShares).reduce((s, v) => s + v, 0)
    const autoRemaining = Math.round((splitInput.amount - personalTotal - customTotal) * 100) / 100
    const shareTotal = shares.reduce((s, x) => s + x.shareAmount, 0)
    const matches =
      shares.length > 0 && Math.abs(shareTotal - splitInput.amount) <= 0.01 && shares.every((s) => s.shareAmount >= 0)

    let error: string | null = null
    const unnamed = participantIds.find((id) => (state.personalMode ? state.personalItems[id] ?? [] : []).some((i) => !i.name.trim()))
    if (state.amount.trim() === "" || !Number.isFinite(amountNum) || amountNum < 0) error = "請輸入有效金額"
    else if (!state.paidBy) error = "請選擇付款人"
    else if (participantIds.length === 0) error = "請選擇至少一位分擔者"
    else if (unnamed) error = `${init.members.find((m) => m.id === unnamed)?.displayName} 有個人項目未填寫名稱`
    else if (personalTotal > splitInput.amount) error = "個人項目總額不可超過支出總額"
    else if (!matches) error = "分攤金額與支出金額不符"

    return { splitInput, shares, splitDetail: buildSplitDetail(splitInput), personalTotal, itemCount, autoRemaining, matches, error }
  }, [state, init.members])

  return { state, actions, derived }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/v2/use-expense-draft.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add components/v2/expense-form/use-expense-draft.ts tests/components/v2/use-expense-draft.test.tsx
git commit -F - <<'EOF'
feat: Add v2 expense draft state with shared split calculation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 6: v2 表單畫面

**Files:**
- Create: `components/v2/expense-form/amount-card.tsx`
- Create: `components/v2/expense-form/category-picker.tsx`
- Create: `components/v2/expense-form/payer-picker.tsx`
- Create: `components/v2/expense-form/split-editor.tsx`
- Create: `components/v2/expense-form/expense-form-v2-view.tsx`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`

**Interfaces:**
- Consumes: Task 5（`useExpenseDraft` 的回傳型別）；v1 元件 `Calculator`、`CurrencySelect`、`Calendar`、`Popover`、`LocationPicker`、`ImagePicker`；`V2TopBar`；`CATEGORY_ICONS`、`CATEGORY_LABELS`、`EXPENSE_CATEGORIES`；`CATEGORY_TONES`（`components/v2/category-style.ts`）；`formatCurrency`
- Produces:
  - `ExpenseFormV2View(props: { mode: "create" | "edit"; projectId: string; members: DraftMember[]; draft: ReturnType<typeof useExpenseDraft>; canNotifyLine: boolean; submitting: boolean; submitError: string | null; onSubmit: () => void; onRequestDelete?: () => void })`

版面數值取自 `design/project/AddExpense.dc.html`：頂列 32px 關閉鈕；金額卡 `rounded-[20px]` 漸層、36px serif 金額；描述輸入 `rounded-xl`；類別 4 欄 `gap-1.5`、`rounded-[14px]`、選中 `border-[1.5px] border-[#2F8F74] bg-v2-lake-soft text-v2-lake`；成員 pill `rounded-full px-3.5 py-[5px]`、20px 頭像；分攤明細列 `bg-v2-lake-soft px-3.5 py-3`；底部固定按鈕 `rounded-[14px] py-[15px] text-[15px] font-bold bg-v2-lake`。

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/expense-form-v2-view.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/components/location-picker", () => ({ LocationPicker: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))
vi.mock("@/components/ui/calculator", () => ({ Calculator: () => <div data-testid="calculator" /> }))

import { ExpenseFormV2View } from "@/components/v2/expense-form/expense-form-v2-view"
import { useExpenseDraft } from "@/components/v2/expense-form/use-expense-draft"

const members = [
  { id: "a", displayName: "小雨" },
  { id: "b", displayName: "志明" },
]

function renderForm(overrides: Partial<Parameters<typeof ExpenseFormV2View>[0]> = {}) {
  const hook = renderHook(() => useExpenseDraft({ members, currency: "TWD", paidBy: "a" }))
  const onSubmit = vi.fn()
  const view = () => (
    <ExpenseFormV2View
      mode="create"
      projectId="p1"
      members={members}
      draft={hook.result.current}
      canNotifyLine={true}
      submitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...overrides}
    />
  )
  const utils = render(view())
  const rerender = () => utils.rerender(view())
  return { hook, onSubmit, rerender }
}

describe("ExpenseFormV2View", () => {
  it("shows the amount, categories, payer and submit label", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("1280"))
    rerender()
    expect(screen.getByLabelText("金額")).toHaveValue("1280")
    expect(screen.getByRole("button", { name: "餐飲" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "小雨" })).toBeChecked()
    expect(screen.getByRole("button", { name: "新增支出 · TWD 1,280" })).toBeInTheDocument()
  })

  it("selects a category and a payer", () => {
    const { hook, rerender } = renderForm()
    fireEvent.click(screen.getByRole("button", { name: "交通" }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    rerender()
    expect(hook.result.current.state.category).toBe("transport")
    expect(hook.result.current.state.paidBy).toBe("b")
    expect(screen.getByRole("button", { name: "交通" })).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the split summary and matched state", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    const split = screen.getByRole("region", { name: "分攤成員" })
    expect(within(split).getByText("已選 2 人")).toBeInTheDocument()
    expect(within(split).getByText("金額相符")).toBeInTheDocument()
    expect(within(split).getByText("個人項目 TWD 0（0 項）＋ 共同分攤 TWD 100（2 人）＝ TWD 100 / TWD 100")).toBeInTheDocument()
  })

  it("edits personal items", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("switch", { name: "先扣個人項目" }))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "志明加入個人項目" }))
    rerender()
    fireEvent.change(screen.getByLabelText("志明的品項名稱 1"), { target: { value: "咖啡" } })
    rerender()
    fireEvent.change(screen.getByLabelText("志明的品項金額 1"), { target: { value: "20" } })
    rerender()
    expect(hook.result.current.derived.shares.find((s) => s.memberId === "b")?.shareAmount).toBe(60)
  })

  it("sets a custom share for a pool member", () => {
    const { hook, rerender } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.change(screen.getByLabelText("小雨的分攤金額"), { target: { value: "30" } })
    rerender()
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([30, 70])
    fireEvent.click(screen.getByRole("button", { name: "小雨恢復自動分攤" }))
    rerender()
    expect(hook.result.current.derived.shares.map((s) => s.shareAmount)).toEqual([50, 50])
  })

  it("disables submit and shows the draft error", () => {
    renderForm()
    expect(screen.getByRole("alert")).toHaveTextContent("請輸入有效金額")
    expect(screen.getByRole("button", { name: /新增支出/ })).toBeDisabled()
  })

  it("submits when valid", () => {
    const { hook, rerender, onSubmit } = renderForm()
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("shows the LINE toggle only when notifications are possible", () => {
    renderForm({ canNotifyLine: false })
    expect(screen.queryByText("通知 LINE 群組")).not.toBeInTheDocument()
  })

  it("edit mode shows 儲存變更 and delete", () => {
    const onRequestDelete = vi.fn()
    const { hook, rerender } = renderForm({ mode: "edit", onRequestDelete })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("button", { name: "儲存變更" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "刪除支出" }))
    expect(onRequestDelete).toHaveBeenCalled()
  })

  it("shows the server error", () => {
    const { hook, rerender } = renderForm({ submitError: "分攤明細與分攤金額不一致" })
    act(() => hook.result.current.actions.setAmount("100"))
    rerender()
    expect(screen.getByRole("alert")).toHaveTextContent("分攤明細與分攤金額不一致")
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write the section components**

```tsx
// components/v2/expense-form/amount-card.tsx
"use client"

import { Calculator as CalculatorIcon } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import type { CurrencyCode } from "@/lib/constants/currencies"

interface AmountCardProps {
  amount: string
  currency: string
  onAmount: (value: string) => void
  onCurrency: (code: string) => void
  onOpenCalculator: () => void
}

export function AmountCard({ amount, currency, onAmount, onCurrency, onOpenCalculator }: AmountCardProps) {
  return (
    <div className="mx-4 mt-4 rounded-[20px] border border-[#DCEAE3] bg-gradient-to-br from-v2-lake-soft to-v2-paper px-5 py-[18px] shadow-[0_2px_8px_rgba(27,88,71,.07)]">
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor="v2-amount" className="text-sm font-medium leading-5 tracking-[.1px]">
          輸入金額
        </label>
        <button
          type="button"
          onClick={onOpenCalculator}
          aria-label="開啟計算機"
          className="inline-flex items-center gap-1 rounded-full bg-v2-surface px-3.5 py-1.5 text-xs font-bold text-v2-lake shadow-[0_1px_2px_rgba(27,24,21,.06)]"
        >
          <CalculatorIcon className="h-3.5 w-3.5" aria-hidden="true" />
          計算機
        </button>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="shrink-0">
          <CurrencySelect value={currency as CurrencyCode} onValueChange={(v) => onCurrency(v)} />
        </div>
        <input
          id="v2-amount"
          aria-label="金額"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="0"
          className="min-w-0 flex-1 bg-transparent font-v2-serif text-[36px] font-bold leading-[44px] tabular-nums outline-none"
        />
      </div>
    </div>
  )
}
```

`CurrencySelect` 的 props 以實際元件為準（讀 `components/ui/currency-select.tsx`，照 v1 表單的用法傳值）。

```tsx
// components/v2/expense-form/category-picker.tsx
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { CATEGORY_TONES } from "@/components/v2/category-style"

export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <div className="mx-4 mb-3">
      <p className="mb-1.5 text-sm font-medium leading-5 tracking-[.1px]">類別</p>
      <div className="grid grid-cols-4 gap-1.5">
        {EXPENSE_CATEGORIES.map((key) => {
          const Icon = CATEGORY_ICONS[key]
          const active = value === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : key)}
              className={`flex items-center justify-center gap-[5px] rounded-[14px] px-1 py-2 text-xs ${
                active
                  ? "border-[1.5px] border-[#2F8F74] bg-v2-lake-soft font-bold text-v2-lake"
                  : `border-[1.5px] border-v2-line font-semibold ${CATEGORY_TONES[key]}`
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {CATEGORY_LABELS[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

```tsx
// components/v2/expense-form/payer-picker.tsx
import type { DraftMember } from "./use-expense-draft"

const AVATAR_TONES = ["bg-[#D2EAE1] text-v2-lake", "bg-[#FBE3D2] text-[#C4602F]", "bg-v2-plum-soft text-v2-plum", "bg-v2-rose-soft text-v2-rose"]

export function memberTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length]
}

export function PayerPicker({ members, value, onChange }: { members: DraftMember[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="mx-4 mb-4">
      <legend className="mb-2.5 text-sm font-medium leading-5 tracking-[.1px]">付款人</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((m, i) => {
          const checked = value === m.id
          return (
            <label
              key={m.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
                checked ? "border border-v2-lake bg-v2-lake text-white" : "border border-[#DDEDE6] bg-v2-lake-soft text-v2-ink"
              }`}
            >
              <input type="radio" name="v2-payer" className="sr-only" checked={checked} onChange={() => onChange(m.id)} aria-label={m.displayName} />
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(i)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
```

```tsx
// components/v2/expense-form/split-editor.tsx
"use client"

import { CheckCircle2, Plus, RotateCcw, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"
import { memberTone } from "./payer-picker"

type Draft = ReturnType<typeof useExpenseDraft>

const smallButton = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
const itemInput = "min-w-0 rounded-lg border border-[#DDEDE6] bg-v2-surface px-2.5 py-1.5 text-xs outline-none"

export function SplitEditor({ members, draft, currency }: { members: DraftMember[]; draft: Draft; currency: string }) {
  const { state, actions, derived } = draft
  const fmt = (n: number) => formatCurrency(Math.round(n * 100) / 100, currency)
  const tone = (id: string) => memberTone(members.findIndex((m) => m.id === id))
  const name = (id: string) => members.find((m) => m.id === id)?.displayName ?? ""
  const shareOf = (id: string) => derived.shares.find((s) => s.memberId === id)?.shareAmount ?? 0
  const allInPool = members.every((m) => state.pool.includes(m.id))
  const poolCount = state.pool.length

  return (
    <section aria-label="分攤成員" className="mx-4 mb-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">分攤成員</p>
        <label className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${state.personalMode ? "text-v2-link" : "text-v2-ink-muted"}`}>先扣個人項目</span>
          <button
            type="button"
            role="switch"
            aria-checked={state.personalMode}
            aria-label="先扣個人項目"
            onClick={() => actions.setPersonalMode(!state.personalMode)}
            className={`relative inline-block h-[19px] w-8 shrink-0 rounded-full ${state.personalMode ? "bg-v2-link" : "bg-[#DCD3C2]"}`}
          >
            <span className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white transition-[left] ${state.personalMode ? "left-[15px]" : "left-0.5"}`} />
          </button>
        </label>
      </div>

      {state.personalMode && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-semibold text-v2-ink-muted">個人項目</p>
          <div className="mb-2.5 flex flex-wrap gap-2">
            {members
              .filter((m) => !state.personalMembers.includes(m.id))
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-label={`${m.displayName}加入個人項目`}
                  onClick={() => actions.togglePersonalMember(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#DDEDE6] bg-v2-lake-soft px-3.5 py-[5px]"
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                    {m.displayName.charAt(0)}
                  </span>
                  <span className="text-xs font-semibold">{m.displayName}</span>
                </button>
              ))}
          </div>
          {state.personalMembers.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-v2-line bg-v2-surface py-3.5 text-center text-xs text-v2-ink-subtle">
              目前沒有人有個人項目，點上面的名字挑一位。
            </p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-v2-line bg-v2-surface">
              {state.personalMembers.map((id) => {
                const items = state.personalItems[id] ?? []
                const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
                return (
                  <div key={id} className="border-b border-[#F0EAE0] bg-v2-lake-soft px-3.5 py-2 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${tone(id)}`} aria-hidden="true">
                        {name(id).charAt(0)}
                      </span>
                      <span className="flex flex-1 items-center justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{name(id)}</span>
                        <span className="font-bold">{fmt(sum)}</span>
                      </span>
                      <button type="button" aria-label={`為${name(id)}新增品項`} onClick={() => actions.addItem(id)} className={`${smallButton} bg-[#D2EAE1] text-v2-lake`}>
                        <Plus className="h-3 w-3" />
                      </button>
                      <button type="button" aria-label={`移除${name(id)}的個人項目`} onClick={() => actions.togglePersonalMember(id)} className={`${smallButton} bg-[#F6DCD3] text-[#C4432A]`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="ml-[34px] mt-1 border-l border-[#DCD3C2] pl-2.5">
                      {items.map((item, idx) => (
                        <div key={item.id} className="mt-1.5 flex items-center gap-1.5">
                          <input
                            aria-label={`${name(id)}的品項名稱 ${idx + 1}`}
                            placeholder="品項名稱"
                            value={item.name}
                            onChange={(e) => actions.updateItem(id, item.id, "name", e.target.value)}
                            className={`${itemInput} flex-[2]`}
                          />
                          <input
                            aria-label={`${name(id)}的品項金額 ${idx + 1}`}
                            placeholder="金額"
                            inputMode="decimal"
                            value={item.amount}
                            onChange={(e) => actions.updateItem(id, item.id, "amount", e.target.value)}
                            className={`${itemInput} flex-1`}
                          />
                          <button type="button" aria-label="刪除項目" onClick={() => actions.removeItem(id, item.id)} className="flex h-5 w-5 shrink-0 items-center justify-center text-[#C4432A]">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-2.5 mt-3 flex items-center justify-between gap-2">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">
          共同分攤 <span className="font-bold text-v2-lake">（剩餘應攤分金額 {fmt(Math.max(0, derived.autoRemaining))}）</span>
        </p>
        <button type="button" onClick={() => actions.setPoolAll(!allInPool)} className="shrink-0 text-xs font-bold text-v2-lake">
          {allInPool ? "取消全選" : "全選"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = state.pool.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => actions.togglePool(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-[5px] ${
                on ? "border border-v2-lake bg-v2-lake text-white" : "border border-[#DDEDE6] bg-v2-lake-soft text-v2-ink opacity-50"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${tone(m.id)}`} aria-hidden="true">
                {m.displayName.charAt(0)}
              </span>
              <span className="text-xs font-semibold">{m.displayName}</span>
            </button>
          )
        })}
      </div>
      {state.pool.length > 0 && (
        <div className="mt-2.5 overflow-hidden rounded-[14px] border border-v2-line bg-v2-surface">
          {state.pool.map((id) => {
            const custom = state.customShares[id]
            const isCustom = custom !== undefined
            return (
              <div key={id} className="flex items-center gap-2.5 border-b border-[#F0EAE0] bg-v2-lake-soft px-3.5 py-3 last:border-b-0">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${tone(id)}`} aria-hidden="true">
                  {name(id).charAt(0)}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{name(id)}</span>
                <input
                  aria-label={`${name(id)}的分攤金額`}
                  inputMode="decimal"
                  value={isCustom ? custom : ""}
                  placeholder={String(shareOf(id))}
                  onChange={(e) => (e.target.value === "" ? actions.clearCustomShare(id) : actions.setCustomShare(id, e.target.value))}
                  className={`w-24 rounded-lg border px-2.5 py-1.5 text-right text-[13px] font-bold outline-none ${
                    isCustom ? "border-v2-lake bg-v2-surface" : "border-[#DDEDE6] bg-v2-surface placeholder:text-v2-ink"
                  }`}
                />
                {isCustom && (
                  <button type="button" aria-label={`${name(id)}恢復自動分攤`} onClick={() => actions.clearCustomShare(id)} className={`${smallButton} bg-[#D2EAE1] text-v2-lake`}>
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
                <button type="button" aria-label={`${name(id)}不參與共同分攤`} onClick={() => actions.togglePool(id)} className={`${smallButton} bg-[#F6DCD3] text-[#C4432A]`}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-v2-ink-muted">已選 {derived.splitInput.participantIds.length} 人</span>
          {derived.matches ? (
            <span className="flex items-center gap-1 text-xs font-bold text-v2-link">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              金額相符
            </span>
          ) : (
            <span className="text-xs font-bold text-v2-danger">金額不符</span>
          )}
        </div>
        <p className="mt-[3px] break-words text-xs leading-normal text-v2-ink-muted">
          個人項目 {fmt(derived.personalTotal)}（{derived.itemCount} 項）＋ 共同分攤 {fmt(derived.splitInput.amount - derived.personalTotal)}（{poolCount} 人）＝{" "}
          {fmt(derived.shares.reduce((s, x) => s + x.shareAmount, 0))} / {fmt(derived.splitInput.amount)}
        </p>
      </div>
    </section>
  )
}
```

```tsx
// components/v2/expense-form/expense-form-v2-view.tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Calculator } from "@/components/ui/calculator"
import { ImagePicker } from "@/components/ui/image-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LocationPicker } from "@/components/location-picker"
import { formatCurrency } from "@/lib/constants/currencies"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { AmountCard } from "./amount-card"
import { CategoryPicker } from "./category-picker"
import { PayerPicker } from "./payer-picker"
import { SplitEditor } from "./split-editor"
import type { DraftMember, useExpenseDraft } from "./use-expense-draft"

export interface ExpenseFormV2ViewProps {
  mode: "create" | "edit"
  projectId: string
  members: DraftMember[]
  draft: ReturnType<typeof useExpenseDraft>
  canNotifyLine: boolean
  submitting: boolean
  submitError: string | null
  onSubmit: () => void
  onRequestDelete?: () => void
}

const sectionTitle = "mb-2 text-sm font-medium leading-5 tracking-[.1px]"

export function ExpenseFormV2View(props: ExpenseFormV2ViewProps) {
  const { draft } = props
  const { state, actions, derived } = draft
  const [showCalculator, setShowCalculator] = useState(false)
  const error = derived.error ?? props.submitError
  const amountLabel = formatCurrency(derived.splitInput.amount, state.currency)
  const submitLabel = props.mode === "create" ? `新增支出 · ${amountLabel}` : "儲存變更"

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!derived.error) props.onSubmit()
      }}
    >
      <V2TopBar title={props.mode === "create" ? "新增支出" : "編輯支出"} backHref={`/projects/${props.projectId}`} />
      <AmountCard
        amount={state.amount}
        currency={state.currency}
        onAmount={actions.setAmount}
        onCurrency={actions.setCurrency}
        onOpenCalculator={() => setShowCalculator(true)}
      />
      {showCalculator && (
        <Calculator
          // Props follow the v1 form's usage of Calculator (read components/expense/expense-form.tsx).
          initialValue={state.amount}
          onConfirm={(value: string) => {
            actions.setAmount(value)
            setShowCalculator(false)
          }}
          onClose={() => setShowCalculator(false)}
        />
      )}
      <div className="mx-4 mb-4 mt-3.5">
        <label htmlFor="v2-desc" className={`block ${sectionTitle} mb-1.5`}>
          描述
        </label>
        <input
          id="v2-desc"
          value={state.description}
          onChange={(e) => actions.setDescription(e.target.value)}
          className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
        />
      </div>
      <CategoryPicker value={state.category} onChange={actions.setCategory} />
      <PayerPicker members={props.members} value={state.paidBy} onChange={actions.setPaidBy} />
      <SplitEditor members={props.members} draft={draft} currency={state.currency} />

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-4 w-4 text-v2-ink-muted" aria-hidden="true" />
              <span>{format(state.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={state.expenseDate} onSelect={(d) => d && actions.setExpenseDate(d)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>消費地點</p>
        <LocationPicker
          // Props follow the v1 form's usage of LocationPicker.
          value={state.location}
          onChange={actions.setLocation}
        />
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>收據/消費圖片</p>
        <ImagePicker
          // Props follow the v1 form's usage of ImagePicker.
          value={state.image}
          onChange={actions.setImage}
        />
      </div>

      {props.canNotifyLine && (
        <label className="mx-4 mb-4 flex items-center gap-2.5 rounded-[14px] border border-v2-line bg-v2-surface px-3.5 py-3">
          <input
            type="checkbox"
            checked={state.notifyLine}
            onChange={(e) => actions.setNotifyLine(e.target.checked)}
            className="h-5 w-5 accent-[#1B5847]"
          />
          <span>
            <span className="block text-xs font-bold">通知 LINE 群組</span>
            <span className="mt-px block text-xs text-v2-ink-muted">儲存後自動發送通知到群組</span>
          </span>
        </label>
      )}

      {props.mode === "edit" && props.onRequestDelete && (
        <div className="mx-4 mb-28">
          <button
            type="button"
            onClick={props.onRequestDelete}
            className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-v2-line bg-v2-surface py-3 text-[13px] font-bold text-v2-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            刪除支出
          </button>
        </div>
      )}
      <div className="h-28" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {error && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!!derived.error || props.submitting}
            className="w-full rounded-[14px] bg-v2-lake py-[15px] text-[15px] font-bold text-white disabled:opacity-40"
          >
            {props.submitting ? "儲存中..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
```

**重要**：`Calculator`、`LocationPicker`、`ImagePicker`、`CurrencySelect` 的實際 props 名稱以 v1 表單中的用法為準——先讀 `components/expense/expense-form.tsx` 中這四個元件的 JSX，照同樣的 props 傳入（上面程式中對應的 props 只是示意，名稱可能不同；`ImagePicker` 的 value 型別為 `ImagePickerValue`，與 draft 的 `image` 欄位相同形狀）。按鈕中出現的 `EEEEE` 需產生「一」這類中文星期縮寫，若 date-fns 輸出不同，改為 `(${"日一二三四五六"[state.expenseDate.getDay()]})`。

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add components/v2/expense-form tests/components/v2/expense-form-v2-view.test.tsx
git commit -F - <<'EOF'
feat: Add v2 expense form view sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 7: v2 新增／編輯容器與分流

**Files:**
- Create: `components/v2/expense-form/expense-form-v2.tsx`
- Modify: `app/projects/[id]/expenses/new/page.tsx`
- Modify: `app/projects/[id]/expenses/[expenseId]/edit/page.tsx`
- Test: `tests/components/v2/expense-form-v2.test.tsx`

**Interfaces:**
- Consumes: Task 3（`useSaveExpense`、`buildExpenseChanges`）、Task 5、Task 6；`useProjectData`；`ConfirmDeleteDialog`；`NotifyLineCheckbox`；`UiV2Scope`；`UiVersionSwitch`；`useLiff`；`useAuthFetch`
- Produces: `ExpenseFormV2({ projectId, expenseId, mode }: { projectId: string; expenseId?: string; mode: "create" | "edit" })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/expense-form-v2.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1", preferences: null }, isDevMode: false, canSendMessages: false }),
}))
vi.mock("@/lib/hooks", async (orig) => ({
  ...(await orig()),
  useProjectData: () => ({
    project: { id: "p1", name: "東京", currency: "TWD" },
    members: [
      { id: "a", displayName: "小雨", userId: "u1", user: { id: "u1" } },
      { id: "b", displayName: "志明", userId: null, user: null },
    ],
    loading: false,
    projectCurrency: "TWD",
  }),
}))
const mockSave = vi.fn()
const mockRemove = vi.fn()
vi.mock("@/lib/hooks/useSaveExpense", () => ({
  useSaveExpense: () => ({ save: mockSave, remove: mockRemove, saving: false, uploadingImage: false, deleting: false, canNotifyLine: false }),
}))
vi.mock("@/components/location-picker", () => ({ LocationPicker: () => null }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => null }))
vi.mock("@/components/ui/calculator", () => ({ Calculator: () => null }))

import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

describe("ExpenseFormV2", () => {
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue({ ok: true })
    mockRemove.mockReset().mockResolvedValue({ ok: true })
    mockPush.mockReset()
    mockAuthFetch.mockReset()
  })

  it("creates with the current user as payer and an equal split", async () => {
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("create")
    expect(req.payload.paidByMemberId).toBe("a")
    expect(req.payload.participants).toEqual([
      { memberId: "a", shareAmount: 50 },
      { memberId: "b", shareAmount: 50 },
    ])
    expect(req.payload.splitDetail).toBeNull()
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses"))
  })

  it("shows the save error and stays", async () => {
    mockSave.mockResolvedValueOnce({ ok: false, error: "新增失敗" })
    render(<ExpenseFormV2 projectId="p1" mode="create" />)
    fireEvent.change(await screen.findByLabelText("金額"), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "新增支出 · TWD 100" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("新增失敗")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("loads an expense for edit and saves with PUT data", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "e1",
        amount: 100,
        currency: "TWD",
        description: "晚餐",
        category: "food",
        image: null,
        location: null,
        latitude: null,
        longitude: null,
        expenseDate: new Date(2026, 10, 16, 19).toISOString(),
        paidByMemberId: "b",
        payer: { id: "b", displayName: "志明" },
        participants: [
          { memberId: "a", shareAmount: 60, member: { id: "a", displayName: "小雨" } },
          { memberId: "b", shareAmount: 40, member: { id: "b", displayName: "志明" } },
        ],
        splitDetail: { version: 1, personalItems: {}, customShares: { a: 60 } },
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    expect(await screen.findByDisplayValue("晚餐")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    const req = mockSave.mock.calls[0][0]
    expect(req.mode).toBe("edit")
    expect(req.expenseId).toBe("e1")
    expect(req.payload.splitDetail).toEqual({ version: 1, personalItems: {}, customShares: { a: 60 } })
  })

  it("deletes after confirmation in edit mode", async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "e1",
        amount: 100,
        currency: "TWD",
        description: "晚餐",
        category: "food",
        image: null,
        location: null,
        latitude: null,
        longitude: null,
        expenseDate: new Date().toISOString(),
        paidByMemberId: "a",
        payer: { id: "a", displayName: "小雨" },
        participants: [{ memberId: "a", shareAmount: 100, member: { id: "a", displayName: "小雨" } }],
        splitDetail: null,
      }),
    })
    render(<ExpenseFormV2 projectId="p1" expenseId="e1" mode="edit" />)
    fireEvent.click(await screen.findByRole("button", { name: "刪除支出" }))
    fireEvent.click(await screen.findByRole("button", { name: "刪除" }))
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(expect.objectContaining({ expenseId: "e1" })))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects/p1/expenses"))
  })
})
```

注意：API 回傳的 participants 是否帶 `memberId` 欄位以 `GET /api/projects/[id]/expenses/[expenseId]` 實際回應為準（v1 表單使用 `p.member.id`）；容器應以 `p.member?.id ?? p.memberId` 取得成員 id。

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/v2/expense-form-v2.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write the container**

```tsx
// components/v2/expense-form/expense-form-v2.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { useProjectData } from "@/lib/hooks"
import { useSaveExpense } from "@/lib/hooks/useSaveExpense"
import { buildExpenseChanges, type ExpenseSnapshot } from "@/lib/expense-changes"
import type { SplitDetail } from "@/lib/expense-split"
import { ExpenseFormV2View } from "./expense-form-v2-view"
import { useExpenseDraft, type DraftInit } from "./use-expense-draft"

interface LoadedExpense {
  amount: number
  currency: string | null
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  paidByMemberId?: string
  payer: { id: string; displayName: string }
  participants: { memberId?: string; shareAmount: number; member?: { id: string } }[]
  splitDetail?: SplitDetail | null
}

interface Props {
  projectId: string
  expenseId?: string
  mode: "create" | "edit"
}

export function ExpenseFormV2({ projectId, expenseId, mode }: Props) {
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency } = useProjectData(projectId)
  const [expense, setExpense] = useState<LoadedExpense | null>(null)
  const [expenseLoading, setExpenseLoading] = useState(mode === "edit")

  useEffect(() => {
    if (mode !== "edit" || !expenseId) return
    authFetch(`/api/projects/${projectId}/expenses/${expenseId}`)
      .then(async (res) => (res.ok ? setExpense(await res.json()) : null))
      .catch((error) => console.error("載入支出失敗:", error))
      .finally(() => setExpenseLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, expenseId, mode])

  const title = mode === "create" ? "新增支出" : "編輯支出"
  if (projectLoading || expenseLoading) {
    return (
      <UiV2Scope>
        <div className="mx-auto max-w-md">
          <V2TopBar title={title} backHref={`/projects/${projectId}`} />
          <div data-testid="v2-expense-form-skeleton" className="space-y-3 p-4">
            <div className="h-28 animate-pulse rounded-[20px] bg-v2-sand" />
            <div className="h-40 animate-pulse rounded-2xl bg-v2-sand" />
          </div>
        </div>
      </UiV2Scope>
    )
  }
  if (mode === "edit" && !expense) {
    return (
      <UiV2Scope>
        <div className="mx-auto max-w-md">
          <V2TopBar title={title} backHref={`/projects/${projectId}`} />
          <p className="py-8 text-center text-v2-ink-muted">找不到這筆支出</p>
        </div>
      </UiV2Scope>
    )
  }

  const draftMembers = members.map((m) => ({ id: m.id, displayName: m.displayName }))
  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? draftMembers[0]?.id ?? ""
  const init: DraftInit = {
    members: draftMembers,
    currency: projectCurrency,
    paidBy: currentMemberId,
    expense: expense
      ? {
          amount: Number(expense.amount),
          currency: expense.currency || projectCurrency,
          description: expense.description,
          category: expense.category,
          paidByMemberId: expense.paidByMemberId ?? expense.payer.id,
          expenseDate: expense.expenseDate,
          location: expense.location,
          latitude: expense.latitude,
          longitude: expense.longitude,
          image: expense.image,
          participants: expense.participants.map((p) => ({ memberId: p.member?.id ?? p.memberId ?? "" })),
          splitDetail: expense.splitDetail ?? null,
        }
      : undefined,
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <LoadedForm
          key={expenseId ?? "new"}
          projectId={projectId}
          expenseId={expenseId}
          mode={mode}
          projectName={project?.name ?? ""}
          init={init}
          original={expense}
        />
      </div>
    </UiV2Scope>
  )
}

function LoadedForm({
  projectId,
  expenseId,
  mode,
  projectName,
  init,
  original,
}: Props & { projectName: string; init: DraftInit; original: LoadedExpense | null }) {
  const router = useRouter()
  const draft = useExpenseDraft(init)
  const { save, remove, saving, uploadingImage, deleting, canNotifyLine } = useSaveExpense(projectId)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const nameOf = (id: string) => init.members.find((m) => m.id === id)?.displayName ?? "未知"

  async function handleSubmit() {
    const { state, derived } = draft
    if (derived.error) return
    setSubmitError(null)
    const category = state.category || "other"
    const description = state.description.trim() || null
    const next: ExpenseSnapshot = {
      amount: derived.splitInput.amount,
      currency: state.currency,
      description,
      category,
      paidByMemberId: state.paidBy,
      payerName: nameOf(state.paidBy),
      expenseDate: state.expenseDate,
      location: state.location.location,
      image: state.image.pendingFile ? "pending" : state.image.image,
      participantIds: derived.splitInput.participantIds,
    }
    const changes =
      mode === "edit" && original
        ? buildExpenseChanges(
            {
              amount: Number(original.amount),
              currency: original.currency ?? state.currency,
              description: original.description,
              category: original.category,
              paidByMemberId: original.paidByMemberId ?? original.payer.id,
              payerName: original.payer.displayName,
              expenseDate: new Date(original.expenseDate),
              location: original.location,
              image: original.image,
              participantIds: original.participants.map((p) => p.member?.id ?? p.memberId ?? ""),
            },
            next,
            { imageReplaced: state.image.pendingFile !== null }
          )
        : []
    const result = await save({
      mode,
      expenseId,
      payload: {
        paidByMemberId: state.paidBy,
        amount: derived.splitInput.amount,
        currency: state.currency,
        description,
        category,
        location: state.location.location,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
        expenseDate: state.expenseDate.toISOString(),
        participants: derived.shares,
        splitDetail: derived.splitDetail,
      },
      image: {
        url: state.image.image,
        pendingFile: state.image.pendingFile,
        pendingDeleteUrl: original?.image && original.image !== state.image.image ? original.image : null,
      },
      notification: { requested: state.notifyLine, projectName, payerName: nameOf(state.paidBy), changes },
    })
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  async function handleDelete() {
    if (!expenseId || !original) return
    const result = await remove({
      expenseId,
      notification: {
        requested: draft.state.notifyLine,
        projectName,
        payerName: original.payer.displayName,
        amount: Number(original.amount),
        description: original.description,
        category: original.category,
        participantCount: original.participants.length,
      },
    })
    if (!result.ok) {
      setShowDelete(false)
      setSubmitError(result.error)
      return
    }
    router.push(`/projects/${projectId}/expenses`)
  }

  return (
    <>
      <ExpenseFormV2View
        mode={mode}
        projectId={projectId}
        members={init.members}
        draft={draft}
        canNotifyLine={canNotifyLine}
        submitting={saving || uploadingImage}
        submitError={submitError}
        onSubmit={handleSubmit}
        onRequestDelete={mode === "edit" ? () => setShowDelete(true) : undefined}
      />
      <ConfirmDeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {canNotifyLine && <NotifyLineCheckbox checked={draft.state.notifyLine} onChange={draft.actions.setNotifyLine} />}
      </ConfirmDeleteDialog>
    </>
  )
}
```

- [ ] **Step 4: Wire the routes**

`app/projects/[id]/expenses/new/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { ExpenseForm } from "@/components/expense/expense-form"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

export default function NewExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <UiVersionSwitch
      v1={<ExpenseForm projectId={id} mode="create" />}
      v2={<ExpenseFormV2 projectId={id} mode="create" />}
    />
  )
}
```

`app/projects/[id]/expenses/[expenseId]/edit/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { ExpenseForm } from "@/components/expense/expense-form"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExpenseFormV2 } from "@/components/v2/expense-form/expense-form-v2"

export default function EditExpense({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const { id, expenseId } = use(params)
  return (
    <UiVersionSwitch
      v1={<ExpenseForm projectId={id} expenseId={expenseId} mode="edit" />}
      v2={<ExpenseFormV2 projectId={id} expenseId={expenseId} mode="edit" />}
    />
  )
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/components/v2/expense-form-v2.test.tsx`
Expected: PASS

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`

```bash
git add components/v2/expense-form/expense-form-v2.tsx "app/projects/[id]/expenses/new/page.tsx" "app/projects/[id]/expenses/[expenseId]/edit/page.tsx" tests/components/v2/expense-form-v2.test.tsx
git commit -F - <<'EOF'
feat: Add v2 add/edit expense pages (A3) behind ui version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 8: 整體驗證

- [ ] **Step 1: Build、測試、lint**

Run:
```bash
node -r dotenv/config node_modules/prisma/build/index.js generate
npm run build
npm run test:run
npm run lint
```
Expected: build 成功；測試 0 失敗；lint 無新錯誤。

- [ ] **Step 2: 部署前的資料庫步驟（由維護者執行，開發過程不執行）**

```bash
npx prisma db push
# 或手動：ALTER TABLE "expenses" ADD COLUMN "split_detail" JSONB;
```

- [ ] **Step 3: Manual comparison（開發模式，由用戶執行；需先在開發資料庫執行 Step 2）**

| 情境 | 預期 |
|---|---|
| v1 新增「先扣再分」支出，再用 v1 編輯 | 個人項目正確還原 |
| v2 新增含個人項目＋指定金額的支出，再用 v1 開啟 | 顯示唯讀提示、不能儲存、可以刪除 |
| v2 開啟 v1 建立的任何支出 | 分攤正確還原，存檔後結算金額不變 |
| v2 只改描述存檔 | 分攤與 splitDetail 不變 |
| v2 個人項目合計超過總額 | 底部顯示錯誤、按鈕停用 |
