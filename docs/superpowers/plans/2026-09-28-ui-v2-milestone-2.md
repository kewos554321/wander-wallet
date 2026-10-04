# UI v2 里程碑 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 A6 全部支出、A5 結算、A7 成員、A8 統計的 v2 畫面；v1 行為與畫面不變。

**Architecture:** 沿用里程碑 1：路由檔以 `UiVersionSwitch` 分流；原頁面原樣搬到 `components/v1/<page>/`；資料抓取與寫入抽成共用 hook、計算抽成純函式，v1 同步改用。v2 元件放 `components/v2/<page>/`，以 `UiV2Scope` 包裝，樣式只用 v2 tokens。

**Tech Stack:** Next.js 16（client components）、React 19、TypeScript 5、Tailwind v4、Vitest + Testing Library（jsdom）、lucide-react、shadcn/ui（Dialog、DropdownMenu、Popover、Calendar、Select）。

**Spec:** `docs/superpowers/specs/2026-09-28-ui-v2-milestone-2-design.md`（上層：`docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`）

## Global Constraints

- 網址不變；不新增 `/v2` 路由；不新增 API、不改資料庫。
- v1 的畫面、文案、行為不變（搬移時 JSX 逐字保留，只替換被抽出的 state／函式）。
- v2 只有淺色；v2 元件不得使用 `dark:` variant。
- v2 視覺數值以 `design/project/ExpenseList.dc.html`（A6）、`Settle.dc.html`（A5）、`Members.dc.html`（A7）、`Stats.dc.html`（A8）為準。
- 對話框、確認視窗、下拉選單內容沿用既有 v1 元件（shadcn），不做 v2 樣式。
- 金額一律用 `formatCurrency(amount, currency)`（輸出如 `TWD 48,600`）。
- 程式碼註解用英文；UI 文案用繁體中文。
- Commit 訊息結尾必須是（HEREDOC，位於 body，不在 subject）：
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
  ```
- 每個 task 結束時 `npm run test:run` 全數通過、`npm run lint` 無新錯誤、`npx tsc --noEmit -p .` 在變更檔案中無錯誤。
- 工作目錄：`/Users/kewos/Documents/projects/wander-wallet/.claude/worktrees/ui-v2-m1`，分支 `feat/ui-v2-m2`。

## Review Focus

1. **A6 刪除後 LINE 通知的條件**：只有在「勾選通知 ＋ 可發送訊息 ＋ 非開發模式 ＋ 用戶偏好 `expenseDeleted` 為 true」時才發送；任一不成立都不可發送。→ Task 1 測試。
2. **A7 權限**：非建立者看不到移除按鈕與「批次」；建立者看得到，但自己那一列不能移除或勾選。→ Task 6 測試。
3. **A5 日均花費的天數來源**：有出發日＋結束日時用旅程天數；缺日期時用支出付款日期範圍；無支出為 0，不出現 `NaN` 或 `Infinity`。→ Task 4 測試。
4. **A8 沒有任何支出的旅程**：甜甜圈、排行、趨勢都顯示空狀態，不出現 `NaN%`。→ Task 7、Task 8 測試。
5. **A6 跨午夜與今天的分組**：分組依本地日期；今天的組標「（今天）」，昨天不標。→ Task 2 測試。

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `lib/hooks/useProjectExpenses.ts` | A6 支出抓取、單筆刪除、批次刪除（含 LINE 通知判斷） |
| `components/expense/expense-filter-content.tsx` | 篩選選單內容（類別、成員、金額、日期區間），v1、v2 共用 |
| `components/expense/notify-line-checkbox.tsx` | 刪除確認視窗中的「通知 LINE 群組」勾選列，v1、v2 共用 |
| `lib/expense-list.ts` | `groupExpensesByDay`、`formatMonthDayTime`、`summarizeExpenses` |
| `components/v2/category-style.ts` | v2 類別色調與 `categoryKey`（由 A2 的 recent-expenses 抽出） |
| `components/v1/expenses/expenses-v1.tsx` | 原 A6 頁面 |
| `components/v2/expenses/*` | A6 v2 |
| `lib/hooks/useSettlement.ts` | A5 結算資料、顯示幣別換算、分享文字 |
| `lib/settlement.ts` | `computeDailyAverage` |
| `lib/constants/sponsor.ts` | 贊助連結常數 |
| `components/settle/share-settlement-dialog.tsx` | 分享結算對話框（v1、v2 共用） |
| `components/settle/settlement-calc-dialog.tsx` | 計算說明對話框（v1、v2 共用） |
| `components/v1/settle/settle-v1.tsx` | 原 A5 頁面 |
| `components/v2/settle/*` | A5 v2 |
| `lib/hooks/useProjectMembers.ts` | A7 成員抓取、新增佔位成員、移除、批次移除 |
| `components/members/add-member-dialog.tsx` | 手動新增成員對話框（v1、v2 共用） |
| `components/v1/members/members-v1.tsx` | 原 A7 頁面 |
| `components/v2/members/*` | A7 v2 |
| `lib/project-stats.ts` | `computeProjectStats` |
| `components/v1/stats/stats-v1.tsx` | 原 A8 頁面 |
| `components/v2/stats/*` | A8 v2 |
| `app/projects/[id]/{expenses,settle,members,stats}/page.tsx` | 只做分流 |

---

### Task 1: A6 共用邏輯與 v1 搬移

**Files:**
- Create: `lib/hooks/useProjectExpenses.ts`
- Create: `components/expense/expense-filter-content.tsx`
- Create: `components/expense/notify-line-checkbox.tsx`
- Create: `components/v1/expenses/expenses-v1.tsx`（由 `app/projects/[id]/expenses/page.tsx` 搬移）
- Modify: `app/projects/[id]/expenses/page.tsx`
- Modify: `lib/hooks/index.ts`
- Test: `tests/lib/hooks/useProjectExpenses.test.tsx`

**Interfaces:**
- Produces:
  - `interface ExpenseMember { id: string; displayName: string; userId: string | null; user: { id: string; name: string | null; email: string; image: string | null } | null }`
  - `interface ProjectExpense { id: string; amount: number; currency: string; description: string | null; category: string | null; image: string | null; location: string | null; latitude: number | null; longitude: number | null; expenseDate: string; createdAt: string; payer: ExpenseMember; participants: { id: string; shareAmount: number; member: ExpenseMember }[] }`
  - `useProjectExpenses(projectId: string, options: { projectName: string }): { expenses: ProjectExpense[]; loading: boolean; deleting: boolean; canNotifyLine: boolean; refetch: () => Promise<void>; deleteExpense: (expenseId: string, opts: { notifyLine: boolean }) => Promise<boolean>; batchDeleteExpenses: (expenseIds: string[], opts: { notifyLine: boolean }) => Promise<boolean> }`
    - `canNotifyLine` = `canSendMessages && !isDevMode`（控制勾選列是否顯示）
    - 實際發送條件 = `opts.notifyLine && canNotifyLine && mergePreferences(user?.preferences).notifications.expenseDeleted`
    - 成功時從 `expenses` 移除對應項目並回傳 `true`；失敗 `alert(data.error || "刪除失敗")` 並回傳 `false`；例外 `alert("刪除失敗")` 回傳 `false`
  - `CategoryFilterItems({ selected: Set<string>; onToggle: (category: string) => void })`
  - `MemberFilterItems({ heading: string; members: { id: string; displayName: string }[]; selected: Set<string>; onToggle: (id: string) => void })`
  - `CurrencyFilterItems({ currencies: string[]; selected: Set<string>; onToggle: (code: string) => void })`
  - `AmountRangeFilterContent({ range: [number, number]; max: number; currency: string; onChange: (range: [number, number]) => void })`
  - `DateRangeFilterContent({ title: string; range: DateRange | undefined; onChange: (range: DateRange | undefined) => void })`
  - `NotifyLineCheckbox({ checked: boolean; onChange: (checked: boolean) => void })`
  - `ExpensesV1({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/lib/hooks/useProjectExpenses.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => mockUseLiff(),
}))

const mockSendDelete = vi.fn()
const mockSendBatchDelete = vi.fn()
vi.mock("@/lib/liff", () => ({
  sendDeleteNotificationToChat: (p: unknown) => mockSendDelete(p),
  sendBatchDeleteNotificationToChat: (p: unknown) => mockSendBatchDelete(p),
}))

import { useProjectExpenses, type ProjectExpense } from "@/lib/hooks/useProjectExpenses"

const member = { id: "m1", displayName: "志明", userId: null, user: null }
function expense(id: string): ProjectExpense {
  return {
    id,
    amount: 100,
    currency: "TWD",
    description: id,
    category: "food",
    image: null,
    location: null,
    latitude: null,
    longitude: null,
    expenseDate: "2026-11-16T10:00:00.000Z",
    createdAt: "2026-11-16T10:01:00.000Z",
    payer: member,
    participants: [{ id: `${id}-p`, shareAmount: 100, member }],
  }
}

const ok = (body: unknown) => ({ ok: true, json: async () => body })
const fail = (body: unknown) => ({ ok: false, json: async () => body })

function liff(overrides: Record<string, unknown> = {}) {
  return {
    isDevMode: false,
    canSendMessages: true,
    user: { id: "u1", preferences: null },
    ...overrides,
  }
}

describe("useProjectExpenses", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockSendDelete.mockReset().mockResolvedValue(undefined)
    mockSendBatchDelete.mockReset().mockResolvedValue(undefined)
    mockUseLiff.mockReturnValue(liff())
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  it("loads expenses", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")]))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.expenses.map((e) => e.id)).toEqual(["a"])
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/expenses")
  })

  it("deletes one expense and notifies LINE when allowed", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a"), expense("b")])).mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success = false
    await act(async () => {
      success = await result.current.deleteExpense("a", { notifyLine: true })
    })

    expect(success).toBe(true)
    expect(mockAuthFetch).toHaveBeenLastCalledWith("/api/projects/p1/expenses/a", { method: "DELETE" })
    expect(result.current.expenses.map((e) => e.id)).toEqual(["b"])
    expect(mockSendDelete).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: "東京", projectId: "p1", payerName: "志明", amount: 100 })
    )
  })

  it.each([
    ["the checkbox is off", {}, false],
    ["in dev mode", { isDevMode: true }, true],
    ["messages cannot be sent", { canSendMessages: false }, true],
    ["the user disabled delete notifications", { user: { id: "u1", preferences: { notifications: { expenseDeleted: false } } } }, true],
  ])("does not notify LINE when %s", async (_label, liffOverrides, notifyLine) => {
    mockUseLiff.mockReturnValue(liff(liffOverrides))
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")])).mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.deleteExpense("a", { notifyLine })
    })
    expect(mockSendDelete).not.toHaveBeenCalled()
  })

  it("alerts the server error and keeps the list when delete fails", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok([expense("a")])).mockResolvedValueOnce(fail({ error: "沒有權限" }))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let success = true
    await act(async () => {
      success = await result.current.deleteExpense("a", { notifyLine: false })
    })
    expect(success).toBe(false)
    expect(window.alert).toHaveBeenCalledWith("沒有權限")
    expect(result.current.expenses).toHaveLength(1)
  })

  it("batch deletes and notifies once", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(ok([expense("a"), expense("b"), expense("c")]))
      .mockResolvedValueOnce(ok({}))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.batchDeleteExpenses(["a", "c"], { notifyLine: true })
    })
    expect(mockAuthFetch).toHaveBeenLastCalledWith(
      "/api/projects/p1/expenses/batch",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ expenseIds: ["a", "c"] }) })
    )
    expect(result.current.expenses.map((e) => e.id)).toEqual(["b"])
    expect(mockSendBatchDelete).toHaveBeenCalledTimes(1)
  })

  it("exposes canNotifyLine", async () => {
    mockUseLiff.mockReturnValue(liff({ isDevMode: true }))
    mockAuthFetch.mockResolvedValueOnce(ok([]))
    const { result } = renderHook(() => useProjectExpenses("p1", { projectName: "東京" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canNotifyLine).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/hooks/useProjectExpenses.test.tsx`
Expected: FAIL，無法解析 `@/lib/hooks/useProjectExpenses`

- [ ] **Step 3: Write the hook**

邏輯與原 `app/projects/[id]/expenses/page.tsx` 的 `fetchExpenses`、`handleDelete`、`handleBatchDelete` 相同：

```ts
// lib/hooks/useProjectExpenses.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { sendBatchDeleteNotificationToChat, sendDeleteNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"

export interface ExpenseMember {
  id: string
  displayName: string
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface ProjectExpense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  expenseDate: string
  createdAt: string
  payer: ExpenseMember
  participants: { id: string; shareAmount: number; member: ExpenseMember }[]
}

export function useProjectExpenses(projectId: string, options: { projectName: string }) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [expenses, setExpenses] = useState<ProjectExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const canNotifyLine = canSendMessages && !isDevMode
  const deleteNotificationsEnabled = mergePreferences(user?.preferences).notifications.expenseDeleted

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/expenses`)
      if (res.ok) {
        setExpenses(await res.json())
      }
    } catch (error) {
      console.error("獲取支出列表錯誤:", error)
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId])

  // Keyed on projectId only, like the original page: a session-token refresh
  // must not reload the list.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const deleteExpense = useCallback(
    async (expenseId: string, opts: { notifyLine: boolean }) => {
      const target = expenses.find((e) => e.id === expenseId)
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/${expenseId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "刪除失敗")
          return false
        }
        if (opts.notifyLine && canNotifyLine && deleteNotificationsEnabled && target) {
          sendDeleteNotificationToChat({
            projectName: options.projectName,
            projectId,
            payerName: target.payer.displayName,
            amount: target.amount,
            description: target.description || undefined,
            category: target.category || undefined,
            participantCount: target.participants.length,
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
        return true
      } catch (error) {
        console.error("刪除支出錯誤:", error)
        alert("刪除失敗")
        return false
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, expenses, canNotifyLine, deleteNotificationsEnabled, options.projectName]
  )

  const batchDeleteExpenses = useCallback(
    async (expenseIds: string[], opts: { notifyLine: boolean }) => {
      if (expenseIds.length === 0) return false
      const ids = new Set(expenseIds)
      const targets = expenses.filter((e) => ids.has(e.id))
      setDeleting(true)
      try {
        const res = await authFetch(`/api/projects/${projectId}/expenses/batch`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenseIds }),
        })
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "刪除失敗")
          return false
        }
        if (opts.notifyLine && canNotifyLine && deleteNotificationsEnabled && targets.length > 0) {
          sendBatchDeleteNotificationToChat({
            projectName: options.projectName,
            projectId,
            expenses: targets.map((e) => ({
              amount: e.amount,
              description: e.description || undefined,
              category: e.category || undefined,
              payerName: e.payer.displayName,
              participantCount: e.participants.length,
            })),
          }).catch(() => {
            // Notification failures must not affect the delete.
          })
        }
        setExpenses((prev) => prev.filter((e) => !ids.has(e.id)))
        return true
      } catch (error) {
        console.error("批量刪除支出錯誤:", error)
        alert("刪除失敗")
        return false
      } finally {
        setDeleting(false)
      }
    },
    [authFetch, projectId, expenses, canNotifyLine, deleteNotificationsEnabled, options.projectName]
  )

  return { expenses, loading, deleting, canNotifyLine, refetch, deleteExpense, batchDeleteExpenses }
}
```

在 `lib/hooks/index.ts` 加上：

```ts
export { useProjectExpenses, type ProjectExpense, type ExpenseMember } from "./useProjectExpenses"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/hooks/useProjectExpenses.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the shared filter contents and notify checkbox**

內容取自原頁面的篩選區塊（`FilterDropdown` 與 `Popover` 的內層）；文案、class 逐字保留：

```tsx
// components/expense/expense-filter-content.tsx
"use client"

import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CATEGORY_ICONS, CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"

export function CategoryFilterItems({ selected, onToggle }: { selected: Set<string>; onToggle: (category: string) => void }) {
  return (
    <>
      <DropdownMenuLabel>消費類別</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {EXPENSE_CATEGORIES.map((key) => {
        const Icon = CATEGORY_ICONS[key]
        return (
          <DropdownMenuCheckboxItem key={key} checked={selected.has(key)} onCheckedChange={() => onToggle(key)}>
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {CATEGORY_LABELS[key]}
          </DropdownMenuCheckboxItem>
        )
      })}
    </>
  )
}

export function MemberFilterItems({
  heading,
  members,
  selected,
  onToggle,
}: {
  heading: string
  members: { id: string; displayName: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <>
      <DropdownMenuLabel>{heading}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {members.length > 0 ? (
        members.map((m) => (
          <DropdownMenuCheckboxItem key={m.id} checked={selected.has(m.id)} onCheckedChange={() => onToggle(m.id)}>
            {m.displayName}
          </DropdownMenuCheckboxItem>
        ))
      ) : (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">無資料</div>
      )}
    </>
  )
}

export function CurrencyFilterItems({
  currencies,
  selected,
  onToggle,
}: {
  currencies: string[]
  selected: Set<string>
  onToggle: (code: string) => void
}) {
  return (
    <>
      <DropdownMenuLabel>幣別</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {currencies.map((code) => (
        <DropdownMenuCheckboxItem key={code} checked={selected.has(code)} onCheckedChange={() => onToggle(code)}>
          {code}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  )
}

export function AmountRangeFilterContent({
  range,
  max,
  currency,
  onChange,
}: {
  range: [number, number]
  max: number
  currency: string
  onChange: (range: [number, number]) => void
}) {
  const upper = max || 10000
  const step = Math.max(1, Math.floor(upper / 100))
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{formatCurrency(range[0], currency)}</span>
        <span className="text-muted-foreground">~</span>
        <span className="font-medium">{range[1] === 0 ? "不限" : formatCurrency(range[1], currency)}</span>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">最低</label>
        <input
          type="range"
          min={0}
          max={upper}
          step={step}
          value={range[0]}
          onChange={(e) => onChange([Number(e.target.value), range[1]])}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">最高 (0=不限)</label>
        <input
          type="range"
          min={0}
          max={upper}
          step={step}
          value={range[1]}
          onChange={(e) => onChange([range[0], Number(e.target.value)])}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
      {(range[0] > 0 || range[1] > 0) && (
        <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => onChange([0, 0])}>
          清除
        </Button>
      )}
    </div>
  )
}

export function DateRangeFilterContent({
  title,
  range,
  onChange,
}: {
  title: string
  range: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {range && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(undefined)}>
            清除
          </Button>
        )}
      </div>
      <Calendar mode="range" selected={range} onSelect={onChange} numberOfMonths={1} />
    </>
  )
}
```

**重要**：寫之前先讀原頁面的類別、付款人、參與者、幣別四個選單，確認以下都和上面一致：`DropdownMenuCheckboxItem` 的內層（有沒有圖示、圖示的 class）、空清單的顯示文字、幣別選單的標題。若原本不同，**以原頁面為準**修改上面的程式，並在報告中列出差異。`CATEGORY_CONFIG` 的順序與 `EXPENSE_CATEGORIES` 若不同，也以原頁面順序為準。

```tsx
// components/expense/notify-line-checkbox.tsx
"use client"

import { Checkbox } from "@/components/ui/checkbox"

export function NotifyLineCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <div>
        <span className="text-sm font-medium">通知 LINE 群組</span>
        <p className="text-xs text-muted-foreground">刪除後自動發送通知到群組</p>
      </div>
    </label>
  )
}
```

- [ ] **Step 6: Move the v1 page and switch it to the shared code**

```bash
mkdir -p components/v1/expenses
git mv "app/projects/[id]/expenses/page.tsx" components/v1/expenses/expenses-v1.tsx
```

在 `components/v1/expenses/expenses-v1.tsx`：

1. `export default function ExpensesList({ params }: { params: Promise<{ id: string }> }) {` → `export function ExpensesV1({ projectId: id }: { projectId: string }) {`；刪除 `const { id } = use(params)`，import 移除 `use`。
2. 刪除檔內 `interface Member`、`interface ExpenseParticipant`、`interface Expense`，改為 `import type { ProjectExpense as Expense } from "@/lib/hooks/useProjectExpenses"`（若檔內仍用到 `Member` 型別，再加 `ExpenseMember as Member`）。
3. 刪除 state：`expenses`、`expensesLoading`、`deleting`；刪除 `fetchExpenses` 的 `useEffect` 與函式本體、`userPreferences`。在 `useProjectData` 呼叫之後加入：
   ```tsx
   const {
     expenses,
     loading: expensesLoading,
     deleting,
     canNotifyLine,
     refetch: fetchExpenses,
     deleteExpense,
     batchDeleteExpenses,
   } = useProjectExpenses(id, { projectName: project?.name || "" })
   ```
4. `handleDelete` 整個函式替換為：
   ```tsx
   async function handleDelete() {
     if (!deleteId) return
     if (await deleteExpense(deleteId, { notifyLine: notifyLineOnDelete })) {
       setDeleteId(null)
     }
   }
   ```
5. `handleBatchDelete` 整個函式替換為：
   ```tsx
   async function handleBatchDelete() {
     if (selectedIds.size === 0) return
     if (await batchDeleteExpenses(Array.from(selectedIds), { notifyLine: notifyLineOnDelete })) {
       setSelectedIds(new Set())
       setSelectMode(false)
       setShowBatchDeleteDialog(false)
     }
   }
   ```
6. 兩個 `ConfirmDeleteDialog` 內的 `{canSendMessages && !isDevMode && (<label ...>...</label>)}` 替換為 `{canNotifyLine && <NotifyLineCheckbox checked={notifyLineOnDelete} onChange={setNotifyLineOnDelete} />}`。
7. 篩選選單：把類別、付款人、參與者、幣別四個 `FilterDropdown` 的**內層**分別替換為 `<CategoryFilterItems selected={filters.selectedCategories} onToggle={toggleCategory} />`、`<MemberFilterItems heading="誰付錢" members={uniquePayers} selected={filters.selectedPayers} onToggle={togglePayer} />`、`<MemberFilterItems heading="有參與分攤" members={uniqueParticipants} selected={filters.selectedParticipants} onToggle={toggleParticipant} />`、`<CurrencyFilterItems currencies={uniqueCurrencies} selected={filters.selectedCurrencies} onToggle={toggleCurrency} />`；金額 `FilterDropdown` 內層替換為 `<AmountRangeFilterContent range={filters.amountRange} max={maxExpenseAmount} currency={projectCurrency} onChange={setAmountRange} />`；兩個日期 `PopoverContent` 內層替換為 `<DateRangeFilterContent title="建立日期" range={filters.createdDateRange} onChange={setCreatedDateRange} />` 與 `title="付款日期"` 版本。**外層 trigger 不動。**
8. 移除不再使用的 import 與 `useLiff` 解構中不再使用的欄位（以 lint 為準；`user` 仍用於 `currentUserMemberId`）。

新的 `app/projects/[id]/expenses/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { ExpensesV1 } from "@/components/v1/expenses/expenses-v1"

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ExpensesV1 projectId={id} />
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 變更檔案無型別錯誤；測試全數通過；lint 無新錯誤。

在報告中附上「移除的 state／函式 → 現在在哪裡」對照表，並說明 Step 5 的差異檢查結果。

- [ ] **Step 8: Commit**

```bash
git add lib/hooks/useProjectExpenses.ts lib/hooks/index.ts components/expense components/v1/expenses "app/projects/[id]/expenses/page.tsx" tests/lib/hooks/useProjectExpenses.test.tsx
git commit -F - <<'EOF'
refactor: Move expense list to ExpensesV1 with shared hook and filter contents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 2: A6 全部支出 v2

**Files:**
- Create: `lib/expense-list.ts`
- Create: `components/v2/category-style.ts`
- Modify: `components/v2/project/recent-expenses.tsx`（改從 `category-style.ts` 匯入）
- Create: `components/v2/expenses/expense-summary-card.tsx`
- Create: `components/v2/expenses/expense-filter-bar.tsx`
- Create: `components/v2/expenses/expense-card.tsx`
- Create: `components/v2/expenses/expenses-v2-view.tsx`
- Create: `components/v2/expenses/expenses-v2.tsx`
- Modify: `app/projects/[id]/expenses/page.tsx`
- Test: `tests/lib/expense-list.test.ts`、`tests/components/v2/expenses-v2.test.tsx`

**Interfaces:**
- Consumes: Task 1 全部；`useProjectData`、`useExpenseFilters`、`useCurrencyConversion`（`@/lib/hooks`）；`UiV2Scope`、`V2TopBar`、`UiVersionSwitch`；`formatTripDateRange`（`@/lib/trip`）；`ConfirmDeleteDialog`；`VoiceExpenseDialog`
- Produces:
  - `groupExpensesByDay<T extends { expenseDate: string }>(expenses: T[], now: Date): { key: string; label: string; expenses: T[] }[]`（組依日期新到舊；組內依 `expenseDate` 新到舊；`label` 為 `M/D`，今天為 `M/D（今天）`）
  - `formatMonthDayTime(iso: string): string`（本地時間 `M/D HH:mm`，24 小時制、時分補零）
  - `summarizeExpenses(expenses: { amount: number; currency: string }[], convert: (amount: number, currency: string) => number): { total: number; count: number; average: number }`
  - `CATEGORY_TONES: Record<ExpenseCategory, string>`、`categoryKey(category: string | null): ExpenseCategory`（`components/v2/category-style.ts`）
  - `ExpensesV2({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/lib/expense-list.test.ts
import { describe, it, expect } from "vitest"
import { groupExpensesByDay, formatMonthDayTime, summarizeExpenses } from "@/lib/expense-list"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)

describe("groupExpensesByDay", () => {
  it("groups by local day, newest first, and marks today", () => {
    const list = [
      { id: "a", expenseDate: at(11, 15, 9) },
      { id: "b", expenseDate: at(11, 16, 8, 10) },
      { id: "c", expenseDate: at(11, 16, 19, 20) },
      { id: "d", expenseDate: at(11, 15, 23, 59) },
    ]
    const groups = groupExpensesByDay(list, now)
    expect(groups.map((g) => g.label)).toEqual(["11/16（今天）", "11/15"])
    expect(groups[0].expenses.map((e) => e.id)).toEqual(["c", "b"])
    expect(groups[1].expenses.map((e) => e.id)).toEqual(["d", "a"])
  })

  it("keeps an expense just after midnight on the new day", () => {
    const groups = groupExpensesByDay([{ id: "x", expenseDate: at(11, 16, 0, 5) }], now)
    expect(groups[0].label).toBe("11/16（今天）")
  })

  it("returns no groups for no expenses", () => {
    expect(groupExpensesByDay([], now)).toEqual([])
  })
})

describe("formatMonthDayTime", () => {
  it("formats local month/day and zero-padded 24h time", () => {
    expect(formatMonthDayTime(at(11, 6, 8, 5))).toBe("11/6 08:05")
    expect(formatMonthDayTime(at(1, 16, 19, 20))).toBe("1/16 19:20")
  })
})

describe("summarizeExpenses", () => {
  it("sums in project currency and averages", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    expect(
      summarizeExpenses(
        [
          { amount: 1000, currency: "JPY" },
          { amount: 100, currency: "TWD" },
        ],
        toTwd
      )
    ).toEqual({ total: 300, count: 2, average: 150 })
  })

  it("returns zeros for an empty list", () => {
    expect(summarizeExpenses([], (a) => a)).toEqual({ total: 0, count: 0, average: 0 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/expense-list.test.ts`
Expected: FAIL，無法解析 `@/lib/expense-list`

- [ ] **Step 3: Write `lib/expense-list.ts`**

```ts
// lib/expense-list.ts
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function groupExpensesByDay<T extends { expenseDate: string }>(
  expenses: T[],
  now: Date
): { key: string; label: string; expenses: T[] }[] {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  )
  const todayKey = localDayKey(now)
  const groups: { key: string; label: string; expenses: T[] }[] = []
  for (const expense of sorted) {
    const date = new Date(expense.expenseDate)
    const key = localDayKey(date)
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, label: key === todayKey ? `${monthDay(date)}（今天）` : monthDay(date), expenses: [] }
      groups.push(group)
    }
    group.expenses.push(expense)
  }
  return groups
}

export function formatMonthDayTime(iso: string): string {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${monthDay(date)} ${hh}:${mm}`
}

export function summarizeExpenses(
  expenses: { amount: number; currency: string }[],
  convert: (amount: number, currency: string) => number
): { total: number; count: number; average: number } {
  const total = expenses.reduce((sum, e) => sum + convert(Number(e.amount), e.currency), 0)
  const count = expenses.length
  return { total, count, average: count > 0 ? total / count : 0 }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/expense-list.test.ts`
Expected: PASS

- [ ] **Step 5: Extract the shared v2 category style**

```ts
// components/v2/category-style.ts
import { CATEGORY_ICONS, type ExpenseCategory } from "@/lib/constants/expenses"

export const CATEGORY_TONES: Record<ExpenseCategory, string> = {
  food: "bg-v2-coral-soft text-v2-coral",
  transport: "bg-v2-lake-soft text-v2-lake",
  accommodation: "bg-v2-plum-soft text-v2-plum",
  ticket: "bg-v2-gold-soft text-v2-gold",
  shopping: "bg-v2-rose-soft text-v2-rose",
  entertainment: "bg-v2-plum-soft text-v2-plum",
  gift: "bg-v2-rose-soft text-v2-rose",
  other: "bg-v2-sand text-v2-ink-muted",
}

export function categoryKey(category: string | null): ExpenseCategory {
  return category && category in CATEGORY_ICONS ? (category as ExpenseCategory) : "other"
}
```

在 `components/v2/project/recent-expenses.tsx` 刪除檔內的 `CATEGORY_TONES` 與 `categoryKey`，改為 `import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"`。執行 `npx vitest run tests/components/v2/project-overview-v2.test.tsx`，預期仍 PASS。

- [ ] **Step 6: Write the failing view test**

```tsx
// tests/components/v2/expenses-v2.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ExpensesV2View } from "@/components/v2/expenses/expenses-v2-view"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)
const zhi = { id: "chi", displayName: "志明", userId: null, user: null }
const me = { id: "me", displayName: "Emma", userId: "u1", user: null }

function expense(overrides: Partial<ProjectExpense>): ProjectExpense {
  return {
    id: "e",
    amount: 1280,
    currency: "TWD",
    description: "一蘭拉麵晚餐",
    category: "food",
    image: null,
    location: null,
    latitude: null,
    longitude: null,
    expenseDate: at(11, 16, 19, 20),
    createdAt: at(11, 16, 19, 22),
    payer: zhi,
    participants: [
      { id: "p1", shareAmount: 640, member: zhi },
      { id: "p2", shareAmount: 640, member: me },
    ],
    ...overrides,
  }
}

const expenses = [
  expense({ id: "e1" }),
  expense({ id: "e2", description: null, category: "transport", amount: 6400, payer: me, expenseDate: at(11, 15, 9), createdAt: at(11, 15, 9, 3), location: "京都市內", image: "https://example.com/r.jpg" }),
]

function renderView(overrides: Partial<Parameters<typeof ExpensesV2View>[0]> = {}) {
  const props: Parameters<typeof ExpensesV2View>[0] = {
    projectId: "p1",
    currency: "TWD",
    dateRangeLabel: "11/12 – 11/16",
    allCount: expenses.length,
    expenses,
    summary: { total: 7680, count: 2, average: 3840 },
    currentMemberId: "me",
    now,
    filterBar: <div>filters</div>,
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    selectMode: false,
    selectedIds: new Set<string>(),
    onToggleSelectMode: vi.fn(),
    onToggleSelect: vi.fn(),
    onRequestDelete: vi.fn(),
    onRequestBatchDelete: vi.fn(),
    onViewImage: vi.fn(),
    onVoice: vi.fn(),
    ...overrides,
  }
  render(<ExpensesV2View {...props} />)
  return props
}

describe("ExpensesV2View", () => {
  it("shows the summary card", () => {
    renderView()
    expect(screen.getByText("11/12 – 11/16")).toBeInTheDocument()
    expect(screen.getByText("TWD 7,680")).toBeInTheDocument()
    expect(screen.getByText("2 筆")).toBeInTheDocument()
    expect(screen.getByText("TWD 3,840")).toBeInTheDocument()
  })

  it("groups by payment day and renders card details", () => {
    renderView()
    expect(screen.getByText("11/16（今天）")).toBeInTheDocument()
    expect(screen.getByText("11/15")).toBeInTheDocument()
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(card).toHaveAttribute("href", "/projects/p1/expenses/e1/edit")
    expect(within(card).getByText("付款 11/16 19:20")).toBeInTheDocument()
    expect(within(card).getByText("建立 11/16 19:22")).toBeInTheDocument()
    expect(screen.getByText("TWD 1,280")).toBeInTheDocument()
  })

  it("falls back to the category label, shows location, payer as 我 and head count", () => {
    renderView()
    const card = screen.getByRole("link", { name: /交通/ })
    expect(within(card).getByText("京都市內")).toBeInTheDocument()
    const footer = screen.getByTestId("expense-footer-e2")
    expect(within(footer).getByText("我", { selector: "span.font-medium" })).toBeInTheDocument()
    expect(within(footer).getByText("2人")).toBeInTheDocument()
  })

  it("shows the count line and wires clear, batch, delete, image and voice", () => {
    const props = renderView({ hasActiveFilters: true })
    expect(screen.getByText(/顯示/).textContent).toBe("顯示 2 / 2 筆")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    fireEvent.click(screen.getByRole("button", { name: "查看圖片" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(props.onClearFilters).toHaveBeenCalled()
    expect(props.onToggleSelectMode).toHaveBeenCalled()
    expect(props.onRequestDelete).toHaveBeenCalledWith(expenses[0])
    expect(props.onViewImage).toHaveBeenCalledWith("https://example.com/r.jpg")
    expect(props.onVoice).toHaveBeenCalled()
  })

  it("hides the clear button without active filters", () => {
    renderView()
    expect(screen.queryByRole("button", { name: "清除" })).not.toBeInTheDocument()
  })

  it("switches cards to checkboxes in select mode", () => {
    const props = renderView({ selectMode: true, selectedIds: new Set(["e1"]) })
    expect(screen.queryAllByRole("button", { name: "刪除" })).toHaveLength(0)
    const boxes = screen.getAllByRole("checkbox")
    expect(boxes[0]).toBeChecked()
    fireEvent.click(boxes[1])
    expect(props.onToggleSelect).toHaveBeenCalledWith("e2")
    fireEvent.click(screen.getByRole("button", { name: "刪除 1 筆" }))
    expect(props.onRequestBatchDelete).toHaveBeenCalled()
  })

  it("shows empty states", () => {
    renderView({ expenses: [], allCount: 0, summary: { total: 0, count: 0, average: 0 } })
    expect(screen.getByText("尚無支出記錄")).toBeInTheDocument()
  })

  it("shows the no-match state when filters remove everything", () => {
    renderView({ expenses: [], allCount: 2, summary: { total: 0, count: 0, average: 0 } })
    expect(screen.getByText("找不到符合的支出")).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run tests/components/v2/expenses-v2.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/expenses/expenses-v2-view`

- [ ] **Step 8: Write the view components**

版面數值取自 `design/project/ExpenseList.dc.html`（總覽卡、搜尋框、篩選格、計數列、日期組標、支出卡）。

```tsx
// components/v2/expenses/expense-summary-card.tsx
import { CalendarDays, Receipt, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"

interface ExpenseSummaryCardProps {
  currency: string
  dateRangeLabel: string | null
  summary: { total: number; count: number; average: number }
}

export function ExpenseSummaryCard({ currency, dateRangeLabel, summary }: ExpenseSummaryCardProps) {
  return (
    <div className="mx-4 mt-3.5 rounded-[18px] border border-[#DCEAE3] bg-gradient-to-br from-v2-lake-soft to-v2-paper px-[18px] py-4 shadow-[0_2px_8px_rgba(27,88,71,.06)]">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-semibold text-v2-ink-muted">總支出</p>
        {dateRangeLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#DCEAE3] bg-v2-surface px-[9px] py-[3px] text-xs font-semibold text-v2-lake">
            <CalendarDays className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
            {dateRangeLabel}
          </span>
        )}
      </div>
      <p className="mt-1 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-lake">
        {formatCurrency(Math.round(summary.total), currency)}
      </p>
      <div className="mt-3 flex items-center gap-3 border-t border-[rgba(27,88,71,.12)] pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-[9px]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-v2-surface text-v2-lake" aria-hidden="true">
            <Receipt className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{summary.count} 筆</span>
            <span className="block text-xs text-v2-ink-subtle">支出紀錄</span>
          </span>
        </div>
        <div className="h-[30px] w-px shrink-0 bg-[rgba(27,88,71,.14)]" />
        <div className="flex min-w-0 flex-1 items-center gap-[9px]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-v2-surface text-v2-coral" aria-hidden="true">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{formatCurrency(Math.round(summary.average), currency)}</span>
            <span className="block text-xs text-v2-ink-subtle">平均每筆</span>
          </span>
        </div>
      </div>
    </div>
  )
}
```

```tsx
// components/v2/expenses/expense-filter-bar.tsx
"use client"

import type { ReactNode } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarDays, ChevronDown, Coins, DollarSign, Filter, Search, User, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AmountRangeFilterContent,
  CategoryFilterItems,
  CurrencyFilterItems,
  DateRangeFilterContent,
  MemberFilterItems,
} from "@/components/expense/expense-filter-content"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"

interface ExpenseFilterBarProps {
  filters: ExpenseFilters
  currency: string
  maxAmount: number
  payers: { id: string; displayName: string }[]
  participants: { id: string; displayName: string }[]
  currencies: string[]
  onSearch: (query: string) => void
  onToggleCategory: (category: string) => void
  onTogglePayer: (id: string) => void
  onToggleParticipant: (id: string) => void
  onToggleCurrency: (code: string) => void
  onAmountRange: (range: [number, number]) => void
  onCreatedRange: (range: DateRange | undefined) => void
  onExpenseRange: (range: DateRange | undefined) => void
}

function Chip({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  const active = count > 0
  return (
    <span
      className={
        active
          ? "flex w-full items-center gap-[5px] rounded-[10px] border-[1.5px] border-[#2F8F74] bg-v2-lake-soft px-2.5 py-[9px] text-xs font-bold text-v2-lake"
          : "flex w-full items-center gap-[5px] rounded-[10px] border border-v2-line bg-v2-surface px-2.5 py-[9px] text-xs font-semibold text-v2-ink"
      }
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {active ? (
        <span className="flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-v2-lake px-[3px] text-[9px] text-white">
          {count}
        </span>
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
    </span>
  )
}

function rangeLabel(range: DateRange | undefined, fallback: string): string {
  if (!range?.from) return fallback
  return range.to ? `${format(range.from, "M/d")}~${format(range.to, "M/d")}` : `${format(range.from, "M/d")}~`
}

const icon = "h-3.5 w-3.5 shrink-0"

export function ExpenseFilterBar(props: ExpenseFilterBarProps) {
  const { filters } = props
  const amountActive = filters.amountRange[0] > 0 || filters.amountRange[1] > 0 ? 1 : 0

  return (
    <>
      <label className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-2.5">
        <Search className="h-3.5 w-3.5 text-v2-ink-subtle" aria-hidden="true" />
        <input
          type="search"
          value={filters.searchQuery}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="搜尋支出描述…"
          aria-label="搜尋支出描述"
          className="w-full bg-transparent text-xs outline-none placeholder:text-v2-ink-subtle"
        />
      </label>
      <div className="mx-4 mt-2.5 grid grid-cols-3 gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<Filter className={icon} />} label="類別" count={filters.selectedCategories.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-32">
            <CategoryFilterItems selected={filters.selectedCategories} onToggle={props.onToggleCategory} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<User className={icon} />} label="付款人" count={filters.selectedPayers.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36 max-h-60 overflow-y-auto">
            <MemberFilterItems heading="誰付錢" members={props.payers} selected={filters.selectedPayers} onToggle={props.onTogglePayer} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<Users className={icon} />} label="參與者" count={filters.selectedParticipants.size} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 max-h-60 overflow-y-auto">
            <MemberFilterItems heading="有參與分攤" members={props.participants} selected={filters.selectedParticipants} onToggle={props.onToggleParticipant} />
          </DropdownMenuContent>
        </DropdownMenu>
        {props.currencies.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <Chip icon={<Coins className={icon} />} label="幣別" count={filters.selectedCurrencies.size} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-28">
              <CurrencyFilterItems currencies={props.currencies} selected={filters.selectedCurrencies} onToggle={props.onToggleCurrency} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <Chip icon={<DollarSign className={icon} />} label="金額" count={amountActive} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44 p-2.5">
            <AmountRangeFilterContent range={filters.amountRange} max={props.maxAmount} currency={props.currency} onChange={props.onAmountRange} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Popover>
          <PopoverTrigger className="w-full">
            <Chip icon={<CalendarDays className={icon} />} label={rangeLabel(filters.createdDateRange, "建立日期")} count={filters.createdDateRange?.from ? 1 : 0} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <DateRangeFilterContent title="建立日期" range={filters.createdDateRange} onChange={props.onCreatedRange} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger className="w-full">
            <Chip icon={<CalendarDays className={icon} />} label={rangeLabel(filters.expenseDateRange, "付款日期")} count={filters.expenseDateRange?.from ? 1 : 0} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <DateRangeFilterContent title="付款日期" range={filters.expenseDateRange} onChange={props.onExpenseRange} />
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}
```

`useExpenseFilters` 的幣別 chip 條件：v1 在「有多種幣別」時才顯示，請讀原頁面確認條件（例如 `uniqueCurrencies.length > 1`）並照用。

```tsx
// components/v2/expenses/expense-card.tsx
import Link from "next/link"
import Image from "next/image"
import { MapPin, Trash2 } from "lucide-react"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { formatMonthDayTime } from "@/lib/expense-list"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"

const DOT_TONES = ["bg-v2-lake-soft", "bg-v2-coral-soft", "bg-v2-plum-soft", "bg-v2-rose-soft"]

interface ExpenseCardProps {
  projectId: string
  expense: ProjectExpense
  currentMemberId: string | null
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onRequestDelete: (expense: ProjectExpense) => void
  onViewImage: (url: string) => void
}

export function ExpenseCard({
  projectId,
  expense,
  currentMemberId,
  selectMode,
  selected,
  onToggleSelect,
  onRequestDelete,
  onViewImage,
}: ExpenseCardProps) {
  const key = categoryKey(expense.category)
  const Icon = CATEGORY_ICONS[key]
  const isMe = expense.payer.id === currentMemberId
  const payerName = isMe ? "我" : expense.payer.displayName
  const title = expense.description || getCategoryLabel(key)

  const body = (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${CATEGORY_TONES[key]}`} aria-hidden="true">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <span className="mt-[3px] text-xs text-v2-ink-subtle">{getCategoryLabel(key)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 truncate text-base font-medium leading-6 tracking-[.15px]">{title}</h3>
          <p className="m-0 text-base font-bold tabular-nums">
            {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
          </p>
        </div>
        <p className="mt-[3px] text-xs text-v2-ink-subtle">付款 {formatMonthDayTime(expense.expenseDate)}</p>
        <p className="mt-px text-xs text-v2-ink-subtle">建立 {formatMonthDayTime(expense.createdAt)}</p>
        {expense.location && (
          <p className="mt-px flex items-center gap-1 text-xs text-v2-ink-subtle">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">{expense.location}</span>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="mb-3 rounded-2xl border border-[#F0EAE0] bg-v2-surface p-3.5 shadow-[0_4px_12px_rgba(27,24,21,.05)]">
      <div className="relative">
        {selectMode ? (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(expense.id)}
              aria-label={`選取 ${title}`}
              className="mt-4 h-4 w-4 accent-[#1B5847]"
            />
            <div className="min-w-0 flex-1">{body}</div>
          </label>
        ) : (
          <Link href={`/projects/${projectId}/expenses/${expense.id}/edit`} className="block pb-0">
            {body}
          </Link>
        )}
        {expense.image && !selectMode && (
          <button
            type="button"
            aria-label="查看圖片"
            onClick={() => onViewImage(expense.image!)}
            className="absolute bottom-0 right-0 h-10 w-10 overflow-hidden rounded-[10px] bg-gradient-to-br from-v2-line to-v2-check"
          >
            <Image src={expense.image} alt="" fill className="object-cover" />
          </button>
        )}
      </div>
      <div
        data-testid={`expense-footer-${expense.id}`}
        className="mt-2.5 flex items-center justify-between border-t border-[#F0EAE0] pt-2.5"
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${isMe ? "bg-v2-lake" : "bg-v2-coral"}`}
            aria-hidden="true"
          >
            {payerName.charAt(0)}
          </span>
          <span className="font-medium">{payerName}</span>
          <span className="text-v2-check" aria-hidden="true">·</span>
          <span className="ml-0.5 flex" aria-hidden="true">
            {expense.participants.slice(0, 4).map((p, i) => (
              <span
                key={p.id}
                className={`h-4 w-4 rounded-full border-2 border-white ${DOT_TONES[i % DOT_TONES.length]} ${i > 0 ? "-ml-[5px]" : ""}`}
              />
            ))}
          </span>
          <span className="text-v2-ink-subtle">{expense.participants.length}人</span>
        </div>
        {!selectMode && (
          <button
            type="button"
            aria-label="刪除"
            onClick={() => onRequestDelete(expense)}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-v2-check"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          </button>
        )}
      </div>
    </div>
  )
}
```

```tsx
// components/v2/expenses/expenses-v2-view.tsx
import type { ReactNode } from "react"
import { CheckSquare, Sparkles, X } from "lucide-react"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { groupExpensesByDay } from "@/lib/expense-list"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { ExpenseSummaryCard } from "./expense-summary-card"
import { ExpenseCard } from "./expense-card"

export interface ExpensesV2ViewProps {
  projectId: string
  currency: string
  dateRangeLabel: string | null
  allCount: number
  expenses: ProjectExpense[]
  summary: { total: number; count: number; average: number }
  currentMemberId: string | null
  now: Date
  filterBar: ReactNode
  hasActiveFilters: boolean
  onClearFilters: () => void
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelectMode: () => void
  onToggleSelect: (id: string) => void
  onRequestDelete: (expense: ProjectExpense) => void
  onRequestBatchDelete: () => void
  onViewImage: (url: string) => void
  onVoice: () => void
}

export function ExpensesV2View(props: ExpensesV2ViewProps) {
  const groups = groupExpensesByDay(props.expenses, props.now)

  return (
    <>
      <V2TopBar title="全部支出" backHref={`/projects/${props.projectId}`} />
      <ExpenseSummaryCard currency={props.currency} dateRangeLabel={props.dateRangeLabel} summary={props.summary} />
      {props.filterBar}
      <div className="mx-4 mt-2.5 flex items-center justify-between">
        <span className="text-xs text-v2-ink-muted">
          顯示 <b className="text-v2-ink">{props.expenses.length}</b> / {props.allCount} 筆
        </span>
        <div className="flex items-center gap-2.5">
          {props.hasActiveFilters && (
            <button type="button" onClick={props.onClearFilters} className="text-xs font-bold text-v2-ink-muted">
              清除
            </button>
          )}
          <button
            type="button"
            onClick={props.onToggleSelectMode}
            className="inline-flex items-center gap-1 rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-xs font-bold"
          >
            {props.selectMode ? <X className="h-3 w-3" aria-hidden="true" /> : <CheckSquare className="h-3 w-3" aria-hidden="true" />}
            {props.selectMode ? "取消" : "批次"}
          </button>
        </div>
      </div>

      <div className="px-4 pb-44 pt-3.5">
        {props.allCount === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">尚無支出記錄</p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-v2-ink-muted">找不到符合的支出</p>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <p className="mb-2 text-xs font-semibold text-v2-ink-subtle">{group.label}</p>
              {group.expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  projectId={props.projectId}
                  expense={expense}
                  currentMemberId={props.currentMemberId}
                  selectMode={props.selectMode}
                  selected={props.selectedIds.has(expense.id)}
                  onToggleSelect={props.onToggleSelect}
                  onRequestDelete={props.onRequestDelete}
                  onViewImage={props.onViewImage}
                />
              ))}
            </section>
          ))
        )}
      </div>

      {props.selectMode ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-v2-line bg-v2-surface px-4 py-3">
          <button
            type="button"
            disabled={props.selectedIds.size === 0}
            onClick={props.onRequestBatchDelete}
            className="mx-auto block w-full max-w-md rounded-full bg-v2-danger py-3 text-[15px] font-bold text-white disabled:opacity-40"
          >
            刪除 {props.selectedIds.size} 筆
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={props.onVoice}
          className="fixed bottom-6 right-4 z-50 flex items-center gap-2"
        >
          <span className="rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium shadow-[0_2px_6px_rgba(27,24,21,.08)]">
            AI 快速記帳
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-white shadow-[0_4px_10px_rgba(232,130,90,.35)]">
            <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
          </span>
        </button>
      )}
    </>
  )
}
```

- [ ] **Step 9: Run the view test**

Run: `npx vitest run tests/components/v2/expenses-v2.test.tsx`
Expected: PASS

- [ ] **Step 10: Write the container and wire the page**

```tsx
// components/v2/expenses/expenses-v2.tsx
"use client"

import { useState } from "react"
import Image from "next/image"
import { useLiff } from "@/components/auth/liff-provider"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"
import { NotifyLineCheckbox } from "@/components/expense/notify-line-checkbox"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { useCurrencyConversion, useExpenseFilters, useProjectData } from "@/lib/hooks"
import { useProjectExpenses, type ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { summarizeExpenses } from "@/lib/expense-list"
import { formatTripDateRange } from "@/lib/trip"
import { ExpenseFilterBar } from "./expense-filter-bar"
import { ExpensesV2View } from "./expenses-v2-view"

export function ExpensesV2({ projectId }: { projectId: string }) {
  const { user } = useLiff()
  const { project, members, loading: projectLoading, projectCurrency, customRates, precision } = useProjectData(projectId)
  const { expenses, loading, deleting, canNotifyLine, refetch, deleteExpense, batchDeleteExpenses } =
    useProjectExpenses(projectId, { projectName: project?.name || "" })
  const f = useExpenseFilters(expenses)
  const { convert } = useCurrencyConversion({ projectCurrency, customRates, precision })

  const [deleteTarget, setDeleteTarget] = useState<ProjectExpense | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDelete, setShowBatchDelete] = useState(false)
  const [notifyLine, setNotifyLine] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showVoice, setShowVoice] = useState(false)

  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null
  const dateRange = project ? formatTripDateRange(project.startDate, project.endDate) : null

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (await deleteExpense(deleteTarget.id, { notifyLine })) setDeleteTarget(null)
  }

  async function confirmBatchDelete() {
    if (await batchDeleteExpenses(Array.from(selectedIds), { notifyLine })) {
      setSelectedIds(new Set())
      setSelectMode(false)
      setShowBatchDelete(false)
    }
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        {loading || projectLoading ? (
          <div data-testid="v2-expenses-skeleton" className="space-y-3 p-4">
            <div className="h-32 animate-pulse rounded-[18px] bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
            <div className="h-24 animate-pulse rounded-2xl bg-v2-sand" />
          </div>
        ) : (
          <ExpensesV2View
            projectId={projectId}
            currency={projectCurrency}
            dateRangeLabel={dateRange && dateRange !== "尚未設定日期" ? dateRange : null}
            allCount={expenses.length}
            expenses={f.filteredExpenses}
            summary={summarizeExpenses(f.filteredExpenses, convert)}
            currentMemberId={currentMemberId}
            now={new Date()}
            filterBar={
              <ExpenseFilterBar
                filters={f.filters}
                currency={projectCurrency}
                maxAmount={f.maxAmount}
                payers={f.uniquePayers}
                participants={f.uniqueParticipants}
                currencies={f.uniqueCurrencies}
                onSearch={f.setSearchQuery}
                onToggleCategory={f.toggleCategory}
                onTogglePayer={f.togglePayer}
                onToggleParticipant={f.toggleParticipant}
                onToggleCurrency={f.toggleCurrency}
                onAmountRange={f.setAmountRange}
                onCreatedRange={f.setCreatedDateRange}
                onExpenseRange={f.setExpenseDateRange}
              />
            }
            hasActiveFilters={f.hasActiveFilters}
            onClearFilters={f.clearFilters}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelectMode={() => {
              setSelectMode((v) => !v)
              setSelectedIds(new Set())
            }}
            onToggleSelect={toggleSelect}
            onRequestDelete={setDeleteTarget}
            onRequestBatchDelete={() => setShowBatchDelete(true)}
            onViewImage={setViewingImage}
            onVoice={() => setShowVoice(true)}
          />
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description="確定要刪除這筆支出嗎？此操作無法復原。"
        onConfirm={confirmDelete}
        loading={deleting}
      >
        {canNotifyLine && <NotifyLineCheckbox checked={notifyLine} onChange={setNotifyLine} />}
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={showBatchDelete}
        onOpenChange={setShowBatchDelete}
        title="確認批量刪除"
        description={`確定要刪除選取的 ${selectedIds.size} 筆支出嗎？此操作無法復原。`}
        onConfirm={confirmBatchDelete}
        loading={deleting}
        confirmText={`刪除 ${selectedIds.size} 筆`}
      >
        {canNotifyLine && <NotifyLineCheckbox checked={notifyLine} onChange={setNotifyLine} />}
      </ConfirmDeleteDialog>

      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>消費圖片</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <Image src={viewingImage} alt="消費圖片" width={800} height={600} className="h-auto max-h-[80vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <VoiceExpenseDialog
        open={showVoice}
        onOpenChange={setShowVoice}
        projectId={projectId}
        projectName={project?.name || ""}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName, userId: m.userId, user: m.user }))}
        currentUserMemberId={currentMemberId || ""}
        currency={projectCurrency}
        onSuccess={() => {
          refetch()
        }}
      />
    </UiV2Scope>
  )
}
```

`ConfirmDeleteDialog` 的單筆刪除 `description` 請以原頁面單筆刪除對話框的文字為準（讀原檔確認後照用）。

`app/projects/[id]/expenses/page.tsx` 改為：

```tsx
"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ExpensesV1 } from "@/components/v1/expenses/expenses-v1"
import { ExpensesV2 } from "@/components/v2/expenses/expenses-v2"

export default function ExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ExpensesV1 projectId={id} />} v2={<ExpensesV2 projectId={id} />} />
}
```

- [ ] **Step 11: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過

```bash
git add lib/expense-list.ts components/v2/category-style.ts components/v2/project/recent-expenses.tsx components/v2/expenses "app/projects/[id]/expenses/page.tsx" tests/lib/expense-list.test.ts tests/components/v2/expenses-v2.test.tsx
git commit -F - <<'EOF'
feat: Add v2 expense list (A6) behind ui version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 3: A5 共用邏輯與 v1 搬移

**Files:**
- Create: `lib/hooks/useSettlement.ts`
- Create: `lib/constants/sponsor.ts`
- Create: `components/settle/share-settlement-dialog.tsx`
- Create: `components/settle/settlement-calc-dialog.tsx`
- Create: `components/v1/settle/settle-v1.tsx`（由 `app/projects/[id]/settle/page.tsx` 搬移）
- Modify: `app/projects/[id]/settle/page.tsx`
- Test: `tests/lib/hooks/useSettlement.test.tsx`

**Interfaces:**
- Produces:
  - 型別 `SettleBalance`、`SettleSettlement`、`SettleExpenseDetail`、`SettleData`（與原頁面 `Balance`、`Settlement`、`ExpenseDetail`、`SettleData` 欄位相同），由 `lib/hooks/useSettlement.ts` 匯出
  - `useSettlement(projectId: string): { data: SettleData | null; loading: boolean; error: string | null; displayCurrency: string | null; setDisplayCurrency: (code: string | null) => void; displayCurrencyCode: string; toDisplay: (amount: number) => number; shareText: string; refetch: () => Promise<void> }`
  - `SPONSOR_LINKS: { buyMeACoffee: string; koFi: string; paypal: string; email: string }`
  - `ShareSettlementDialog({ open: boolean; onOpenChange: (open: boolean) => void; shareText: string })`
  - `SettlementCalcDialog` — props 為原「計算說明」對話框 JSX 讀取的所有識別字（見 Step 5）
  - `SettleV1({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/lib/hooks/useSettlement.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => mockAuthFetch }))

import { useSettlement, type SettleData } from "@/lib/hooks/useSettlement"

const data: SettleData = {
  balances: [],
  settlements: [
    {
      from: { memberId: "a", displayName: "小美", userImage: null },
      to: { memberId: "b", displayName: "Emma", userImage: null },
      amount: 2400,
    },
  ],
  expenseDetails: [],
  summary: {
    totalExpenses: 3,
    totalAmount: 60730,
    totalShared: 60730,
    isBalanced: true,
    currency: "TWD",
    exchangeRatesUsed: { JPY: 0.2 },
  },
}

describe("useSettlement", () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it("loads settle data", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1/settle")
    expect(result.current.data).toEqual(data)
    expect(result.current.displayCurrencyCode).toBe("TWD")
  })

  it("reports the server error", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "無權限" }) })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("無權限")
  })

  it("converts to the chosen display currency", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.toDisplay(100)).toBe(100)
    act(() => result.current.setDisplayCurrency("JPY"))
    expect(result.current.displayCurrencyCode).toBe("JPY")
    expect(result.current.toDisplay(100)).toBe(500)
  })

  it("builds the share text", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => data })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shareText).toBe(
      ["💰 結算明細", "總支出：TWD 60,730", "", "📋 轉帳清單：", "1. 小美 ➡️ Emma：TWD 2,400"].join("\n")
    )
  })

  it("says everyone is settled when there are no transfers", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...data, settlements: [] }) })
    const { result } = renderHook(() => useSettlement("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shareText.endsWith("✅ 所有人都已結清！")).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/hooks/useSettlement.test.tsx`
Expected: FAIL，無法解析 `@/lib/hooks/useSettlement`

- [ ] **Step 3: Write the hook**

型別從原頁面 `interface Balance`、`Settlement`、`ExpenseDetail`、`SettleData` 逐字複製並改名加 `Settle` 前綴後匯出。邏輯取自原頁面 `fetchSettleData`、`convertToDisplayCurrency`、`getDisplayCurrencyCode`、`generateShareText`：

```ts
// lib/hooks/useSettlement.ts
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/constants/currencies"

export interface SettleBalance {
  memberId: string
  displayName: string
  userImage: string | null
  balance: number
  totalPaid: number
  totalShare: number
}

export interface SettleSettlement {
  from: { memberId: string; displayName: string; userImage: string | null }
  to: { memberId: string; displayName: string; userImage: string | null }
  amount: number
}

export interface SettleExpenseDetail {
  id: string
  description: string
  amount: number
  currency: string
  convertedAmount: number
  payer: { memberId: string; displayName: string }
  participants: { memberId: string; displayName: string; shareAmount: number; convertedShareAmount: number }[]
}

export interface SettleData {
  balances: SettleBalance[]
  settlements: SettleSettlement[]
  expenseDetails: SettleExpenseDetail[]
  summary: {
    totalExpenses: number
    totalAmount: number
    totalShared: number
    isBalanced: boolean
    currency?: string
    precision?: number
    exchangeRatesUsed?: Record<string, number>
    defaultRates?: Record<string, number>
    usingCustomRates?: Record<string, boolean>
    hasCustomRates?: boolean
  }
}

export function useSettlement(projectId: string) {
  const authFetch = useAuthFetch()
  const [data, setData] = useState<SettleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null) // null = project currency

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}/settle`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const errData = await res.json()
        setError(errData.error || "獲取結算數據失敗")
      }
    } catch (err) {
      console.error("獲取結算數據錯誤:", err)
      setError("獲取結算數據失敗")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const baseCurrency = data?.summary.currency || DEFAULT_CURRENCY
  const displayCurrencyCode = displayCurrency || baseCurrency

  const toDisplay = useCallback(
    (amount: number) => {
      if (!displayCurrency || !data || displayCurrency === baseCurrency) return amount
      const rate = data.summary.exchangeRatesUsed?.[displayCurrency] || data.summary.defaultRates?.[displayCurrency]
      return rate ? amount / rate : amount
    },
    [displayCurrency, data, baseCurrency]
  )

  const shareText = useMemo(() => {
    if (!data) return ""
    const lines = ["💰 結算明細", `總支出：${formatCurrency(data.summary.totalAmount, baseCurrency)}`, ""]
    if (data.settlements.length === 0) {
      lines.push("✅ 所有人都已結清！")
    } else {
      lines.push("📋 轉帳清單：")
      data.settlements.forEach((s, idx) => {
        lines.push(`${idx + 1}. ${s.from.displayName} ➡️ ${s.to.displayName}：${formatCurrency(s.amount, baseCurrency)}`)
      })
    }
    return lines.join("\n")
  }, [data, baseCurrency])

  return { data, loading, error, displayCurrency, setDisplayCurrency, displayCurrencyCode, toDisplay, shareText, refetch }
}
```

注意：原頁面的 `useEffect(() => { fetchSettleData() }, [fetchSettleData])` 依賴 `authFetch`，這裡保持相同行為（`[refetch]`）。

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/hooks/useSettlement.test.tsx`
Expected: PASS

- [ ] **Step 5: Extract the constants and dialogs**

```ts
// lib/constants/sponsor.ts
export const SPONSOR_LINKS = {
  buyMeACoffee: "https://buymeacoffee.com/kewos55432m",
  koFi: "https://ko-fi.com/your-username",
  paypal: "https://paypal.me/your-username",
  email: "mailto:kewos554321@gmail.com?subject=Wander Wallet 贊助詢問",
} as const
```

`components/settle/share-settlement-dialog.tsx`：把原頁面 `<Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>...</Dialog>`（分享結算結果）整段逐字搬入，改為元件：

```tsx
"use client"

import { useState } from "react"
// imports: copy exactly the icons/ui components the moved JSX uses

interface ShareSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareText: string
}

export function ShareSettlementDialog({ open, onOpenChange, shareText }: ShareSettlementDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("複製失敗:", err)
    }
  }

  function handleShareLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`, "_blank")
    onOpenChange(false)
  }

  return (
    // the moved <Dialog> JSX, with open={open} onOpenChange={onOpenChange},
    // generateShareText() replaced by shareText
  )
}
```

`components/settle/settlement-calc-dialog.tsx`：把原頁面「計算說明」的 `<Dialog open={calcDialogOpen} ...>...</Dialog>` 整段逐字搬入。Props：`open`、`onOpenChange`、`data: SettleData`、`toDisplay: (amount: number) => number`、`displayCurrencyCode: string`，以及搬移後 JSX 仍讀到的其他識別字（全部改為 props，不可在元件內重新計算）。若該對話框的 trigger 按鈕原本是 `DialogTrigger` 包在 `<Dialog>` 內，把 trigger 留在頁面、改由 `open` 控制。報告中列出最終 props。

- [ ] **Step 6: Move the v1 page**

```bash
mkdir -p components/v1/settle
git mv "app/projects/[id]/settle/page.tsx" components/v1/settle/settle-v1.tsx
```

在 `components/v1/settle/settle-v1.tsx`：
1. 函式簽名改為 `export function SettleV1({ projectId: id }: { projectId: string }) {`，刪除 `use(params)`。
2. 刪除 `interface Balance/Settlement/ExpenseDetail/SettleData`，改 import `useSettlement` 與需要的型別。
3. 刪除 state `data`、`loading`、`error`、`copied`、`displayCurrency`，以及 `fetchSettleData`、其 `useEffect`、`convertToDisplayCurrency`、`getDisplayCurrencyCode`、`generateShareText`、`handleCopy`、`handleShareLINE`；加入：
   ```tsx
   const { data, loading, error, displayCurrency, setDisplayCurrency, displayCurrencyCode, toDisplay, shareText } = useSettlement(id)
   const convertToDisplayCurrency = toDisplay
   const getDisplayCurrencyCode = () => displayCurrencyCode
   ```
4. 分享與計算說明對話框改用 `<ShareSettlementDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} shareText={shareText} />` 與 `<SettlementCalcDialog ... />`。
5. 贊助卡的 4 個連結改用 `SPONSOR_LINKS`（`window.open(SPONSOR_LINKS.buyMeACoffee, "_blank")` 等；email 用 `window.location.href = SPONSOR_LINKS.email`）。
6. 移除不再使用的 import。

新的 `app/projects/[id]/settle/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { SettleV1 } from "@/components/v1/settle/settle-v1"

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SettleV1 projectId={id} />
}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過。報告附上「移除的 state／函式 → 現在在哪裡」對照表。

```bash
git add lib/hooks/useSettlement.ts lib/constants/sponsor.ts components/settle components/v1/settle "app/projects/[id]/settle/page.tsx" tests/lib/hooks/useSettlement.test.tsx
git commit -F - <<'EOF'
refactor: Move settle page to SettleV1 with shared hook and dialogs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 4: A5 結算 v2

**Files:**
- Create: `lib/settlement.ts`
- Modify: `lib/hooks/useProjectData.ts`（`Project` 介面加 `expenses?: { expenseDate: string }[]`）
- Create: `components/v2/settle/settle-summary-grid.tsx`
- Create: `components/v2/settle/settlement-list.tsx`
- Create: `components/v2/settle/member-balances.tsx`
- Create: `components/v2/settle/sponsor-card.tsx`
- Create: `components/v2/settle/settle-v2-view.tsx`
- Create: `components/v2/settle/settle-v2.tsx`
- Modify: `app/projects/[id]/settle/page.tsx`
- Test: `tests/lib/settlement.test.ts`、`tests/components/v2/settle-v2.test.tsx`

**Interfaces:**
- Consumes: Task 3 全部；`useProjectData`；`getTripDays`（`@/lib/trip`）；`UiV2Scope`、`V2TopBar`、`UiVersionSwitch`；`AdContainer`；shadcn `Select`
- Produces:
  - `computeDailyAverage(total: number, trip: { startDate: string | null; endDate: string | null }, expenseDates: string[]): number`
  - `SettleV2({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing unit test**

```ts
// tests/lib/settlement.test.ts
import { describe, it, expect } from "vitest"
import { computeDailyAverage } from "@/lib/settlement"

const local = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).toISOString()

describe("computeDailyAverage", () => {
  it("uses the trip length when both dates are set", () => {
    expect(computeDailyAverage(5000, { startDate: local(11, 12), endDate: local(11, 16) }, [local(11, 13)])).toBe(1000)
  })

  it("falls back to the span of expense dates", () => {
    expect(computeDailyAverage(900, { startDate: null, endDate: null }, [local(11, 15, 23), local(11, 13, 1), local(11, 14)])).toBe(300)
  })

  it("uses the expense span when only one trip date is set", () => {
    expect(computeDailyAverage(400, { startDate: local(11, 12), endDate: null }, [local(11, 12), local(11, 13)])).toBe(200)
  })

  it("is 0 without expenses and dates", () => {
    expect(computeDailyAverage(0, { startDate: null, endDate: null }, [])).toBe(0)
  })

  it("treats a single expense day as one day", () => {
    expect(computeDailyAverage(350, { startDate: null, endDate: null }, [local(11, 12)])).toBe(350)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/settlement.test.ts`
Expected: FAIL，無法解析 `@/lib/settlement`

- [ ] **Step 3: Write `lib/settlement.ts`**

```ts
// lib/settlement.ts
import { getTripDays } from "@/lib/trip"

// Days come from the trip dates when both are set; otherwise from the span of
// expense payment dates (inclusive). No days → 0.
export function computeDailyAverage(
  total: number,
  trip: { startDate: string | null; endDate: string | null },
  expenseDates: string[]
): number {
  let days = getTripDays(trip.startDate, trip.endDate)
  if (days === null && expenseDates.length > 0) {
    const times = expenseDates.map((d) => new Date(d).getTime())
    days = getTripDays(new Date(Math.min(...times)).toISOString(), new Date(Math.max(...times)).toISOString())
  }
  return days && days > 0 ? total / days : 0
}
```

在 `lib/hooks/useProjectData.ts` 的 `export interface Project` 最後加一行：

```ts
  expenses?: { expenseDate: string }[]
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/settlement.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing view test**

```tsx
// tests/components/v2/settle-v2.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { SettleV2View } from "@/components/v2/settle/settle-v2-view"
import type { SettleData } from "@/lib/hooks/useSettlement"

const data: SettleData = {
  balances: [
    { memberId: "me", displayName: "Emma", userImage: null, balance: 3370, totalPaid: 18200, totalShare: 14830 },
    { memberId: "mei", displayName: "小美", userImage: null, balance: -2400, totalPaid: 12430, totalShare: 14830 },
  ],
  settlements: [
    { from: { memberId: "mei", displayName: "小美", userImage: null }, to: { memberId: "me", displayName: "Emma", userImage: null }, amount: 2400 },
  ],
  expenseDetails: [],
  summary: { totalExpenses: 12, totalAmount: 29660, totalShared: 29660, isBalanced: true, currency: "TWD", exchangeRatesUsed: { JPY: 0.2 } },
}

function renderView(overrides: Partial<Parameters<typeof SettleV2View>[0]> = {}) {
  const props: Parameters<typeof SettleV2View>[0] = {
    projectId: "p1",
    data,
    currentMemberId: "me",
    dailyAverage: 5932,
    displayCurrencyCode: "TWD",
    currencyOptions: ["TWD", "JPY"],
    onDisplayCurrency: vi.fn(),
    toDisplay: (n: number) => n,
    adSlot: <div>ad</div>,
    onShowCalc: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  }
  render(<SettleV2View {...props} />)
  return props
}

describe("SettleV2View", () => {
  it("shows the four summary tiles", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("12")).toBeInTheDocument()
    expect(within(grid).getByText("29,660")).toBeInTheDocument()
    expect(within(grid).getByText("5,932")).toBeInTheDocument()
    expect(within(grid).getByText("14,830")).toBeInTheDocument()
    expect(within(grid).getByText("總金額 (TWD)")).toBeInTheDocument()
  })

  it("lists transfers with 我 for the current member", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    expect(within(row).getByText("小美")).toBeInTheDocument()
    expect(within(row).getByText("我", { selector: "span.font-medium" })).toBeInTheDocument()
    expect(within(row).getByText("TWD 2,400")).toBeInTheDocument()
  })

  it("shows the settled state without transfers", () => {
    renderView({ data: { ...data, settlements: [] } })
    expect(screen.getByText("所有人都已結清")).toBeInTheDocument()
  })

  it("shows per-member balances", () => {
    renderView()
    const section = screen.getByRole("region", { name: "各人收支" })
    expect(within(section).getByText("+TWD 3,370")).toBeInTheDocument()
    expect(within(section).getByText("−TWD 2,400")).toBeInTheDocument()
  })

  it("wires calc, share, stats link and currency select", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "計算說明" }))
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    expect(props.onShowCalc).toHaveBeenCalled()
    expect(props.onShare).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: /查看統計/ })).toHaveAttribute("href", "/projects/p1/stats")
    expect(screen.getByLabelText("顯示幣別")).toBeInTheDocument()
  })

  it("hides the currency select with a single currency", () => {
    renderView({ currencyOptions: ["TWD"] })
    expect(screen.queryByLabelText("顯示幣別")).not.toBeInTheDocument()
  })

  it("shows the exchange-rate note and sponsor card", () => {
    renderView()
    expect(screen.getByRole("link", { name: /前往專案設定調整匯率/ })).toHaveAttribute("href", "/projects/p1/settings")
    expect(screen.getByText("喜歡 Wander Wallet 嗎？")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Buy Me a Coffee/ })).toBeInTheDocument()
  })

  it("shows 0 per person without balances", () => {
    renderView({ data: { ...data, balances: [], settlements: [] } })
    expect(within(screen.getByTestId("settle-summary")).getAllByText("0").length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/settle/settle-v2-view`

- [ ] **Step 7: Write the view components**

版面數值取自 `design/project/Settle.dc.html`。

```tsx
// components/v2/settle/settle-summary-grid.tsx
import { Calculator, Receipt, TrendingUp, Users, type LucideIcon } from "lucide-react"

interface Tile {
  label: string
  value: string
  icon: LucideIcon
  tone: { bg: string; iconBg: string; text: string }
}

const LAKE = { bg: "bg-v2-lake-soft", iconBg: "bg-[#D2EAE1]", text: "text-v2-lake" }
const CORAL = { bg: "bg-v2-coral-soft", iconBg: "bg-[#F6DCCB]", text: "text-[#C4602F]" }
const PLUM = { bg: "bg-v2-plum-soft", iconBg: "bg-[#E4DCF2]", text: "text-v2-plum" }

interface SettleSummaryGridProps {
  count: number
  total: number
  dailyAverage: number
  perPerson: number
  currencyCode: string
  currencySelect?: React.ReactNode
}

const n = (value: number) => Math.round(value).toLocaleString()

export function SettleSummaryGrid({ count, total, dailyAverage, perPerson, currencyCode, currencySelect }: SettleSummaryGridProps) {
  const tiles: Tile[] = [
    { label: "支出筆數", value: String(count), icon: Receipt, tone: LAKE },
    { label: `總金額 (${currencyCode})`, value: n(total), icon: Calculator, tone: CORAL },
    { label: `日均花費 (${currencyCode})`, value: n(dailyAverage), icon: TrendingUp, tone: LAKE },
    { label: `人均 (${currencyCode})`, value: n(perPerson), icon: Users, tone: PLUM },
  ]

  return (
    <div className="mx-4 mt-3.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">計算總覽</p>
        {currencySelect}
      </div>
      <div data-testid="settle-summary" className="grid grid-cols-2 gap-2.5 overflow-hidden rounded-2xl border border-v2-line bg-v2-surface p-4">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`flex flex-col items-center rounded-xl px-1 py-3 ${tone.bg}`}>
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${tone.iconBg} ${tone.text}`} aria-hidden="true">
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className={`font-v2-serif text-base font-bold tabular-nums ${tone.text}`}>{value}</span>
            <span className="mt-0.5 text-xs text-v2-ink-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// components/v2/settle/settlement-list.tsx
import { ArrowRight, Info, Share2 } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleSettlement } from "@/lib/hooks/useSettlement"

const AVATAR_TONES = [
  "bg-[#D2EAE1] text-v2-lake",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
  "bg-[#FBE3D2] text-[#C4602F]",
  "bg-v2-plum-soft text-v2-plum",
]

interface SettlementListProps {
  settlements: SettleSettlement[]
  memberIds: string[]
  currentMemberId: string | null
  currencyCode: string
  toDisplay: (amount: number) => number
  onShowCalc: () => void
  onShare: () => void
}

const actionButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#B7D9CB] bg-v2-lake-soft px-3 py-1.5 text-xs font-semibold text-v2-lake"

export function SettlementList({ settlements, memberIds, currentMemberId, currencyCode, toDisplay, onShowCalc, onShare }: SettlementListProps) {
  const tone = (memberId: string) => AVATAR_TONES[Math.max(0, memberIds.indexOf(memberId)) % AVATAR_TONES.length]
  const name = (memberId: string, displayName: string) => (memberId === currentMemberId ? "我" : displayName)

  const person = (memberId: string, displayName: string) => {
    const label = name(memberId, displayName)
    return (
      <>
        <span className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone(memberId)}`} aria-hidden="true">
          {label.charAt(0)}
        </span>
        <span className="text-sm font-medium leading-5 tracking-[.1px]">{label}</span>
      </>
    )
  }

  return (
    <div className="mx-4 mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">轉帳建議</p>
        <div className="flex gap-2">
          <button type="button" onClick={onShowCalc} className={actionButton}>
            <Info className="h-3 w-3" aria-hidden="true" />
            計算說明
          </button>
          <button type="button" onClick={onShare} className={actionButton}>
            <Share2 className="h-3 w-3" aria-hidden="true" />
            分享
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
        {settlements.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-v2-ink-muted">所有人都已結清</p>
        ) : (
          settlements.map((s, i) => (
            <div
              key={`${s.from.memberId}-${s.to.memberId}`}
              data-testid={`settlement-${i}`}
              className={`flex items-center justify-between gap-2.5 px-4 py-3 ${i < settlements.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {person(s.from.memberId, s.from.displayName)}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-label="付給" />
                {person(s.to.memberId, s.to.displayName)}
              </div>
              <p className="m-0 shrink-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums">
                {formatCurrency(Math.round(toDisplay(s.amount)), currencyCode)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

```tsx
// components/v2/settle/member-balances.tsx
import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleBalance } from "@/lib/hooks/useSettlement"

interface MemberBalancesProps {
  balances: SettleBalance[]
  currentMemberId: string | null
  currencyCode: string
  toDisplay: (amount: number) => number
}

export function MemberBalances({ balances, currentMemberId, currencyCode, toDisplay }: MemberBalancesProps) {
  if (balances.length === 0) return null
  const fmt = (value: number) => formatCurrency(Math.round(toDisplay(value)), currencyCode)

  return (
    <section aria-label="各人收支" className="mx-4 mt-4">
      <p className="mb-1.5 text-sm font-medium leading-5 tracking-[.1px]">各人收支</p>
      <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
        {balances.map((b, i) => {
          const rounded = Math.round(toDisplay(b.balance))
          const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
          return (
            <div key={b.memberId} className={`flex items-center justify-between gap-3 px-4 py-3 ${i < balances.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-medium">{b.memberId === currentMemberId ? "我" : b.displayName}</p>
                <p className="mt-0.5 text-xs text-v2-ink-muted">
                  已付 {fmt(b.totalPaid)} · 應付 {fmt(b.totalShare)}
                </p>
              </div>
              <p className={`m-0 shrink-0 font-v2-serif text-base font-bold tabular-nums ${rounded < 0 ? "text-v2-danger" : "text-v2-lake"}`}>
                {sign}
                {formatCurrency(Math.abs(rounded), currencyCode)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

```tsx
// components/v2/settle/sponsor-card.tsx
"use client"

import { Coffee, Heart, Mail } from "lucide-react"
import { SPONSOR_LINKS } from "@/lib/constants/sponsor"

const button = "inline-flex items-center gap-1.5 rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-xs font-semibold"

export function SponsorCard() {
  return (
    <div className="mx-4 mt-6 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-rose-soft text-v2-rose" aria-hidden="true">
          <Heart className="h-5 w-5" />
        </span>
        <div>
          <p className="m-0 font-v2-serif text-[15px] font-semibold">喜歡 Wander Wallet 嗎？</p>
          <p className="mt-0.5 text-xs text-v2-ink-muted">支持我們持續開發新功能</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-v2-ink-muted">
        Wander Wallet 是免費服務，由小團隊用愛維護。如果分帳工具對你有幫助，歡迎請我們喝杯咖啡！
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.buyMeACoffee, "_blank")}>
          <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
          Buy Me a Coffee
        </button>
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.koFi, "_blank")}>
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          Ko-fi
        </button>
        <button type="button" className={button} onClick={() => window.open(SPONSOR_LINKS.paypal, "_blank")}>
          PayPal
        </button>
        <button type="button" className={button} onClick={() => (window.location.href = SPONSOR_LINKS.email)}>
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          其他方式
        </button>
      </div>
    </div>
  )
}
```

```tsx
// components/v2/settle/settle-v2-view.tsx
import type { ReactNode } from "react"
import Link from "next/link"
import { BarChart3, ChevronRight, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SettleData } from "@/lib/hooks/useSettlement"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { SettleSummaryGrid } from "./settle-summary-grid"
import { SettlementList } from "./settlement-list"
import { MemberBalances } from "./member-balances"
import { SponsorCard } from "./sponsor-card"

export interface SettleV2ViewProps {
  projectId: string
  data: SettleData
  currentMemberId: string | null
  dailyAverage: number
  displayCurrencyCode: string
  currencyOptions: string[]
  onDisplayCurrency: (code: string) => void
  toDisplay: (amount: number) => number
  adSlot?: ReactNode
  onShowCalc: () => void
  onShare: () => void
}

export function SettleV2View(props: SettleV2ViewProps) {
  const { data, toDisplay } = props
  const perPerson = data.balances.length > 0 ? data.summary.totalAmount / data.balances.length : 0
  const rates = data.summary.exchangeRatesUsed ?? {}

  const currencySelect =
    props.currencyOptions.length > 1 ? (
      <Select value={props.displayCurrencyCode} onValueChange={props.onDisplayCurrency}>
        <SelectTrigger size="sm" aria-label="顯示幣別" className="h-7 w-auto border-v2-line bg-v2-surface text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.currencyOptions.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null

  return (
    <>
      <V2TopBar title="結算" backHref={`/projects/${props.projectId}`} />
      <SettleSummaryGrid
        count={data.summary.totalExpenses}
        total={toDisplay(data.summary.totalAmount)}
        dailyAverage={toDisplay(props.dailyAverage)}
        perPerson={toDisplay(perPerson)}
        currencyCode={props.displayCurrencyCode}
        currencySelect={currencySelect}
      />
      {props.adSlot && <div className="mx-4 mt-3">{props.adSlot}</div>}
      {Object.keys(rates).length > 0 && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-v2-line bg-v2-surface px-3 py-2.5 text-xs text-v2-ink-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="m-0 font-medium text-v2-ink">{data.summary.hasCustomRates ? "使用自訂匯率結算" : "使用即時匯率結算"}</p>
            {Object.entries(rates).map(([code, rate]) => (
              <p key={code} className="m-0">
                1 {code} = {rate.toFixed(data.summary.precision ?? 2)} {data.summary.currency}
                {data.summary.usingCustomRates?.[code] ? "（自訂）" : ""}
              </p>
            ))}
            <Link href={`/projects/${props.projectId}/settings`} className="mt-1 inline-block font-semibold text-v2-link">
              前往專案設定調整匯率
            </Link>
          </div>
        </div>
      )}
      <SettlementList
        settlements={data.settlements}
        memberIds={data.balances.map((b) => b.memberId)}
        currentMemberId={props.currentMemberId}
        currencyCode={props.displayCurrencyCode}
        toDisplay={toDisplay}
        onShowCalc={props.onShowCalc}
        onShare={props.onShare}
      />
      <MemberBalances
        balances={data.balances}
        currentMemberId={props.currentMemberId}
        currencyCode={props.displayCurrencyCode}
        toDisplay={toDisplay}
      />
      <div className="mx-4 mt-3.5 text-center">
        <Link href={`/projects/${props.projectId}/stats`} className="inline-flex items-center gap-[5px] text-xs font-semibold text-v2-ink-muted">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          查看統計
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <SponsorCard />
      <div className="h-8" />
    </>
  )
}
```

注意：`SettlementList` 的轉帳金額已是專案幣別；若 v1 對轉帳金額也做 `convertToDisplayCurrency`，v2 照做（上面已經套 `toDisplay`）。請讀 v1 確認；若 v1 沒有轉換，拿掉 `toDisplay` 並在報告說明。

- [ ] **Step 8: Run the view test**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx`
Expected: PASS

- [ ] **Step 9: Write the container and wire the page**

```tsx
// components/v2/settle/settle-v2.tsx
"use client"

import { useState, type ReactNode } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import { AdContainer } from "@/components/ads/ad-container"
import { ShareSettlementDialog } from "@/components/settle/share-settlement-dialog"
import { SettlementCalcDialog } from "@/components/settle/settlement-calc-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectData } from "@/lib/hooks"
import { useSettlement } from "@/lib/hooks/useSettlement"
import { computeDailyAverage } from "@/lib/settlement"
import { SettleV2View } from "./settle-v2-view"

export function SettleV2({ projectId }: { projectId: string }) {
  const { user } = useLiff()
  const { project, members } = useProjectData(projectId)
  const s = useSettlement(projectId)
  const [showShare, setShowShare] = useState(false)
  const [showCalc, setShowCalc] = useState(false)

  const baseCurrency = s.data?.summary.currency || DEFAULT_CURRENCY
  const currentMemberId = members.find((m) => m.user?.id === user?.id)?.id ?? null

  let content: ReactNode
  if (s.loading) {
    content = (
      <div data-testid="v2-settle-skeleton" className="space-y-3 p-4">
        <div className="h-48 animate-pulse rounded-2xl bg-v2-sand" />
        <div className="h-32 animate-pulse rounded-2xl bg-v2-sand" />
      </div>
    )
  } else if (s.error || !s.data) {
    content = <p className="py-8 text-center text-v2-ink-muted">{s.error || "獲取結算數據失敗"}</p>
  } else {
    const dailyAverage = computeDailyAverage(
      s.data.summary.totalAmount,
      { startDate: project?.startDate ?? null, endDate: project?.endDate ?? null },
      (project?.expenses ?? []).map((e) => e.expenseDate)
    )
    content = (
      <>
        <SettleV2View
          projectId={projectId}
          data={s.data}
          currentMemberId={currentMemberId}
          dailyAverage={dailyAverage}
          displayCurrencyCode={s.displayCurrencyCode}
          currencyOptions={[baseCurrency, ...Object.keys(s.data.summary.exchangeRatesUsed ?? {})]}
          onDisplayCurrency={(code) => s.setDisplayCurrency(code === baseCurrency ? null : code)}
          toDisplay={s.toDisplay}
          adSlot={<AdContainer placement="settle" variant="banner" />}
          onShowCalc={() => setShowCalc(true)}
          onShare={() => setShowShare(true)}
        />
        <ShareSettlementDialog open={showShare} onOpenChange={setShowShare} shareText={s.shareText} />
        {/* pass the props defined in Task 3 */}
        <SettlementCalcDialog open={showCalc} onOpenChange={setShowCalc} data={s.data} toDisplay={s.toDisplay} displayCurrencyCode={s.displayCurrencyCode} />
      </>
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
```

`SettlementCalcDialog` 的 props 以 Task 3 最終定義為準（讀該檔）。

`app/projects/[id]/settle/page.tsx` 改為：

```tsx
"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { SettleV1 } from "@/components/v1/settle/settle-v1"
import { SettleV2 } from "@/components/v2/settle/settle-v2"

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<SettleV1 projectId={id} />} v2={<SettleV2 projectId={id} />} />
}
```

- [ ] **Step 10: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過

```bash
git add lib/settlement.ts lib/hooks/useProjectData.ts components/v2/settle "app/projects/[id]/settle/page.tsx" tests/lib/settlement.test.ts tests/components/v2/settle-v2.test.tsx
git commit -F - <<'EOF'
feat: Add v2 settle page (A5) behind ui version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 5: A7 共用邏輯與 v1 搬移

**Files:**
- Create: `lib/hooks/useProjectMembers.ts`
- Create: `components/members/add-member-dialog.tsx`
- Create: `components/v1/members/members-v1.tsx`（由 `app/projects/[id]/members/page.tsx` 搬移）
- Modify: `app/projects/[id]/members/page.tsx`
- Test: `tests/lib/hooks/useProjectMembers.test.tsx`

**Interfaces:**
- Produces:
  - `interface ManagedMember { id: string; userId: string | null; role: string; displayName: string; claimedAt: string | null; user: { id: string; name: string | null; email: string; image: string | null } | null }`
  - `interface MembersProject { id: string; name: string; createdBy: string; creator: { id: string; name: string | null; email: string }; members: ManagedMember[] }`
  - `useProjectMembers(projectId: string): { project: MembersProject | null; loading: boolean; isOwner: boolean; currentUserId: string | null; removing: string | null; refetch: () => Promise<void>; addMember: (name: string) => Promise<string | null>; removeMember: (memberId: string) => Promise<boolean>; batchRemove: (memberIds: string[]) => Promise<void> }`
    - 非 ok 載入 → `router.push("/projects")`
    - `addMember` 成功回傳 `null` 並重新載入；失敗回傳錯誤字串（`data.error || "新增失敗"`；例外 `"新增失敗"`）
    - `removeMember` **不做** `confirm()`（由 UI 呼叫前確認）；失敗 `alert(data.error || "移除失敗")`
    - `batchRemove` 對每個 id 發 DELETE；有失敗時 `alert(\`${failCount} 位成員移除失敗\`)`；例外 `alert("批次移除失敗")`；結束後重新載入
    - `isOwner` = `project.createdBy === user?.id || project.creator?.id === user?.id`
  - `AddMemberDialog({ open: boolean; onOpenChange: (open: boolean) => void; onAdd: (name: string) => Promise<string | null> })`
  - `MembersV1({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/lib/hooks/useProjectMembers.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
const mockPush = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
  useLiff: () => ({ user: { id: "u1" } }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))

import { useProjectMembers, type MembersProject } from "@/lib/hooks/useProjectMembers"

const project: MembersProject = {
  id: "p1",
  name: "東京",
  createdBy: "u1",
  creator: { id: "u1", name: "Emma", email: "e@x.com" },
  members: [
    { id: "m1", userId: "u1", role: "owner", displayName: "Emma", claimedAt: null, user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
    { id: "m2", userId: null, role: "member", displayName: "阿凱", claimedAt: null, user: null },
  ],
}

const ok = (body: unknown) => ({ ok: true, json: async () => body })
const fail = (body: unknown) => ({ ok: false, json: async () => body })

describe("useProjectMembers", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset()
    mockPush.mockReset()
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  it("loads the project and knows the owner", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.project?.members).toHaveLength(2)
    expect(result.current.isOwner).toBe(true)
    expect(result.current.currentUserId).toBe("u1")
  })

  it("is not owner for other users", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok({ ...project, createdBy: "u9", creator: { id: "u9", name: null, email: "x" } }))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isOwner).toBe(false)
  })

  it("redirects when loading fails", async () => {
    mockAuthFetch.mockResolvedValueOnce(fail({}))
    renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/projects"))
  })

  it("adds a member and reloads", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok({})).mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let error: string | null = "x"
    await act(async () => {
      error = await result.current.addMember("  小雨 ")
    })
    expect(error).toBeNull()
    expect(mockAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/projects/p1/members",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "小雨" }) })
    )
    expect(mockAuthFetch).toHaveBeenCalledTimes(3)
  })

  it("returns the add error", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(fail({ error: "名稱重複" }))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let error: string | null = null
    await act(async () => {
      error = await result.current.addMember("阿凱")
    })
    expect(error).toBe("名稱重複")
  })

  it("removes a member", async () => {
    mockAuthFetch.mockResolvedValueOnce(ok(project)).mockResolvedValueOnce(ok({})).mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.removeMember("m2")
    })
    expect(mockAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/projects/p1/members",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ memberId: "m2" }) })
    )
  })

  it("alerts how many batch removals failed", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(ok(project))
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(fail({}))
      .mockResolvedValueOnce(ok(project))
    const { result } = renderHook(() => useProjectMembers("p1"))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.batchRemove(["m2", "m3"])
    })
    expect(window.alert).toHaveBeenCalledWith("1 位成員移除失敗")
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/hooks/useProjectMembers.test.tsx`
Expected: FAIL，無法解析 `@/lib/hooks/useProjectMembers`

- [ ] **Step 3: Write the hook**

邏輯取自原頁面 `fetchProject`、`handleAddMember`、`handleRemoveMember`、`handleBatchRemove`：

```ts
// lib/hooks/useProjectMembers.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"

export interface ManagedMember {
  id: string
  userId: string | null
  role: string
  displayName: string
  claimedAt: string | null
  user: { id: string; name: string | null; email: string; image: string | null } | null
}

export interface MembersProject {
  id: string
  name: string
  createdBy: string
  creator: { id: string; name: string | null; email: string }
  members: ManagedMember[]
}

export function useProjectMembers(projectId: string) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const [project, setProject] = useState<MembersProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}`)
      if (res.ok) {
        setProject(await res.json())
      } else {
        router.push("/projects")
      }
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId, router])

  // Keyed on projectId only, like the original page.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const addMember = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim()
      if (!trimmed) return null
      try {
        const res = await authFetch(`/api/projects/${projectId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        })
        if (!res.ok) {
          const data = await res.json()
          return data.error || "新增失敗"
        }
        await refetch()
        return null
      } catch {
        return "新增失敗"
      }
    },
    [authFetch, projectId, refetch]
  )

  const deleteRequest = useCallback(
    (memberId: string) =>
      authFetch(`/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      }),
    [authFetch, projectId]
  )

  const removeMember = useCallback(
    async (memberId: string) => {
      setRemoving(memberId)
      try {
        const res = await deleteRequest(memberId)
        if (!res.ok) {
          const data = await res.json()
          alert(data.error || "移除失敗")
          return false
        }
        await refetch()
        return true
      } catch {
        alert("移除失敗")
        return false
      } finally {
        setRemoving(null)
      }
    },
    [deleteRequest, refetch]
  )

  const batchRemove = useCallback(
    async (memberIds: string[]) => {
      if (memberIds.length === 0) return
      setRemoving("batch")
      try {
        const results = await Promise.all(memberIds.map(deleteRequest))
        const failCount = results.filter((res) => !res.ok).length
        if (failCount > 0) alert(`${failCount} 位成員移除失敗`)
        await refetch()
      } catch {
        alert("批次移除失敗")
      } finally {
        setRemoving(null)
      }
    },
    [deleteRequest, refetch]
  )

  const isOwner = !!project && (project.createdBy === user?.id || project.creator?.id === user?.id)

  return { project, loading, isOwner, currentUserId: user?.id ?? null, removing, refetch, addMember, removeMember, batchRemove }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/hooks/useProjectMembers.test.tsx`
Expected: PASS

- [ ] **Step 5: Extract the add-member dialog**

把原頁面手動新增成員的 `<Dialog open={showAddMember} ...>...</Dialog>` 整段（含表單、錯誤訊息、按鈕）逐字搬到 `components/members/add-member-dialog.tsx`：

```tsx
"use client"

import { useState } from "react"
// imports: exactly the ui components/icons the moved JSX uses

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => Promise<string | null>
}

export function AddMemberDialog({ open, onOpenChange, onAdd }: AddMemberDialogProps) {
  const [newMemberName, setNewMemberName] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!newMemberName.trim()) return
    setAdding(true)
    setAddError("")
    const error = await onAdd(newMemberName)
    setAdding(false)
    if (error) {
      setAddError(error)
      return
    }
    setNewMemberName("")
    onOpenChange(false)
  }

  return (
    // the moved <Dialog> JSX with open={open} onOpenChange={onOpenChange}
  )
}
```

`React.FormEvent` 改用 `import type { FormEvent } from "react"`。

- [ ] **Step 6: Move the v1 page**

```bash
mkdir -p components/v1/members
git mv "app/projects/[id]/members/page.tsx" components/v1/members/members-v1.tsx
```

在 `components/v1/members/members-v1.tsx`：
1. 函式簽名改為 `export function MembersV1({ projectId: id }: { projectId: string }) {`，刪除 `use(params)`。
2. 刪除 `interface ProjectMember`、`interface Project`，改為 `import type { ManagedMember as ProjectMember, MembersProject as Project } from "@/lib/hooks/useProjectMembers"`（只保留實際用到的）。
3. 刪除 state `project`、`loading`、`removing`、`newMemberName`、`adding`、`addError`，以及 `fetchProject` 與其 `useEffect`、`handleAddMember`、`handleRemoveMember`、`handleBatchRemove`。加入：
   ```tsx
   const { project, loading, removing, addMember, removeMember, batchRemove } = useProjectMembers(id)

   async function handleRemoveMember(memberId: string) {
     if (!confirm("確定要移除這位成員嗎？")) return
     await removeMember(memberId)
   }

   async function handleBatchRemove() {
     if (selectedMembers.size === 0) return
     setShowBatchDeleteDialog(false)
     await batchRemove(Array.from(selectedMembers))
     setSelectedMembers(new Set())
     setBatchMode(false)
   }
   ```
4. 新增成員對話框改用 `<AddMemberDialog open={showAddMember} onOpenChange={setShowAddMember} onAdd={addMember} />`。
5. `isOwner` 維持原本頁面內的計算（或改用 hook 的 `isOwner`，兩者等價；擇一並移除另一個）。
6. 移除不再使用的 import。

新的 `app/projects/[id]/members/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { MembersV1 } from "@/components/v1/members/members-v1"

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <MembersV1 projectId={id} />
}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過。報告附上對照表。

```bash
git add lib/hooks/useProjectMembers.ts components/members components/v1/members "app/projects/[id]/members/page.tsx" tests/lib/hooks/useProjectMembers.test.tsx
git commit -F - <<'EOF'
refactor: Move members page to MembersV1 with shared hook and add-member dialog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 6: A7 成員 v2

**Files:**
- Create: `components/v2/members/members-v2-view.tsx`
- Create: `components/v2/members/members-v2.tsx`
- Modify: `app/projects/[id]/members/page.tsx`
- Test: `tests/components/v2/members-v2.test.tsx`

**Interfaces:**
- Consumes: Task 5 全部；`InviteDialog`（`components/project/invite-dialog.tsx`）；`ConfirmDeleteDialog`；`UiV2Scope`、`V2TopBar`、`UiVersionSwitch`
- Produces: `MembersV2View(props)`、`MembersV2({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/members-v2.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { MembersV2View } from "@/components/v2/members/members-v2-view"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"

const project: MembersProject = {
  id: "p1",
  name: "東京",
  createdBy: "u1",
  creator: { id: "u1", name: "Emma", email: "emma@example.com" },
  members: [
    { id: "m1", userId: "u1", role: "owner", displayName: "Emma", claimedAt: null, user: { id: "u1", name: "Emma", email: "emma@example.com", image: null } },
    { id: "m2", userId: "u2", role: "member", displayName: "小美", claimedAt: null, user: { id: "u2", name: "小美", email: "meimei@example.com", image: null } },
    { id: "m3", userId: null, role: "member", displayName: "阿凱", claimedAt: null, user: null },
  ],
}

function renderView(overrides: Partial<Parameters<typeof MembersV2View>[0]> = {}) {
  const props: Parameters<typeof MembersV2View>[0] = {
    project,
    currentUserId: "u1",
    isOwner: true,
    removing: null,
    batchMode: false,
    selected: new Set<string>(),
    onInvite: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onToggleBatch: vi.fn(),
    onToggleSelect: vi.fn(),
    onRequestBatchRemove: vi.fn(),
    ...overrides,
  }
  render(<MembersV2View {...props} />)
  return props
}

describe("MembersV2View", () => {
  it("shows the count, badges and emails", () => {
    renderView()
    expect(screen.getByText("3 位旅伴")).toBeInTheDocument()
    const me = screen.getByTestId("member-m1")
    expect(within(me).getByText("建立者")).toBeInTheDocument()
    expect(within(me).getByText("你")).toBeInTheDocument()
    expect(within(me).getByText("emma@example.com")).toBeInTheDocument()
    const kai = screen.getByTestId("member-m3")
    expect(within(kai).getByText("佔位成員")).toBeInTheDocument()
    expect(within(kai).getByText("尚未加入")).toBeInTheDocument()
  })

  it("lets the owner remove others but not themselves", () => {
    const props = renderView()
    expect(within(screen.getByTestId("member-m1")).queryByRole("button", { name: /移除/ })).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    expect(props.onRemove).toHaveBeenCalledWith("m2")
  })

  it("hides remove and batch for non-owners", () => {
    renderView({ isOwner: false, currentUserId: "u2" })
    expect(screen.queryAllByRole("button", { name: /^移除/ })).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "批次" })).not.toBeInTheDocument()
  })

  it("wires invite and add", () => {
    const props = renderView()
    fireEvent.click(screen.getByRole("button", { name: "邀請成員" }))
    fireEvent.click(screen.getByRole("button", { name: "手動新增成員" }))
    expect(props.onInvite).toHaveBeenCalled()
    expect(props.onAdd).toHaveBeenCalled()
  })

  it("uses checkboxes in batch mode, never for yourself", () => {
    const props = renderView({ batchMode: true, selected: new Set(["m2"]) })
    expect(within(screen.getByTestId("member-m1")).queryByRole("checkbox")).not.toBeInTheDocument()
    expect(within(screen.getByTestId("member-m2")).getByRole("checkbox")).toBeChecked()
    fireEvent.click(within(screen.getByTestId("member-m3")).getByRole("checkbox"))
    expect(props.onToggleSelect).toHaveBeenCalledWith("m3")
    fireEvent.click(screen.getByRole("button", { name: "移除 1 位" }))
    expect(props.onRequestBatchRemove).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/members/members-v2-view`

- [ ] **Step 3: Write the view**

版面數值取自 `design/project/Members.dc.html`。

```tsx
// components/v2/members/members-v2-view.tsx
import { Share2, UserMinus, UserPlus, User } from "lucide-react"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

const AVATAR_TONES = [
  "bg-[#D2EAE1] text-v2-lake",
  "bg-[#FBE3D2] text-[#C4602F]",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

export interface MembersV2ViewProps {
  project: MembersProject
  currentUserId: string | null
  isOwner: boolean
  removing: string | null
  batchMode: boolean
  selected: Set<string>
  onInvite: () => void
  onAdd: () => void
  onRemove: (memberId: string) => void
  onToggleBatch: () => void
  onToggleSelect: (memberId: string) => void
  onRequestBatchRemove: () => void
}

const squareButton =
  "flex h-8 w-8 items-center justify-center rounded-[9px] border border-v2-line bg-v2-surface text-v2-lake"
const badge = "rounded-full px-[7px] py-0.5 text-xs font-bold"

export function MembersV2View(props: MembersV2ViewProps) {
  const { project } = props

  return (
    <>
      <V2TopBar title="成員" backHref={`/projects/${project.id}`} />
      <div className="mx-4 mb-2.5 mt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-v2-ink-muted">{project.members.length} 位旅伴</span>
          {props.isOwner && (
            <button type="button" onClick={props.onToggleBatch} className="text-xs font-bold text-v2-link">
              {props.batchMode ? "取消" : "批次"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="邀請成員" title="邀請成員" onClick={props.onInvite} className={squareButton}>
            <Share2 className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </button>
          <button type="button" aria-label="手動新增成員" title="手動新增" onClick={props.onAdd} className={squareButton}>
            <UserPlus className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-28">
        <div className="overflow-hidden rounded-2xl border border-v2-line bg-v2-surface">
          {project.members.map((member, i) => {
            const isMe = member.user?.id === props.currentUserId
            const isCreator = member.role === "owner"
            const isPlaceholder = !member.userId
            const canManage = props.isOwner && !isMe
            return (
              <div
                key={member.id}
                data-testid={`member-${member.id}`}
                className={`flex items-center gap-3 p-3.5 ${i < project.members.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}
              >
                {props.batchMode && canManage && (
                  <input
                    type="checkbox"
                    checked={props.selected.has(member.id)}
                    onChange={() => props.onToggleSelect(member.id)}
                    aria-label={`選取${member.displayName}`}
                    className="h-4 w-4 shrink-0 accent-[#1B5847]"
                  />
                )}
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isPlaceholder ? "bg-v2-sand text-v2-ink-subtle" : AVATAR_TONES[i % AVATAR_TONES.length]
                  }`}
                  aria-hidden="true"
                >
                  {isPlaceholder ? <User className="h-[19px] w-[19px]" strokeWidth={1.7} /> : member.displayName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-bold">{member.displayName}</span>
                    {isCreator && <span className={`${badge} bg-v2-lake-soft text-v2-lake`}>建立者</span>}
                    {isMe && <span className={`${badge} border border-[#DCEAE3] bg-v2-paper py-px text-v2-lake`}>你</span>}
                    {isPlaceholder && <span className={`${badge} bg-v2-sand text-v2-ink-muted`}>佔位成員</span>}
                  </span>
                  <span className={`mt-0.5 block text-xs ${isPlaceholder ? "text-v2-ink-subtle" : "text-v2-ink-muted"}`}>
                    {isPlaceholder ? "尚未加入" : member.user?.email}
                  </span>
                </span>
                {!props.batchMode && canManage && (
                  <button
                    type="button"
                    aria-label={`移除${member.displayName}`}
                    disabled={props.removing === member.id}
                    onClick={() => props.onRemove(member.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-v2-danger disabled:opacity-40"
                  >
                    <UserMinus className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {props.batchMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-v2-line bg-v2-surface px-4 py-3">
          <button
            type="button"
            disabled={props.selected.size === 0 || props.removing === "batch"}
            onClick={props.onRequestBatchRemove}
            className="mx-auto block w-full max-w-md rounded-full bg-v2-danger py-3 text-[15px] font-bold text-white disabled:opacity-40"
          >
            移除 {props.selected.size} 位
          </button>
        </div>
      )}
    </>
  )
}
```

`建立者` 的判斷：v1 用 `member.role === "owner"`（原頁面第 394 行）；照用。

- [ ] **Step 4: Run the view test**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the container and wire the page**

```tsx
// components/v2/members/members-v2.tsx
"use client"

import { useState, type ReactNode } from "react"
import { AddMemberDialog } from "@/components/members/add-member-dialog"
import { InviteDialog } from "@/components/project/invite-dialog"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { useProjectMembers } from "@/lib/hooks/useProjectMembers"
import { MembersV2View } from "./members-v2-view"

export function MembersV2({ projectId }: { projectId: string }) {
  const m = useProjectMembers(projectId)
  const [showInvite, setShowInvite] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function removeOne(memberId: string) {
    if (!confirm("確定要移除這位成員嗎？")) return
    await m.removeMember(memberId)
  }

  async function confirmBatch() {
    setShowBatchConfirm(false)
    await m.batchRemove(Array.from(selected))
    setSelected(new Set())
    setBatchMode(false)
  }

  let content: ReactNode
  if (m.loading) {
    content = (
      <div data-testid="v2-members-skeleton" className="space-y-3 p-4">
        <div className="h-64 animate-pulse rounded-2xl bg-v2-sand" />
      </div>
    )
  } else if (!m.project) {
    content = <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
  } else {
    content = (
      <>
        <MembersV2View
          project={m.project}
          currentUserId={m.currentUserId}
          isOwner={m.isOwner}
          removing={m.removing}
          batchMode={batchMode}
          selected={selected}
          onInvite={() => setShowInvite(true)}
          onAdd={() => setShowAdd(true)}
          onRemove={removeOne}
          onToggleBatch={() => {
            setBatchMode((v) => !v)
            setSelected(new Set())
          }}
          onToggleSelect={toggleSelect}
          onRequestBatchRemove={() => setShowBatchConfirm(true)}
        />
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={m.project.id} projectName={m.project.name} />
        <AddMemberDialog open={showAdd} onOpenChange={setShowAdd} onAdd={m.addMember} />
        <ConfirmDeleteDialog
          open={showBatchConfirm}
          onOpenChange={setShowBatchConfirm}
          title="確認批次移除"
          description={`確定要移除選取的 ${selected.size} 位成員嗎？`}
          onConfirm={confirmBatch}
          loading={m.removing === "batch"}
          confirmText={`移除 ${selected.size} 位`}
        />
      </>
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
```

批次移除確認視窗的標題、描述、按鈕文字請以原頁面批次刪除對話框為準（讀原檔確認後照用）。

`app/projects/[id]/members/page.tsx` 改為：

```tsx
"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { MembersV1 } from "@/components/v1/members/members-v1"
import { MembersV2 } from "@/components/v2/members/members-v2"

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<MembersV1 projectId={id} />} v2={<MembersV2 projectId={id} />} />
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過

```bash
git add components/v2/members "app/projects/[id]/members/page.tsx" tests/components/v2/members-v2.test.tsx
git commit -F - <<'EOF'
feat: Add v2 members page (A7) behind ui version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 7: A8 統計計算與 v1 搬移

**Files:**
- Create: `lib/project-stats.ts`
- Modify: `lib/project-overview.ts`（`OverviewExpense` 加 `expenseDate?: string`）
- Modify: `lib/hooks/useProjectOverview.ts`（回傳值加 `convert`）
- Create: `components/v1/stats/stats-v1.tsx`（由 `app/projects/[id]/stats/page.tsx` 搬移）
- Modify: `app/projects/[id]/stats/page.tsx`
- Test: `tests/lib/project-stats.test.ts`

**Interfaces:**
- Produces:
  - `interface StatsInput { members: { id: string; displayName: string }[]; expenses: { amount: number; currency: string; category: string | null; expenseDate?: string; createdAt: string; payer: { id: string }; participants: { memberId: string; shareAmount: number }[] }[] }`
  - `interface CategoryStat { category: string; amount: number; percent: number }`（依金額大到小；`percent` 0–100，未四捨五入；總額 0 時為 0）
  - `interface MemberStat { id: string; name: string; paid: number; share: number; balance: number }`（順序同 `members`）
  - `interface DailyStat { date: string; amount: number }`（`date` 為 `M/D`；依日期舊到新；只取最後 7 天有支出的日子）
  - `computeProjectStats(input: StatsInput, convert: (amount: number, currency: string) => number): { categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[]; total: number }`
    - 日期取 `expenseDate ?? createdAt`
    - 分攤比例 = `shareAmount / amount`；`amount` 為 0 時跳過該筆分攤
  - `useProjectOverview` 回傳值新增 `convert: (amount: number, currency: string) => number`
  - `StatsV1({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/project-stats.test.ts
import { describe, it, expect } from "vitest"
import { computeProjectStats, type StatsInput } from "@/lib/project-stats"

const identity = (amount: number) => amount
const day = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

function expense(amount: number, category: string | null, date: string, payer: string, shares: Record<string, number>, currency = "TWD") {
  return {
    amount,
    currency,
    category,
    expenseDate: date,
    createdAt: date,
    payer: { id: payer },
    participants: Object.entries(shares).map(([memberId, shareAmount]) => ({ memberId, shareAmount })),
  }
}

const members = [
  { id: "me", displayName: "Emma" },
  { id: "chi", displayName: "志明" },
]

describe("computeProjectStats", () => {
  it("computes category share, member totals and daily totals", () => {
    const input: StatsInput = {
      members,
      expenses: [
        expense(300, "food", day(11, 12), "me", { me: 150, chi: 150 }),
        expense(100, "transport", day(11, 12), "chi", { me: 50, chi: 50 }),
        expense(600, "food", day(11, 13), "chi", { me: 300, chi: 300 }),
      ],
    }
    const stats = computeProjectStats(input, identity)
    expect(stats.total).toBe(1000)
    expect(stats.categories).toEqual([
      { category: "food", amount: 900, percent: 90 },
      { category: "transport", amount: 100, percent: 10 },
    ])
    expect(stats.members).toEqual([
      { id: "me", name: "Emma", paid: 300, share: 500, balance: -200 },
      { id: "chi", name: "志明", paid: 700, share: 500, balance: 200 },
    ])
    expect(stats.daily).toEqual([
      { date: "11/12", amount: 400 },
      { date: "11/13", amount: 600 },
    ])
  })

  it("groups a missing category as other and converts currency", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    const stats = computeProjectStats(
      { members, expenses: [expense(1000, null, day(11, 12), "me", { me: 1000 }, "JPY")] },
      toTwd
    )
    expect(stats.categories).toEqual([{ category: "other", amount: 200, percent: 100 }])
    expect(stats.members[0].share).toBe(200)
  })

  it("keeps only the last 7 expense days", () => {
    const expenses = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => expense(10, "food", day(11, d), "me", { me: 10 }))
    const stats = computeProjectStats({ members, expenses }, identity)
    expect(stats.daily.map((d) => d.date)).toEqual(["11/3", "11/4", "11/5", "11/6", "11/7", "11/8", "11/9"])
  })

  it("returns empty stats without NaN for a project with no expenses", () => {
    const stats = computeProjectStats({ members, expenses: [] }, identity)
    expect(stats).toEqual({
      total: 0,
      categories: [],
      members: [
        { id: "me", name: "Emma", paid: 0, share: 0, balance: 0 },
        { id: "chi", name: "志明", paid: 0, share: 0, balance: 0 },
      ],
      daily: [],
    })
  })

  it("skips shares of zero-amount expenses", () => {
    const stats = computeProjectStats({ members, expenses: [expense(0, "food", day(11, 1), "me", { me: 0 })] }, identity)
    expect(stats.members[0].share).toBe(0)
    expect(stats.categories[0].percent).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/project-stats.test.ts`
Expected: FAIL，無法解析 `@/lib/project-stats`

- [ ] **Step 3: Write `lib/project-stats.ts`**

```ts
// lib/project-stats.ts
export interface StatsInput {
  members: { id: string; displayName: string }[]
  expenses: {
    amount: number
    currency: string
    category: string | null
    expenseDate?: string
    createdAt: string
    payer: { id: string }
    participants: { memberId: string; shareAmount: number }[]
  }[]
}

export interface CategoryStat {
  category: string
  amount: number
  percent: number
}

export interface MemberStat {
  id: string
  name: string
  paid: number
  share: number
  balance: number
}

export interface DailyStat {
  date: string
  amount: number
}

const DAILY_LIMIT = 7

export function computeProjectStats(
  input: StatsInput,
  convert: (amount: number, currency: string) => number
): { categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[]; total: number } {
  const categoryTotals = new Map<string, number>()
  const dailyTotals = new Map<string, { amount: number; dayStart: number; label: string }>()
  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  let total = 0

  for (const expense of input.expenses) {
    const amount = Number(expense.amount)
    const converted = convert(amount, expense.currency)
    total += converted

    const category = expense.category || "other"
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + converted)

    const date = new Date(expense.expenseDate ?? expense.createdAt)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const key = String(dayStart)
    const daily = dailyTotals.get(key)
    dailyTotals.set(key, {
      amount: (daily?.amount ?? 0) + converted,
      dayStart,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    })

    paid.set(expense.payer.id, (paid.get(expense.payer.id) ?? 0) + converted)
    if (amount !== 0) {
      for (const p of expense.participants) {
        share.set(p.memberId, (share.get(p.memberId) ?? 0) + converted * (Number(p.shareAmount) / amount))
      }
    }
  }

  const categories = Array.from(categoryTotals.entries())
    .map(([category, value]) => ({ category, amount: value, percent: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)

  const members = input.members.map((m) => {
    const p = paid.get(m.id) ?? 0
    const s = share.get(m.id) ?? 0
    return { id: m.id, name: m.displayName, paid: p, share: s, balance: p - s }
  })

  const daily = Array.from(dailyTotals.values())
    .sort((a, b) => a.dayStart - b.dayStart)
    .slice(-DAILY_LIMIT)
    .map(({ label, amount }) => ({ date: label, amount }))

  return { categories, members, daily, total }
}
```

在 `lib/project-overview.ts` 的 `OverviewExpense` 加一行 `expenseDate?: string`（放在 `createdAt` 下方）。

在 `lib/hooks/useProjectOverview.ts` 的 return 物件加上 `convert`（`useCurrencyConversion` 已回傳 `convert`）。

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/project-stats.test.ts tests/lib/hooks/useProjectOverview.test.tsx`
Expected: PASS

- [ ] **Step 5: Move the v1 page and use the shared calculation**

```bash
mkdir -p components/v1/stats
git mv "app/projects/[id]/stats/page.tsx" components/v1/stats/stats-v1.tsx
```

在 `components/v1/stats/stats-v1.tsx`：
1. 函式簽名改為 `export function StatsV1({ projectId: id }: { projectId: string }) {`，刪除 `use(params)`。
2. 在 `useCurrencyConversion` 之後加入：
   ```tsx
   const stats = useMemo(
     () => (project ? computeProjectStats(project, convertToProjectCurrency) : null),
     // eslint-disable-next-line react-hooks/exhaustive-deps
     [project, exchangeRates]
   )
   ```
3. 把 `trendData`、`categoryData`、`memberBalanceData` 三個 `useMemo` 的內容換成由 `stats` 映射，**輸出格式與原本完全相同**：
   ```tsx
   const trendData = useMemo(() => stats?.daily ?? [], [stats])
   const categoryData = useMemo(
     () => (stats?.categories ?? []).map((c) => ({ name: c.category, value: c.amount, color: "" })),
     [stats]
   )
   const memberBalanceData = useMemo(
     () =>
       (stats?.members ?? []).map((m) => ({
         id: m.id,
         name: m.name.slice(0, 8),
         fullName: m.name,
         paid: m.paid,
         share: m.share,
         balance: m.balance,
       })),
     [stats]
   )
   ```
   `paymentRanking`、`spendingRanking`、`settlements`、`categoryTrendData` 保持不變。
4. 已知差異（記入報告）：原本 `trendData` 以 `toLocaleDateString("zh-TW")` 當分組鍵，新版以本地日期分組、標籤 `M/D`；數值相同。原本金額 0 的支出會讓分攤變 `NaN`，新版跳過（與里程碑 1 的餘額計算一致）。
5. 移除不再使用的 import。

新的 `app/projects/[id]/stats/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { StatsV1 } from "@/components/v1/stats/stats-v1"

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StatsV1 projectId={id} />
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過

```bash
git add lib/project-stats.ts lib/project-overview.ts lib/hooks/useProjectOverview.ts components/v1/stats "app/projects/[id]/stats/page.tsx" tests/lib/project-stats.test.ts
git commit -F - <<'EOF'
refactor: Move stats page to StatsV1 with shared stats calculation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 8: A8 統計 v2

**Files:**
- Create: `components/v2/stats/category-donut.tsx`
- Create: `components/v2/stats/member-ranking.tsx`
- Create: `components/v2/stats/daily-trend.tsx`
- Create: `components/v2/stats/stats-v2-view.tsx`
- Create: `components/v2/stats/stats-v2.tsx`
- Modify: `app/projects/[id]/stats/page.tsx`
- Test: `tests/components/v2/stats-v2.test.tsx`

**Interfaces:**
- Consumes: Task 7 全部；`useProjectOverview`（含 `convert`）；`JoinProjectDialog`；`getCategoryLabel`；`UiV2Scope`、`V2TopBar`、`UiVersionSwitch`
- Produces: `StatsV2View({ projectId, currency, stats, currentMemberId })`、`StatsV2({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/stats-v2.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { StatsV2View } from "@/components/v2/stats/stats-v2-view"

const stats = {
  total: 48600,
  categories: [
    { category: "food", amount: 19440, percent: 40 },
    { category: "accommodation", amount: 14000, percent: 28.8 },
    { category: "transport", amount: 6400, percent: 13.2 },
    { category: "other", amount: 8760, percent: 18 },
  ],
  members: [
    { id: "chi", name: "志明", paid: 9800, share: 9800, balance: 0 },
    { id: "me", name: "Emma", paid: 18200, share: 18200, balance: 0 },
  ],
  daily: [
    { date: "11/12", amount: 12000 },
    { date: "11/13", amount: 20000 },
  ],
}

describe("StatsV2View", () => {
  it("renders the category legend with rounded percentages", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const legend = screen.getByRole("list", { name: "類別佔比" })
    expect(within(legend).getByText("餐飲")).toBeInTheDocument()
    expect(within(legend).getByText("40%")).toBeInTheDocument()
    expect(within(legend).getByText("29%")).toBeInTheDocument()
    expect(within(legend).getByText("TWD 19,440")).toBeInTheDocument()
  })

  it("ranks members by share with 我 for the current member", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const rows = within(screen.getByRole("list", { name: "成員排行" })).getAllByRole("listitem")
    expect(rows[0]).toHaveTextContent("我")
    expect(rows[0]).toHaveTextContent("TWD 18,200")
    expect(rows[1]).toHaveTextContent("志")
    expect(within(rows[0]).getByRole("meter")).toHaveAttribute("aria-valuenow", "100")
    expect(within(rows[1]).getByRole("meter")).toHaveAttribute("aria-valuenow", "54")
  })

  it("labels the daily trend", () => {
    render(<StatsV2View projectId="p1" currency="TWD" stats={stats} currentMemberId="me" />)
    const trend = screen.getByRole("figure", { name: "每日趨勢" })
    expect(within(trend).getByText("11/12")).toBeInTheDocument()
    expect(within(trend).getByText("11/13")).toBeInTheDocument()
  })

  it("shows empty states without NaN", () => {
    const { container } = render(
      <StatsV2View
        projectId="p1"
        currency="TWD"
        stats={{ total: 0, categories: [], members: [{ id: "me", name: "Emma", paid: 0, share: 0, balance: 0 }], daily: [] }}
        currentMemberId="me"
      />
    )
    expect(screen.getAllByText("尚無支出")).toHaveLength(3)
    expect(container.textContent).not.toContain("NaN")
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/v2/stats-v2.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/stats/stats-v2-view`

- [ ] **Step 3: Write the view components**

版面數值取自 `design/project/Stats.dc.html`（甜甜圈 108px、r=42、stroke 15；成員排行 26px 頭像、8px 長條；趨勢 SVG 高 90）。

```tsx
// components/v2/stats/category-donut.tsx
import { getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import type { CategoryStat } from "@/lib/project-stats"

// Colors follow the design's legend order; extra categories cycle.
const COLORS = ["#E8825A", "#6B5B95", "#2F8F74", "#9C7A28", "#A14A68", "#1B5847", "#C4602F", "#6E6860"]
const R = 42
const CIRCUMFERENCE = 2 * Math.PI * R

export function CategoryDonut({ categories, currency }: { categories: CategoryStat[]; currency: string }) {
  if (categories.length === 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  let offset = 0
  const arcs = categories.map((c, i) => {
    const length = (c.percent / 100) * CIRCUMFERENCE
    const arc = { color: COLORS[i % COLORS.length], length, offset }
    offset += length
    return arc
  })

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" width="108" height="108" className="shrink-0" aria-hidden="true">
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#F0EAE0" strokeWidth="15" />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="15"
              strokeDasharray={`${a.length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </g>
      </svg>
      <ul aria-label="類別佔比" className="m-0 flex flex-1 list-none flex-col gap-[9px] p-0">
        {categories.map((c, i) => (
          <li key={c.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
            <span className="flex flex-1 items-baseline gap-1 text-xs font-semibold">
              <span>{getCategoryLabel(c.category)}</span>
              <span className="font-medium text-v2-ink-subtle">{Math.round(c.percent)}%</span>
            </span>
            <span className="text-xs font-semibold text-v2-ink-muted">{formatCurrency(Math.round(c.amount), currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

```tsx
// components/v2/stats/member-ranking.tsx
import { formatCurrency } from "@/lib/constants/currencies"
import type { MemberStat } from "@/lib/project-stats"

const AVATAR_TONES = [
  "bg-[#D2EAE1] text-v2-lake",
  "bg-[#FBE3D2] text-[#C4602F]",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
]

export function MemberRanking({ members, currency, currentMemberId }: { members: MemberStat[]; currency: string; currentMemberId: string | null }) {
  const ranked = [...members].sort((a, b) => b.share - a.share)
  const top = ranked[0]?.share ?? 0

  if (top <= 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  return (
    <ul aria-label="成員排行" className="m-0 flex list-none flex-col gap-2.5 p-0">
      {ranked.map((m, i) => {
        const label = m.id === currentMemberId ? "我" : m.name
        const pct = Math.round((m.share / top) * 100)
        return (
          <li key={m.id} className="flex items-center gap-2.5">
            <span className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
              {label.charAt(0)}
            </span>
            <span
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0EAE0]"
            >
              <span className={`block h-full rounded-full ${i === 0 ? "bg-v2-lake" : "bg-[#2F8F74]"}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="w-[68px] shrink-0 text-right text-xs text-v2-ink-muted">{formatCurrency(Math.round(m.share), currency)}</span>
          </li>
        )
      })}
    </ul>
  )
}
```

```tsx
// components/v2/stats/daily-trend.tsx
import type { DailyStat } from "@/lib/project-stats"

const WIDTH = 342
const HEIGHT = 90
const TOP = 10
const BOTTOM = 85

export function DailyTrend({ daily }: { daily: DailyStat[] }) {
  if (daily.length === 0) {
    return <p className="py-6 text-center text-xs text-v2-ink-muted">尚無支出</p>
  }

  const max = Math.max(...daily.map((d) => d.amount), 1)
  const step = daily.length > 1 ? WIDTH / (daily.length - 1) : 0
  const points = daily.map((d, i) => ({
    x: daily.length > 1 ? i * step : WIDTH / 2,
    y: BOTTOM - (d.amount / max) * (BOTTOM - TOP),
  }))
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const area = `${line} L${points[points.length - 1].x},${HEIGHT} L${points[0].x},${HEIGHT} Z`

  return (
    <>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="v2TrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F8F74" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2F8F74" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#v2TrendFill)" />
        <path d={line} fill="none" stroke="#2F8F74" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#1B5847" />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between">
        {daily.map((d) => (
          <span key={d.date} className="text-xs text-v2-ink-muted">
            {d.date}
          </span>
        ))}
      </div>
    </>
  )
}
```

```tsx
// components/v2/stats/stats-v2-view.tsx
import type { CategoryStat, DailyStat, MemberStat } from "@/lib/project-stats"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { CategoryDonut } from "./category-donut"
import { MemberRanking } from "./member-ranking"
import { DailyTrend } from "./daily-trend"

interface StatsV2ViewProps {
  projectId: string
  currency: string
  stats: { total: number; categories: CategoryStat[]; members: MemberStat[]; daily: DailyStat[] }
  currentMemberId: string | null
}

const heading = "mb-1.5 text-xs font-semibold text-v2-ink-muted"

export function StatsV2View({ projectId, currency, stats, currentMemberId }: StatsV2ViewProps) {
  return (
    <>
      <V2TopBar title="統計" backHref={`/projects/${projectId}`} />
      <section className="px-4 pt-[22px]">
        <p className={heading}>類別佔比</p>
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <CategoryDonut categories={stats.categories} currency={currency} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <p className={heading}>成員排行</p>
        <div className="rounded-2xl border border-v2-line bg-v2-surface p-4">
          <MemberRanking members={stats.members} currency={currency} currentMemberId={currentMemberId} />
        </div>
      </section>
      <section className="px-4 pt-[22px]">
        <p className={heading}>每日趨勢</p>
        <figure aria-label="每日趨勢" className="m-0 rounded-[14px] border border-v2-line bg-v2-surface px-4 pb-2.5 pt-4">
          <DailyTrend daily={stats.daily} />
        </figure>
      </section>
      <div className="h-6" />
    </>
  )
}
```

- [ ] **Step 4: Run the view test**

Run: `npx vitest run tests/components/v2/stats-v2.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the container and wire the page**

```tsx
// components/v2/stats/stats-v2.tsx
"use client"

import { useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { computeProjectStats } from "@/lib/project-stats"
import { StatsV2View } from "./stats-v2-view"

export function StatsV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { project, loading, joinInfo, joining, joinProject, claimMember, summary, convert } = useProjectOverview(projectId)
  const stats = useMemo(() => (project ? computeProjectStats(project, convert) : null), [project, convert])

  let content: ReactNode
  if (loading) {
    content = (
      <div data-testid="v2-stats-skeleton" className="space-y-3 p-4">
        <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
        <div className="h-36 animate-pulse rounded-2xl bg-v2-sand" />
      </div>
    )
  } else if (joinInfo) {
    content = (
      <JoinProjectDialog info={joinInfo} joining={joining} onJoin={joinProject} onClaim={claimMember} onCancel={() => router.push("/projects")} />
    )
  } else if (!project || !stats) {
    content = <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
  } else {
    content = (
      <StatsV2View
        projectId={projectId}
        currency={project.currency || DEFAULT_CURRENCY}
        stats={stats}
        currentMemberId={summary?.currentMemberId ?? null}
      />
    )
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">{content}</div>
    </UiV2Scope>
  )
}
```

`app/projects/[id]/stats/page.tsx` 改為：

```tsx
"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { StatsV1 } from "@/components/v1/stats/stats-v1"
import { StatsV2 } from "@/components/v2/stats/stats-v2"

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<StatsV1 projectId={id} />} v2={<StatsV2 projectId={id} />} />
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit -p . && npm run test:run && npm run lint`
Expected: 通過

```bash
git add components/v2/stats "app/projects/[id]/stats/page.tsx" tests/components/v2/stats-v2.test.tsx
git commit -F - <<'EOF'
feat: Add v2 stats page (A8) behind ui version switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
EOF
```

---

### Task 9: 整體驗證

**Files:** 無新增

- [ ] **Step 1: Prisma client、build、測試、lint**

Run:
```bash
node -r dotenv/config node_modules/prisma/build/index.js generate
npm run build
npm run test:run
npm run lint
```
Expected: build 成功；測試全數通過；lint 無新錯誤。

- [ ] **Step 2: Manual comparison（手機寬度 390px，開發模式由用戶執行）**

| 網址 | 預期 |
|---|---|
| `/projects/<id>/expenses?ui=v2` | 總覽卡、6 個篩選 chip、依日期分組；刪除確認含 LINE 通知選項；批次刪除；看圖；語音記帳 |
| `/projects/<id>/settle?ui=v2` | 四格總覽（含日均）、幣別切換、轉帳建議、各人收支、計算說明、分享、查看統計、廣告、贊助卡 |
| `/projects/<id>/members?ui=v2` | 建立者看到移除與批次；非建立者看不到；自己那列不可移除；邀請、手動新增 |
| `/projects/<id>/stats?ui=v2` | 甜甜圈、成員排行、每日趨勢；沒有支出時顯示「尚無支出」 |
| 以上各頁 `?ui=v1` | 與改動前相同 |
