# UI v2 Milestone 3b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the borrowed v1 `VoiceExpenseDialog` on v2 pages with a v2 full-screen "AI 快速記帳" overlay (A11 input, A10 camera, A12 batch confirm).

**Architecture:** Pure functions and hooks in `lib/quick-expense/` (draft/validation, API parsing, speech input, sequential save). v2 screens in `components/v2/quick-expense/` compose them; an orchestrator owns the step state. v1 files are not touched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (v2 tokens under `[data-ui="v2"]`), Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-28-ui-v2-milestone-3b-design.md`

## Global Constraints

- Do not modify: any `app/api/**` route, `prisma/schema.prisma`, `components/voice/**`, `components/v1/**`, `components/ui/image-picker.tsx`.
- Never run `prisma db push` or connect to a database.
- v2 components must not use the `dark:` variant.
- UI copy is Traditional Chinese exactly as written in this plan; code comments in English.
- Split is equal only (`computeShares` with empty `personalItems`/`customShares`); no `splitDetail` is sent.
- Run tests with `npx vitest run <path>`; full suite `npm run test:run`; lint `npm run lint`.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
  ```
- Ruling (deviation from spec §2.5): after a partial failure, `onSuccess()` is still called when at least one item saved (so the page list refreshes), but the overlay stays open.

## Review Focus

1. Receipt AI returns a category not in `EXPENSE_CATEGORIES` → item falls back to `"other"` (Task 2 test).
2. Amount typed as `"12."` mid-edit must not be coerced/lost → `QuickItem.amount` is a string (Task 1, Task 7 tests).
3. Camera permission denied / no `getUserMedia` → fallback buttons shown, never a blank black screen (Task 5 test).
4. Leaving the camera step must stop every media track (Task 5 test).
5. Retry after partial failure must not re-post already saved items (Task 3 and Task 8 tests).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/quick-expense/draft.ts` | `QuickItem` type, `fromParsed`, `validateItems`, `itemTotals` |
| `lib/quick-expense/parse.ts` | `parseText`, `parseReceipt`, `receiptToItem` |
| `lib/quick-expense/use-quick-save.ts` | sequential upload + POST + LINE notify |
| `lib/quick-expense/speech-input.ts` | `useSpeechInput` engine wrapper |
| `lib/money-input.ts` | `toMoneyInput` (moved out of split-editor, shared) |
| `components/v2/quick-expense/use-camera.ts` | live camera / fallback |
| `components/v2/quick-expense/camera-step.tsx` | A10 |
| `components/v2/quick-expense/quick-input-step.tsx` | A11 |
| `components/v2/quick-expense/quick-item-card.tsx` | one A12 card |
| `components/v2/quick-expense/confirm-step.tsx` | A12 pager + footer |
| `components/v2/quick-expense/quick-expense-v2.tsx` | overlay + step machine |

Task dependency: 1 → (2, 3, 7); 4, 5 independent; 6 needs 4; 8 needs all.

---

### Task 1: Draft model

**Files:**
- Create: `lib/quick-expense/draft.ts`
- Test: `tests/lib/quick-expense/draft.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface QuickItem extends Omit<ExpenseItemResult, "amount" | "selected"> {
    amount: string; expenseDate: Date; location: string | null; latitude: number | null; longitude: number | null; image: ImagePickerValue
  }
  export const EMPTY_IMAGE: ImagePickerValue
  export function fromParsed(results: ExpenseItemResult[], today?: Date): QuickItem[]
  export function validateItems(items: QuickItem[]): { index: number; message: string } | null
  export function itemTotals(items: QuickItem[]): { currency: string; total: number }[]
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest"
import { fromParsed, validateItems, itemTotals, type QuickItem } from "@/lib/quick-expense/draft"

const base = { id: "x", amount: 100, description: "早餐", category: "food" as const, currency: "TWD", payerId: "a", participantIds: ["a", "b"], selected: true }
const item = (o: Partial<QuickItem> = {}): QuickItem => ({ ...fromParsed([base])[0], ...o })

describe("fromParsed", () => {
  it("fills defaults and stringifies amount", () => {
    const today = new Date("2026-09-28T10:00:00Z")
    const [q] = fromParsed([base], today)
    expect(q.amount).toBe("100")
    expect(q.expenseDate).toEqual(today)
    expect(q.expenseDate).not.toBe(today)
    expect(q).toMatchObject({ location: null, latitude: null, longitude: null, image: { image: null, pendingFile: null, preview: null } })
    expect("selected" in q).toBe(false)
  })
})

describe("validateItems", () => {
  it("returns null when valid", () => expect(validateItems([item()])).toBeNull())
  it("checks amount first", () => {
    for (const amount of ["", "0", "abc"]) {
      expect(validateItems([item(), item({ amount, payerId: "" })])).toEqual({ index: 1, message: "第 2 筆請輸入有效金額" })
    }
  })
  it("checks payer then participants", () => {
    expect(validateItems([item({ payerId: "" })])).toEqual({ index: 0, message: "第 1 筆請選擇付款成員" })
    expect(validateItems([item({ participantIds: [] })])).toEqual({ index: 0, message: "第 1 筆請選擇至少一位分攤成員" })
  })
})

describe("itemTotals", () => {
  it("groups by currency in first-seen order", () => {
    expect(itemTotals([item({ amount: "10.1" }), item({ currency: "JPY", amount: "500" }), item({ amount: "0.2" })])).toEqual([
      { currency: "TWD", total: 10.3 },
      { currency: "JPY", total: 500 },
    ])
  })
  it("treats invalid amounts as 0", () => expect(itemTotals([item({ amount: "" })])).toEqual([{ currency: "TWD", total: 0 }]))
})
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/lib/quick-expense/draft.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { ExpenseItemResult } from "@/lib/ai/expense-parser"
import type { ImagePickerValue } from "@/components/ui/image-picker"

// A parsed expense being reviewed in the quick-expense confirm step.
// `amount` stays a string so partially typed input ("12.") survives edits.
export interface QuickItem extends Omit<ExpenseItemResult, "amount" | "selected"> {
  amount: string
  expenseDate: Date
  location: string | null
  latitude: number | null
  longitude: number | null
  image: ImagePickerValue
}

export const EMPTY_IMAGE: ImagePickerValue = { image: null, pendingFile: null, preview: null }

export function fromParsed(results: ExpenseItemResult[], today: Date = new Date()): QuickItem[] {
  return results.map(({ selected: _selected, amount, ...rest }) => ({
    ...rest,
    amount: String(amount),
    expenseDate: new Date(today),
    location: null,
    latitude: null,
    longitude: null,
    image: { ...EMPTY_IMAGE },
  }))
}

const amountOf = (item: QuickItem) => {
  const n = Number(item.amount)
  return item.amount.trim() !== "" && Number.isFinite(n) ? n : 0
}

export function validateItems(items: QuickItem[]): { index: number; message: string } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const n = i + 1
    if (!(amountOf(item) > 0)) return { index: i, message: `第 ${n} 筆請輸入有效金額` }
    if (!item.payerId) return { index: i, message: `第 ${n} 筆請選擇付款成員` }
    if (item.participantIds.length === 0) return { index: i, message: `第 ${n} 筆請選擇至少一位分攤成員` }
  }
  return null
}

export function itemTotals(items: QuickItem[]): { currency: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + amountOf(item))
  return [...totals].map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
}
```

- [ ] **Step 4: Run test** → PASS. If lint flags `_selected`, keep the destructure and add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above that line.

- [ ] **Step 5: Commit** — `git add lib/quick-expense/draft.ts tests/lib/quick-expense/draft.test.ts && git commit -m "feat: Add quick-expense draft model and validation"` (+ trailers).

---

### Task 2: AI parse helpers

**Files:**
- Create: `lib/quick-expense/parse.ts`
- Test: `tests/lib/quick-expense/parse.test.ts`

**Interfaces:**
- Consumes: `QuickItem`, `EMPTY_IMAGE` (Task 1).
- Produces:
  ```ts
  export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>
  export interface ReceiptResult { amount: number; description: string; category: string; date: string | null; confidence: number }
  export function parseText(authFetch: AuthFetch, input: { transcript: string; members: { id: string; displayName: string }[]; currentUserMemberId: string; defaultCurrency: string }): Promise<ExpenseItemResult[]>
  export function parseReceipt(authFetch: AuthFetch, file: File): Promise<ReceiptResult>
  export function receiptToItem(r: ReceiptResult, o: { currency: string; payerId: string; memberIds: string[]; file: File; preview: string; today?: Date }): QuickItem
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest"
import { parseText, parseReceipt, receiptToItem } from "@/lib/quick-expense/parse"

const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response

describe("parseText", () => {
  const input = { transcript: "早餐 100", members: [{ id: "a", displayName: "小雨" }], currentUserMemberId: "a", defaultCurrency: "TWD" }
  it("posts the transcript and returns expenses", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { success: true, data: { expenses: [{ id: "1" }], confidence: 1 } }))
    await expect(parseText(f, input)).resolves.toEqual([{ id: "1" }])
    expect(f).toHaveBeenCalledWith("/api/voice/parse", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }))
  })
  it("throws the server error", async () => {
    await expect(parseText(vi.fn().mockResolvedValue(json(500, { error: "壞了" })), input)).rejects.toThrow("壞了")
  })
  it("throws a default message on non-json errors", async () => {
    const bad = { ok: false, status: 502, json: async () => { throw new Error("x") } } as unknown as Response
    await expect(parseText(vi.fn().mockResolvedValue(bad), input)).rejects.toThrow("解析失敗，請重試")
  })
})

describe("parseReceipt", () => {
  it("posts the image as a data url", async () => {
    const f = vi.fn().mockResolvedValue(json(200, { success: true, data: { amount: 5 } }))
    const file = new File(["abc"], "r.jpg", { type: "image/jpeg" })
    await expect(parseReceipt(f, file)).resolves.toEqual({ amount: 5 })
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body.imageData).toMatch(/^data:image\/jpeg;base64,/)
  })
  it("throws 收據辨識失敗 by default", async () => {
    await expect(parseReceipt(vi.fn().mockResolvedValue(json(500, {})), new File(["a"], "r.jpg"))).rejects.toThrow("收據辨識失敗")
  })
})

describe("receiptToItem", () => {
  const file = new File(["a"], "r.jpg")
  const o = { currency: "JPY", payerId: "a", memberIds: ["a", "b"], file, preview: "blob:1", today: new Date("2026-09-28T00:00:00Z") }
  it("maps the receipt with payer, all members, image and date", () => {
    const q = receiptToItem({ amount: 1200, description: "拉麵", category: "food", date: "2026-09-20", confidence: 0.9 }, o)
    expect(q).toMatchObject({ amount: "1200", description: "拉麵", category: "food", currency: "JPY", payerId: "a", participantIds: ["a", "b"] })
    expect(q.image).toEqual({ image: null, pendingFile: file, preview: "blob:1" })
    expect(q.expenseDate).toEqual(new Date("2026-09-20"))
    expect(q.id).toMatch(/^receipt-/)
  })
  it("falls back to today and other", () => {
    const q = receiptToItem({ amount: 1, description: "", category: "weird", date: null, confidence: 0 }, o)
    expect(q.expenseDate).toEqual(o.today)
    expect(q.category).toBe("other")
  })
  it("falls back to today for an invalid date", () => {
    expect(receiptToItem({ amount: 1, description: "", category: "food", date: "nope", confidence: 0 }, o).expenseDate).toEqual(o.today)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run tests/lib/quick-expense/parse.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
import type { ExpenseItemResult, ParseExpensesResult } from "@/lib/ai/expense-parser"
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants/expenses"
import type { QuickItem } from "./draft"

export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>

export interface ReceiptResult {
  amount: number
  description: string
  category: string
  date: string | null
  confidence: number
}

async function postJson<T>(authFetch: AuthFetch, url: string, body: unknown, fallback: string): Promise<T> {
  const res = await authFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || fallback)
  return data.data as T
}

export async function parseText(
  authFetch: AuthFetch,
  input: { transcript: string; members: { id: string; displayName: string }[]; currentUserMemberId: string; defaultCurrency: string }
): Promise<ExpenseItemResult[]> {
  const data = await postJson<ParseExpensesResult>(authFetch, "/api/voice/parse", input, "解析失敗，請重試")
  return data?.expenses ?? []
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function parseReceipt(authFetch: AuthFetch, file: File): Promise<ReceiptResult> {
  const imageData = await fileToDataUrl(file)
  return postJson<ReceiptResult>(authFetch, "/api/receipt/parse", { imageData }, "收據辨識失敗")
}

export function receiptToItem(
  r: ReceiptResult,
  o: { currency: string; payerId: string; memberIds: string[]; file: File; preview: string; today?: Date }
): QuickItem {
  const today = o.today ?? new Date()
  const parsedDate = r.date ? new Date(r.date) : null
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(r.category) ? (r.category as ExpenseCategory) : "other"
  return {
    id: `receipt-${Date.now()}`,
    amount: String(r.amount),
    description: r.description,
    category,
    currency: o.currency,
    payerId: o.payerId,
    participantIds: [...o.memberIds],
    expenseDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date(today),
    location: null,
    latitude: null,
    longitude: null,
    image: { image: null, pendingFile: o.file, preview: o.preview },
  }
}
```

If `ExpenseItemResult["category"]` is not assignable from `ExpenseCategory`, cast with `as QuickItem["category"]`.

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat: Add quick-expense AI parse helpers`.

---

### Task 3: Sequential save hook

**Files:**
- Create: `lib/quick-expense/use-quick-save.ts`
- Test: `tests/lib/quick-expense/use-quick-save.test.ts`

**Interfaces:**
- Consumes: `QuickItem` (Task 1); `computeShares` from `@/lib/expense-split`; `uploadImageToR2` from `@/lib/image-utils`; `useAuthFetch`, `useLiff` from `@/components/auth/liff-provider`; `sendExpenseNotificationToChat`, `sendBatchExpenseNotificationToChat` from `@/lib/liff`; `mergePreferences` from `@/types/user-preferences`.
- Produces:
  ```ts
  export interface SaveResult { savedIds: string[]; failed: { index: number; message: string } | null }
  export function useQuickSave(o: { projectId: string; projectName: string; members: { id: string; displayName: string }[] }): {
    save: (items: QuickItem[], opts: { notifyLine: boolean }) => Promise<SaveResult>
    progress: { current: number; total: number } | null
    canNotifyLine: boolean
  }
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const authFetch = vi.fn()
const liff = { isDevMode: false, canSendMessages: true, user: { preferences: null } }
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch, useLiff: () => liff }))
const upload = vi.fn()
vi.mock("@/lib/image-utils", () => ({ uploadImageToR2: (...a: unknown[]) => upload(...a) }))
const single = vi.fn().mockResolvedValue(true)
const batch = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/liff", () => ({ sendExpenseNotificationToChat: (d: unknown) => single(d), sendBatchExpenseNotificationToChat: (d: unknown) => batch(d) }))

import { useQuickSave } from "@/lib/quick-expense/use-quick-save"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const mk = (id: string, o: Partial<QuickItem> = {}): QuickItem => ({
  ...fromParsed([{ id, amount: 100, description: "d", category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b", "c"], selected: true }])[0],
  ...o,
})
const ok = () => ({ ok: true, json: async () => ({}) })
const setup = () => renderHook(() => useQuickSave({ projectId: "p1", projectName: "東京", members })).result

beforeEach(() => {
  authFetch.mockReset(); upload.mockReset(); single.mockClear(); batch.mockClear()
  liff.isDevMode = false; liff.canSendMessages = true
})

describe("useQuickSave", () => {
  it("posts equal shares and notifies once with the single template", async () => {
    authFetch.mockResolvedValue(ok())
    const r = setup()
    let res
    await act(async () => { res = await r.current.save([mk("1")], { notifyLine: true }) })
    expect(res).toEqual({ savedIds: ["1"], failed: null })
    const body = JSON.parse(authFetch.mock.calls[0][1].body)
    expect(authFetch.mock.calls[0][0]).toBe("/api/projects/p1/expenses")
    expect(body.participants.map((p: { shareAmount: number }) => p.shareAmount)).toEqual([33.34, 33.33, 33.33])
    expect(body).toMatchObject({ paidByMemberId: "a", amount: 100, currency: "TWD", image: null })
    expect(body.splitDetail).toBeUndefined()
    expect(single).toHaveBeenCalledWith(expect.objectContaining({ operationType: "create", payerName: "小雨", participantCount: 3 }))
    expect(batch).not.toHaveBeenCalled()
  })

  it("uploads pending images and still saves when upload fails", async () => {
    authFetch.mockResolvedValue(ok())
    upload.mockResolvedValueOnce({ url: "https://img/1" }).mockRejectedValueOnce(new Error("x"))
    const f = new File(["a"], "a.jpg")
    const r = setup()
    await act(async () => {
      await r.current.save([mk("1", { image: { image: null, pendingFile: f, preview: "p" } }), mk("2", { image: { image: null, pendingFile: f, preview: "p" } })], { notifyLine: true })
    })
    expect(JSON.parse(authFetch.mock.calls[0][1].body).image).toBe("https://img/1")
    expect(JSON.parse(authFetch.mock.calls[1][1].body).image).toBeNull()
    expect(batch).toHaveBeenCalledWith(expect.objectContaining({ expenses: expect.arrayContaining([expect.objectContaining({ payerName: "小雨" })]) }))
  })

  it("stops at the first failure and reports saved ids", async () => {
    authFetch.mockResolvedValueOnce(ok()).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "金額錯誤" }) })
    const r = setup()
    let res
    await act(async () => { res = await r.current.save([mk("1"), mk("2"), mk("3")], { notifyLine: true }) })
    expect(res).toEqual({ savedIds: ["1"], failed: { index: 1, message: "金額錯誤" } })
    expect(authFetch).toHaveBeenCalledTimes(2)
    expect(single).toHaveBeenCalledTimes(1)
  })

  it("does not notify when off, in dev mode, or nothing saved", async () => {
    authFetch.mockResolvedValue(ok())
    let r = setup()
    await act(async () => { await r.current.save([mk("1")], { notifyLine: false }) })
    liff.isDevMode = true
    r = setup()
    expect(r.current.canNotifyLine).toBe(false)
    await act(async () => { await r.current.save([mk("1")], { notifyLine: true }) })
    liff.isDevMode = false
    authFetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    r = setup()
    await act(async () => { await r.current.save([mk("1")], { notifyLine: true }) })
    expect(single).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```ts
"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { computeShares } from "@/lib/expense-split"
import { uploadImageToR2 } from "@/lib/image-utils"
import { sendBatchExpenseNotificationToChat, sendExpenseNotificationToChat } from "@/lib/liff"
import { mergePreferences } from "@/types/user-preferences"
import type { QuickItem } from "./draft"

export interface SaveResult {
  savedIds: string[]
  failed: { index: number; message: string } | null
}

// Saves quick-expense items one by one. Stops at the first failure so the
// caller can keep only the unsaved items and retry without duplicates.
export function useQuickSave({ projectId, projectName, members }: { projectId: string; projectName: string; members: { id: string; displayName: string }[] }) {
  const authFetch = useAuthFetch()
  const { isDevMode, canSendMessages, user } = useLiff()
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const canNotifyLine = canSendMessages && !isDevMode
  const payerName = useCallback((id: string) => members.find((m) => m.id === id)?.displayName || "未知", [members])

  const save = useCallback(
    async (items: QuickItem[], { notifyLine }: { notifyLine: boolean }): Promise<SaveResult> => {
      const saved: QuickItem[] = []
      let failed: SaveResult["failed"] = null
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        setProgress({ current: i + 1, total: items.length })
        try {
          let image = item.image.image
          if (item.image.pendingFile) {
            try {
              image = (await uploadImageToR2(item.image.pendingFile, projectId, authFetch)).url
            } catch {
              // An image upload failure must not block saving the expense.
              image = null
            }
          }
          const amount = Number(item.amount)
          const participants = computeShares({ amount, participantIds: item.participantIds, personalItems: {}, customShares: {} })
          const res = await authFetch(`/api/projects/${projectId}/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paidByMemberId: item.payerId,
              amount,
              currency: item.currency,
              description: item.description.trim() || null,
              category: item.category,
              image,
              location: item.location,
              latitude: item.latitude,
              longitude: item.longitude,
              expenseDate: item.expenseDate.toISOString(),
              participants,
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error || `儲存第 ${i + 1} 筆失敗`)
          }
          saved.push(item)
        } catch (err) {
          failed = { index: i, message: err instanceof Error ? err.message : `儲存第 ${i + 1} 筆失敗` }
          break
        }
      }
      setProgress(null)

      if (saved.length > 0 && notifyLine && canNotifyLine && mergePreferences(user?.preferences).notifications.expenseCreated) {
        const summary = (e: QuickItem) => ({
          amount: Number(e.amount),
          description: e.description || undefined,
          category: e.category || undefined,
          payerName: payerName(e.payerId),
          participantCount: e.participantIds.length,
        })
        const send =
          saved.length === 1
            ? sendExpenseNotificationToChat({ operationType: "create", projectName, projectId, ...summary(saved[0]) })
            : sendBatchExpenseNotificationToChat({ projectName, projectId, expenses: saved.map(summary) })
        send.catch(() => {
          // Notification failures are silent.
        })
      }
      return { savedIds: saved.map((s) => s.id), failed }
    },
    [authFetch, canNotifyLine, payerName, projectId, projectName, user?.preferences]
  )

  return { save, progress, canNotifyLine }
}
```

Note: the test expects shares `[33.34, 33.33, 33.33]`; confirm `computeShares` gives the remainder to the first member (it does per `lib/expense-split.ts`). If `mergePreferences(null)` returns `expenseCreated: true` by default the notify tests pass; if not, set `liff.user.preferences = { notifications: { expenseCreated: true } }` in the test.

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat: Add quick-expense sequential save hook`.

---

### Task 4: Speech input hook

**Files:**
- Create: `lib/quick-expense/speech-input.ts`
- Test: `tests/lib/quick-expense/speech-input.test.ts`

**Interfaces:**
- Consumes: `useSpeechRecognition` (`@/lib/speech`: `isSupported, isRecording, transcript, error, startRecording, stopRecording, resetTranscript`), `useMediaRecorderSpeech` (`@/lib/media-recorder-speech`: `isSupported, isRecording, error, audioBlob, startRecording, stopRecording, reset`), `useAuthFetch`.
- Produces: `export function useSpeechInput({ onText }: { onText: (text: string) => void }): { supported: boolean; recording: boolean; transcribing: boolean; error: string | null; toggle: () => void }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const web = { isSupported: true, isRecording: false, transcript: "", error: null as string | null, startRecording: vi.fn(), stopRecording: vi.fn(), resetTranscript: vi.fn() }
const rec = { isSupported: true, isRecording: false, error: null as string | null, audioBlob: null as Blob | null, startRecording: vi.fn(), stopRecording: vi.fn(), reset: vi.fn() }
vi.mock("@/lib/speech", () => ({ useSpeechRecognition: () => web }))
vi.mock("@/lib/media-recorder-speech", () => ({ useMediaRecorderSpeech: () => rec }))
const authFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch }))

import { useSpeechInput } from "@/lib/quick-expense/speech-input"

beforeEach(() => {
  Object.assign(web, { isSupported: true, isRecording: false, transcript: "", error: null })
  Object.assign(rec, { isSupported: true, isRecording: false, error: null, audioBlob: null })
  vi.clearAllMocks()
})

describe("useSpeechInput", () => {
  it("uses web speech when supported and emits the transcript after stopping", () => {
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))
    act(() => h.result.current.toggle())
    expect(web.startRecording).toHaveBeenCalled()
    web.isRecording = true
    h.rerender()
    act(() => h.result.current.toggle())
    expect(web.stopRecording).toHaveBeenCalled()
    Object.assign(web, { isRecording: false, transcript: " 早餐 100 " })
    h.rerender()
    expect(onText).toHaveBeenCalledWith("早餐 100")
    expect(web.resetTranscript).toHaveBeenCalled()
  })

  it("falls back to recorder + transcribe", async () => {
    web.isSupported = false
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ text: "晚餐 600" }) })
    const onText = vi.fn()
    const h = renderHook(() => useSpeechInput({ onText }))
    act(() => h.result.current.toggle())
    expect(rec.startRecording).toHaveBeenCalled()
    rec.audioBlob = new Blob(["a"])
    h.rerender()
    await waitFor(() => expect(onText).toHaveBeenCalledWith("晚餐 600"))
    expect(authFetch.mock.calls[0][0]).toBe("/api/voice/transcribe")
    expect(rec.reset).toHaveBeenCalled()
  })

  it("reports transcribe errors and unsupported state", async () => {
    web.isSupported = false
    authFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "轉換失敗了" }) })
    const h = renderHook(() => useSpeechInput({ onText: vi.fn() }))
    rec.audioBlob = new Blob(["a"])
    h.rerender()
    await waitFor(() => expect(h.result.current.error).toBe("轉換失敗了"))
    rec.isSupported = false
    h.rerender()
    expect(h.result.current.supported).toBe(false)
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { useMediaRecorderSpeech } from "@/lib/media-recorder-speech"
import { useSpeechRecognition } from "@/lib/speech"

// Web Speech API first; iOS LIFF (no Web Speech) records audio and
// transcribes it on the server. Same engine choice as the v1 dialog.
export function useSpeechInput({ onText }: { onText: (text: string) => void }) {
  const authFetch = useAuthFetch()
  const web = useSpeechRecognition()
  const rec = useMediaRecorderSpeech()
  const useRecorder = !web.isSupported && rec.isSupported
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    if (useRecorder || web.isRecording) return
    const text = web.transcript.trim()
    if (!text) return
    onTextRef.current(text)
    web.resetTranscript()
  }, [useRecorder, web.isRecording, web.transcript, web])

  useEffect(() => {
    if (!useRecorder || !rec.audioBlob) return
    const blob = rec.audioBlob
    let cancelled = false
    setTranscribing(true)
    setError(null)
    ;(async () => {
      try {
        const form = new FormData()
        form.append("file", blob, "audio.webm")
        const res = await authFetch("/api/voice/transcribe", { method: "POST", body: form })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "語音轉文字失敗")
        if (!cancelled && data.text?.trim()) onTextRef.current(data.text.trim())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "語音轉文字失敗")
      } finally {
        rec.reset()
        if (!cancelled) setTranscribing(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.audioBlob, useRecorder])

  const recording = web.isRecording || rec.isRecording
  const toggle = useCallback(() => {
    setError(null)
    if (useRecorder) (rec.isRecording ? rec.stopRecording : rec.startRecording)()
    else (web.isRecording ? web.stopRecording : web.startRecording)()
  }, [useRecorder, rec, web])

  return {
    supported: web.isSupported || rec.isSupported,
    recording,
    transcribing,
    error: error ?? web.error ?? rec.error,
    toggle,
  }
}
```

If the test's mocked objects are the same reference every render so `[web]` never changes, that is fine: the effect also depends on `web.isRecording`/`web.transcript`.

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat: Add quick-expense speech input hook`.

---

### Task 5: Camera hook and A10 camera step

**Files:**
- Create: `components/v2/quick-expense/use-camera.ts`, `components/v2/quick-expense/camera-step.tsx`
- Test: `tests/components/v2/quick-expense/camera-step.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function isIOSDevice(ua?: string): boolean
  export function useCamera(): { videoRef: RefObject<HTMLVideoElement | null>; mode: "starting" | "live" | "fallback"; capture: () => Promise<File | null> }
  export function CameraStep(props: { onImage: (file: File) => void; onManual: () => void; onClose: () => void }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CameraStep } from "@/components/v2/quick-expense/camera-step"
import { isIOSDevice } from "@/components/v2/quick-expense/use-camera"

const setMedia = (getUserMedia?: unknown) =>
  Object.defineProperty(navigator, "mediaDevices", { value: getUserMedia ? { getUserMedia } : undefined, configurable: true })

afterEach(() => setMedia(undefined))

describe("isIOSDevice", () => {
  it("detects iPhone", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false)
  })
})

describe("CameraStep", () => {
  const props = () => ({ onImage: vi.fn(), onManual: vi.fn(), onClose: vi.fn() })

  it("shows copy and falls back when there is no camera api", async () => {
    render(<CameraStep {...props()} />)
    expect(screen.getByText("將發票或收據置於框內")).toBeInTheDocument()
    expect(screen.getByText("AI 會自動辨識金額與商家")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "從相簿選擇" })).toBeInTheDocument()
  })

  it("falls back when permission is denied", async () => {
    setMedia(vi.fn().mockRejectedValue(new Error("denied")))
    render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "開啟相機" })).toBeInTheDocument())
  })

  it("stops tracks on unmount when live", async () => {
    const stop = vi.fn()
    setMedia(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }))
    const { unmount } = render(<CameraStep {...props()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument())
    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it("passes a picked file and supports manual input", async () => {
    const p = props()
    const { container } = render(<CameraStep {...p} />)
    const file = new File(["a"], "r.jpg", { type: "image/jpeg" })
    fireEvent.change(container.querySelector('input[data-testid="gallery-input"]')!, { target: { files: [file] } })
    expect(p.onImage).toHaveBeenCalledWith(file)
    fireEvent.click(screen.getByRole("button", { name: "改用手動輸入" }))
    expect(p.onManual).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** `npx vitest run tests/components/v2/quick-expense/camera-step.test.tsx` → FAIL.

- [ ] **Step 3: Implement `use-camera.ts`**

```ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// iOS LIFF has no getUserMedia; same detection as components/ui/image-picker.tsx.
export function isIOSDevice(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(ua)
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [mode, setMode] = useState<"starting" | "live" | "fallback">("starting")

  useEffect(() => {
    if (isIOSDevice() || !navigator.mediaDevices?.getUserMedia) {
      setMode("fallback")
      return
    }
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          void video.play?.()?.catch?.(() => {})
        }
        setMode("live")
      })
      .catch(() => {
        if (!cancelled) setMode("fallback")
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const capture = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
    return blob ? new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }) : null
  }, [])

  return { videoRef, mode, capture }
}
```

- [ ] **Step 4: Implement `camera-step.tsx`**

```tsx
"use client"

import { useRef } from "react"
import { Camera, Images, X } from "lucide-react"
import { useCamera } from "./use-camera"

export function CameraStep({ onImage, onManual, onClose }: { onImage: (file: File) => void; onManual: () => void; onClose: () => void }) {
  const { videoRef, mode, capture } = useCamera()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) onImage(file)
  }
  const shoot = async () => {
    const file = await capture()
    if (file) onImage(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#10201B] text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 text-base font-semibold">拍照記帳</p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${mode === "live" ? "" : "hidden"}`} />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-dashed border-white/70" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-6 text-center">
          <p className="m-0 text-sm font-semibold">將發票或收據置於框內</p>
          <p className="m-0 mt-1 text-xs text-white/70">AI 會自動辨識金額與商家</p>
        </div>
      </div>

      <input ref={cameraInput} data-testid="camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryInput} data-testid="gallery-input" type="file" accept="image/*" className="hidden" onChange={pick} />

      <div className="flex items-center justify-center gap-6 px-4 py-6">
        {mode === "fallback" ? (
          <>
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#10201B]">
              <Camera className="h-4 w-4" aria-hidden="true" />
              開啟相機
            </button>
            <button type="button" onClick={() => galleryInput.current?.click()} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-bold">
              <Images className="h-4 w-4" aria-hidden="true" />
              從相簿選擇
            </button>
          </>
        ) : (
          <>
            <button type="button" aria-label="從相簿選擇" onClick={() => galleryInput.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Images className="h-5 w-5" />
            </button>
            <button type="button" aria-label="拍照" disabled={mode !== "live"} onClick={shoot} className="h-16 w-16 rounded-full border-4 border-white bg-white/30 disabled:opacity-40" />
            <span className="h-11 w-11" aria-hidden="true" />
          </>
        )}
      </div>

      <button type="button" onClick={onManual} className="mb-6 self-center text-sm font-semibold text-white/80 underline">
        改用手動輸入
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run** → PASS. **Step 6: Commit** — `feat: Add v2 camera step for receipt capture`.

---

### Task 6: A11 input step

**Files:**
- Create: `components/v2/quick-expense/quick-input-step.tsx`
- Test: `tests/components/v2/quick-expense/quick-input-step.test.tsx`

**Interfaces:**
- Consumes: `useSpeechInput` (Task 4).
- Produces: `export function QuickInputStep(props: { text: string; onTextChange: (text: string) => void; onParse: () => void; onCamera: () => void; onClose: () => void; error: string | null }): JSX.Element`
- Exports `export const EXAMPLES = ["早餐 100 我付", "晚餐 600 大家分", "計程車 250 小明付"]`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const speech = { supported: true, recording: false, transcribing: false, error: null as string | null, toggle: vi.fn() }
let emit: (t: string) => void = () => {}
vi.mock("@/lib/quick-expense/speech-input", () => ({
  useSpeechInput: ({ onText }: { onText: (t: string) => void }) => {
    emit = onText
    return speech
  },
}))

import { QuickInputStep } from "@/components/v2/quick-expense/quick-input-step"

const setup = (text = "", error: string | null = null) => {
  const p = { text, onTextChange: vi.fn(), onParse: vi.fn(), onCamera: vi.fn(), onClose: vi.fn(), error }
  render(<QuickInputStep {...p} />)
  return p
}

describe("QuickInputStep", () => {
  it("disables parse for blank text", () => {
    setup("   ")
    expect(screen.getByRole("button", { name: "AI 解析" })).toBeDisabled()
  })
  it("appends example chips and speech text with a space", () => {
    const p = setup("午餐 200")
    fireEvent.click(screen.getByRole("button", { name: "早餐 100 我付" }))
    expect(p.onTextChange).toHaveBeenCalledWith("午餐 200 早餐 100 我付")
    emit("晚餐 600")
    expect(p.onTextChange).toHaveBeenLastCalledWith("午餐 200 晚餐 600")
  })
  it("parses, opens camera, shows error, toggles mic", () => {
    const p = setup("早餐 100", "解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    expect(p.onParse).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    expect(p.onCamera).toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("解析失敗")
    fireEvent.click(screen.getByRole("button", { name: "語音輸入" }))
    expect(speech.toggle).toHaveBeenCalled()
  })
  it("disables parse while recording and hides mic when unsupported", () => {
    speech.recording = true
    setup("早餐 100")
    expect(screen.getByRole("button", { name: "AI 解析" })).toBeDisabled()
    speech.recording = false
    speech.supported = false
    setup("早餐 100")
    expect(screen.queryByRole("button", { name: "語音輸入" })).toBeNull()
    speech.supported = true
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```tsx
"use client"

import { useRef } from "react"
import { Camera, Loader2, Mic, Sparkles, Square, X } from "lucide-react"
import { useSpeechInput } from "@/lib/quick-expense/speech-input"

export const EXAMPLES = ["早餐 100 我付", "晚餐 600 大家分", "計程車 250 小明付"]

export function QuickInputStep({ text, onTextChange, onParse, onCamera, onClose, error }: {
  text: string
  onTextChange: (text: string) => void
  onParse: () => void
  onCamera: () => void
  onClose: () => void
  error: string | null
}) {
  const textRef = useRef(text)
  textRef.current = text
  const append = (extra: string) => {
    const current = textRef.current.trim()
    onTextChange(current ? `${current} ${extra}` : extra)
  }
  const speech = useSpeechInput({ onText: append })
  const busy = speech.recording || speech.transcribing
  const shownError = error ?? speech.error

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 flex items-center gap-1.5 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-v2-lake" aria-hidden="true" />
          AI 快速記帳
        </p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake-soft">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mb-4">
        <p className="mb-2.5 text-sm font-medium">說出或輸入消費內容</p>
        <div className="relative">
          <textarea
            aria-label="消費內容"
            rows={5}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="例如：早餐 100 我付、晚餐 600 大家分……"
            className="w-full resize-none rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3 pr-14 text-[13px] outline-none"
          />
          {speech.supported && (
            <button
              type="button"
              aria-label="語音輸入"
              aria-pressed={speech.recording}
              disabled={speech.transcribing}
              onClick={speech.toggle}
              className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full ${speech.recording ? "bg-v2-danger text-white" : "bg-v2-lake text-white"}`}
            >
              {speech.transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-v2-ink-muted">支援一次多筆、不同付款人 · 點麥克風可語音輸入</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => append(ex)} className="rounded-full border border-[#DDEDE6] bg-v2-lake-soft px-3 py-[5px] text-xs font-semibold">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onCamera} className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D2EAE1] text-v2-lake" aria-hidden="true">
          <Camera className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[13px] font-bold">拍照或掃描收據</span>
          <span className="block text-xs text-v2-ink-muted">AI 自動辨識金額與品項</span>
        </span>
      </button>

      <div className="mt-auto border-t border-v2-line bg-v2-surface px-4 py-3.5">
        {shownError && (
          <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
            {shownError}
          </p>
        )}
        <button
          type="button"
          disabled={!text.trim() || busy}
          onClick={onParse}
          className="w-full rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          AI 解析
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat: Add v2 AI quick-expense input step`.

---

### Task 7: A12 item card and confirm step

**Files:**
- Create: `lib/money-input.ts`, `components/v2/quick-expense/quick-item-card.tsx`, `components/v2/quick-expense/confirm-step.tsx`
- Modify: `components/v2/expense-form/split-editor.tsx` (delete local `MONEY_PATTERN`/`toMoneyInput`, import from `@/lib/money-input`)
- Test: `tests/components/v2/quick-expense/confirm-step.test.tsx`

**Interfaces:**
- Consumes: `QuickItem`, `itemTotals` (Task 1); `memberPillClass`, `memberTone` from `components/v2/expense-form/payer-picker`; `CategoryPicker` from `components/v2/expense-form/category-picker`; `CurrencySelect` from `@/components/ui/currency-select`; `LocationPicker`, `ImagePicker`, `Calendar`, `Popover*`; `formatAmount`, `formatCurrency`.
- Produces:
  ```ts
  export function toMoneyInput(raw: string): string | null  // lib/money-input.ts
  export function QuickItemCard(props: { item: QuickItem; members: { id: string; displayName: string }[]; onChange: (patch: Partial<QuickItem>) => void; onRemove: () => void }): JSX.Element
  export function ConfirmStep(props: {
    items: QuickItem[]; members: { id: string; displayName: string }[]; index: number; onIndexChange: (i: number) => void
    onItemsChange: (items: QuickItem[]) => void; onReinput: () => void; onSubmit: (notifyLine: boolean) => void
    onClose: () => void; canNotifyLine: boolean; error: string | null
  }): JSX.Element
  ```

- [ ] **Step 1: Move `toMoneyInput`** — create `lib/money-input.ts`:

```ts
// Money inputs accept digits with at most one decimal point and two decimals.
// Full-width digits/period from CJK keyboards are normalized first.
const MONEY_PATTERN = /^\d*(\.\d{0,2})?$/

export function toMoneyInput(raw: string): string | null {
  const v = raw.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  return MONEY_PATTERN.test(v) ? v : null
}
```

In `split-editor.tsx` remove the `MONEY_PATTERN` constant, the `toMoneyInput` function and their comment; add `import { toMoneyInput } from "@/lib/money-input"`. Run `npx vitest run tests/components/v2` → still 91 passing.

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("@/components/location-picker", () => ({ LocationPicker: () => <div data-testid="location-picker" /> }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => <div data-testid="image-picker" /> }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: ({ value }: { value: string }) => <div data-testid="currency">{value}</div> }))

import { ConfirmStep } from "@/components/v2/quick-expense/confirm-step"
import { fromParsed, type QuickItem } from "@/lib/quick-expense/draft"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }, { id: "c", displayName: "阿凱" }]
const items: QuickItem[] = fromParsed([
  { id: "1", amount: 60, description: "早餐", category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b", "c"], selected: true },
  { id: "2", amount: 150, description: "計程車", category: "transport", currency: "TWD", payerId: "b", participantIds: ["a", "b"], selected: true },
])

const setup = (o: Partial<Parameters<typeof ConfirmStep>[0]> = {}) => {
  const p = { items, members, index: 0, onIndexChange: vi.fn(), onItemsChange: vi.fn(), onReinput: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), canNotifyLine: true, error: null, ...o }
  render(<ConfirmStep {...p} />)
  return p
}

describe("ConfirmStep", () => {
  it("shows pager, split title, totals and submit label", () => {
    setup()
    expect(screen.getByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByText("幫誰付？（3 人均分 · 每人 20）")).toBeInTheDocument()
    expect(screen.getByText("共 2 筆")).toBeInTheDocument()
    expect(screen.getByText("TWD 210")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增 2 筆" })).toBeInTheDocument()
  })

  it("navigates between cards", () => {
    const p = setup()
    expect(screen.getByRole("button", { name: "上一筆" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "下一筆" }))
    expect(p.onIndexChange).toHaveBeenCalledWith(1)
  })

  it("edits amount keeping partial input and rejecting letters", () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12." } })
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], amount: "12." }, items[1]])
    p.onItemsChange.mockClear()
    fireEvent.change(screen.getByLabelText("金額"), { target: { value: "12a" } })
    expect(p.onItemsChange).not.toHaveBeenCalled()
  })

  it("changes payer and participants", () => {
    const p = setup()
    fireEvent.click(within(screen.getByRole("group", { name: "付款成員" })).getByRole("button", { name: "志明" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], payerId: "b" }, items[1]])
    fireEvent.click(within(screen.getByRole("group", { name: "分攤成員" })).getByRole("button", { name: "阿凱" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: ["a", "b"] }, items[1]])
    fireEvent.click(screen.getByRole("button", { name: "取消全選" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([{ ...items[0], participantIds: [] }, items[1]])
  })

  it("removes the current item and moves the index back when needed", () => {
    const p = setup({ index: 1 })
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(p.onItemsChange).toHaveBeenLastCalledWith([items[0]])
    expect(p.onIndexChange).toHaveBeenLastCalledWith(0)
  })

  it("submits with the LINE toggle value, reinputs, and shows errors", () => {
    const p = setup({ error: "第 1 筆請選擇付款成員" })
    expect(screen.getByRole("alert")).toHaveTextContent("第 1 筆請選擇付款成員")
    fireEvent.click(screen.getByRole("checkbox", { name: /通知 LINE 群組/ }))
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    expect(p.onSubmit).toHaveBeenCalledWith(false)
    fireEvent.click(screen.getByRole("button", { name: "重新輸入" }))
    expect(p.onReinput).toHaveBeenCalled()
  })

  it("hides the LINE toggle when notifications are unavailable and lists each currency", () => {
    setup({ canNotifyLine: false, items: [items[0], { ...items[1], currency: "JPY", amount: "500" }] })
    expect(screen.queryByRole("checkbox", { name: /通知 LINE 群組/ })).toBeNull()
    expect(screen.getByText("TWD 60 · JPY 500")).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run** → FAIL.

- [ ] **Step 4: Implement `quick-item-card.tsx`**

```tsx
"use client"

import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { CurrencySelect } from "@/components/ui/currency-select"
import { ImagePicker } from "@/components/ui/image-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LocationPicker } from "@/components/location-picker"
import { formatAmount, type CurrencyCode } from "@/lib/constants/currencies"
import { computeShares } from "@/lib/expense-split"
import { toMoneyInput } from "@/lib/money-input"
import type { QuickItem } from "@/lib/quick-expense/draft"
import { CategoryPicker } from "@/components/v2/expense-form/category-picker"
import { memberPillClass, memberTone } from "@/components/v2/expense-form/payer-picker"

type Member = { id: string; displayName: string }
const sectionTitle = "mb-2.5 text-sm font-medium leading-5 tracking-[.1px]"

function MemberPill({ member, index, selected, onClick }: { member: Member; index: number; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={memberPillClass(selected)}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${memberTone(index)}`} aria-hidden="true">
        {member.displayName.charAt(0)}
      </span>
      <span className="text-xs font-semibold">{member.displayName}</span>
    </button>
  )
}

export function QuickItemCard({ item, members, onChange, onRemove }: { item: QuickItem; members: Member[]; onChange: (patch: Partial<QuickItem>) => void; onRemove: () => void }) {
  const amount = Number(item.amount) || 0
  const perHead = computeShares({ amount, participantIds: item.participantIds, personalItems: {}, customShares: {} }).at(-1)?.shareAmount ?? 0
  const allSelected = members.every((m) => item.participantIds.includes(m.id))
  const toggleParticipant = (id: string) =>
    onChange({
      participantIds: item.participantIds.includes(id)
        ? item.participantIds.filter((x) => x !== id)
        : members.map((m) => m.id).filter((m) => m === id || item.participantIds.includes(m)),
    })

  return (
    <div>
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-2xl border border-v2-line bg-v2-surface px-3.5 py-3">
        <CurrencySelect value={item.currency as CurrencyCode} onChange={(v) => onChange({ currency: v })} showName={false} />
        <input
          aria-label="金額"
          inputMode="decimal"
          value={item.amount}
          onChange={(e) => {
            const v = toMoneyInput(e.target.value)
            if (v !== null) onChange({ amount: v })
          }}
          className="min-w-0 flex-1 bg-transparent text-right text-2xl font-bold outline-none"
        />
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>描述</p>
        <input
          aria-label="描述"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-[13px] outline-none"
        />
      </div>

      <CategoryPicker value={item.category} onChange={(c) => onChange({ category: c as QuickItem["category"] })} />

      <div role="group" aria-label="付款成員" className="mx-4 mb-4">
        <p className={sectionTitle}>誰付的錢？</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m, i) => (
            <MemberPill key={m.id} member={m} index={i} selected={item.payerId === m.id} onClick={() => onChange({ payerId: m.id })} />
          ))}
        </div>
      </div>

      <div role="group" aria-label="分攤成員" className="mx-4 mb-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="m-0 text-sm font-medium">
            {`幫誰付？（${item.participantIds.length} 人均分 · 每人 ${formatAmount(perHead, item.currency)}）`}
          </p>
          <button type="button" onClick={() => onChange({ participantIds: allSelected ? [] : members.map((m) => m.id) })} className="shrink-0 text-xs font-bold text-v2-lake">
            {allSelected ? "取消全選" : "全選"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m, i) => (
            <MemberPill key={m.id} member={m} index={i} selected={item.participantIds.includes(m.id)} onClick={() => toggleParticipant(m.id)} />
          ))}
        </div>
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>支出日期</p>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-surface px-3.5 py-3 text-left text-[13px]">
              <CalendarIcon className="h-4 w-4 text-v2-ink-muted" aria-hidden="true" />
              <span>{format(item.expenseDate, "yyyy/MM/dd（EEEEE）", { locale: zhTW })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={item.expenseDate} onSelect={(d) => d && onChange({ expenseDate: d })} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>消費地點</p>
        <LocationPicker
          value={{ location: item.location, latitude: item.latitude, longitude: item.longitude }}
          onChange={(v) => onChange({ location: v.location, latitude: v.latitude, longitude: v.longitude })}
        />
      </div>

      <div className="mx-4 mb-4">
        <p className={sectionTitle}>收據/消費圖片</p>
        <ImagePicker value={item.image} onChange={(v) => onChange({ image: v })} />
      </div>

      <button type="button" onClick={onRemove} className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-[14px] border border-v2-line bg-v2-surface py-3 text-[13px] font-bold text-v2-danger">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        刪除此筆
      </button>
    </div>
  )
}
```

If `LocationPicker`'s `onChange` value type differs, mirror exactly how `expense-form-v2-view.tsx` passes `state.location` (it is `{ location, latitude, longitude }`).

- [ ] **Step 5: Implement `confirm-step.tsx`**

```tsx
"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import { itemTotals, type QuickItem } from "@/lib/quick-expense/draft"
import { QuickItemCard } from "./quick-item-card"

type Member = { id: string; displayName: string }
const SWIPE_THRESHOLD = 50

export function ConfirmStep({ items, members, index, onIndexChange, onItemsChange, onReinput, onSubmit, onClose, canNotifyLine, error }: {
  items: QuickItem[]
  members: Member[]
  index: number
  onIndexChange: (i: number) => void
  onItemsChange: (items: QuickItem[]) => void
  onReinput: () => void
  onSubmit: (notifyLine: boolean) => void
  onClose: () => void
  canNotifyLine: boolean
  error: string | null
}) {
  const [notifyLine, setNotifyLine] = useState(true)
  const touchX = useRef<number | null>(null)
  const current = items[index]
  const go = (i: number) => i >= 0 && i < items.length && onIndexChange(i)
  const patch = (p: Partial<QuickItem>) => onItemsChange(items.map((it, i) => (i === index ? { ...it, ...p } : it)))
  const remove = () => {
    onItemsChange(items.filter((_, i) => i !== index))
    if (index > 0 && index >= items.length - 1) onIndexChange(index - 1)
  }
  const totals = itemTotals(items).map((t) => formatCurrency(t.total, t.currency)).join(" · ")

  if (!current) return null
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="m-0 text-base font-semibold">AI 快速記帳</p>
        <button type="button" aria-label="關閉" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake-soft">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-medium">支出明細</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="上一筆" disabled={index === 0} onClick={() => go(index - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-v2-lake-soft disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold tabular-nums">{`${index + 1} / ${items.length}`}</span>
          <button type="button" aria-label="下一筆" disabled={index === items.length - 1} onClick={() => go(index + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-v2-lake-soft disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (dx <= -SWIPE_THRESHOLD) go(index + 1)
          else if (dx >= SWIPE_THRESHOLD) go(index - 1)
        }}
      >
        <QuickItemCard key={current.id} item={current} members={members} onChange={patch} onRemove={remove} />
      </div>
      <div className="h-44" />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-v2-ink-muted">{`共 ${items.length} 筆`}</span>
            <span className="font-bold text-v2-lake">{totals}</span>
          </div>
          {canNotifyLine && (
            <label className="mb-2 flex items-center gap-2.5">
              <input type="checkbox" checked={notifyLine} onChange={(e) => setNotifyLine(e.target.checked)} className="h-5 w-5 accent-[#1B5847]" />
              <span>
                <span className="block text-xs font-bold">通知 LINE 群組</span>
                <span className="block text-xs text-v2-ink-muted">新增後自動發送通知到群組</span>
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="mb-2 text-xs font-bold text-v2-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onReinput} className="flex-1 rounded-[14px] border border-v2-line py-3.5 text-sm font-bold">
              重新輸入
            </button>
            <button type="button" onClick={() => onSubmit(canNotifyLine && notifyLine)} className="flex-[2] rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-white">
              {`新增 ${items.length} 筆`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Note: the test for `TWD 210` relies on `formatCurrency(210, "TWD")` → `"TWD 210"` (TWD has 0 decimals); `每人 20` relies on `formatAmount(20, "TWD")` → `"20"`. `perHead` uses the last share so the remainder-bearing first member does not show; for 60/3 all are 20.

- [ ] **Step 6: Run** `npx vitest run tests/components/v2` → all PASS.
- [ ] **Step 7: Commit** — `feat: Add v2 AI quick-expense confirm step` (include `lib/money-input.ts` and `split-editor.tsx`).

---

### Task 8: Orchestrator overlay and page wiring

**Files:**
- Create: `components/v2/quick-expense/quick-expense-v2.tsx`
- Modify: `components/v2/project/project-overview-v2.tsx`, `components/v2/expenses/expenses-v2.tsx` (swap `VoiceExpenseDialog` import and JSX tag for `QuickExpenseV2`; props unchanged)
- Test: `tests/components/v2/quick-expense/quick-expense-v2.test.tsx`

**Interfaces:**
- Consumes: everything above; `useAuthFetch` from `@/components/auth/liff-provider`.
- Produces:
  ```ts
  export function QuickExpenseV2(props: {
    open: boolean; onOpenChange: (open: boolean) => void; projectId: string; projectName: string
    members: { id: string; displayName: string }[]; currentUserMemberId: string; onSuccess: () => void; currency?: string
  }): JSX.Element | null
  ```
  (The pages pass richer member objects; they are structurally compatible.)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
vi.mock("@/lib/quick-expense/speech-input", () => ({ useSpeechInput: () => ({ supported: false, recording: false, transcribing: false, error: null, toggle: vi.fn() }) }))
const parseText = vi.fn()
const parseReceipt = vi.fn()
vi.mock("@/lib/quick-expense/parse", async (orig) => ({ ...(await orig<object>()), parseText: (...a: unknown[]) => parseText(...a), parseReceipt: (...a: unknown[]) => parseReceipt(...a) }))
const save = vi.fn()
vi.mock("@/lib/quick-expense/use-quick-save", () => ({ useQuickSave: () => ({ save, progress: null, canNotifyLine: false }) }))
vi.mock("@/components/v2/quick-expense/camera-step", () => ({
  CameraStep: ({ onImage, onManual }: { onImage: (f: File) => void; onManual: () => void }) => (
    <div>
      <button onClick={() => onImage(new File(["a"], "r.jpg"))}>fake-shot</button>
      <button onClick={onManual}>改用手動輸入</button>
    </div>
  ),
}))
vi.mock("@/components/location-picker", () => ({ LocationPicker: () => null }))
vi.mock("@/components/ui/image-picker", () => ({ ImagePicker: () => null }))
vi.mock("@/components/ui/currency-select", () => ({ CurrencySelect: () => null }))

import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"

const members = [{ id: "a", displayName: "小雨" }, { id: "b", displayName: "志明" }]
const parsed = (id: string, amount = 100) => ({ id, amount, description: `d${id}`, category: "food", currency: "TWD", payerId: "a", participantIds: ["a", "b"], selected: true })

const setup = () => {
  const p = { open: true, onOpenChange: vi.fn(), projectId: "p1", projectName: "東京", members, currentUserMemberId: "a", onSuccess: vi.fn(), currency: "TWD" }
  render(<QuickExpenseV2 {...p} />)
  return p
}
const typeAndParse = (text = "早餐 100") => {
  fireEvent.change(screen.getByLabelText("消費內容"), { target: { value: text } })
  fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
}

beforeEach(() => {
  parseText.mockReset(); parseReceipt.mockReset(); save.mockReset()
  globalThis.URL.createObjectURL = vi.fn(() => "blob:1")
})

describe("QuickExpenseV2", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<QuickExpenseV2 open={false} onOpenChange={vi.fn()} projectId="p1" projectName="" members={members} currentUserMemberId="a" onSuccess={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("parses text into the confirm step", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2")])
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    expect(parseText.mock.calls[0][1]).toEqual({ transcript: "早餐 100", members, currentUserMemberId: "a", defaultCurrency: "TWD" })
  })

  it("keeps the text and shows the error when parsing fails or returns nothing", async () => {
    parseText.mockRejectedValueOnce(new Error("解析失敗了"))
    setup()
    typeAndParse()
    expect(await screen.findByRole("alert")).toHaveTextContent("解析失敗了")
    expect(screen.getByLabelText("消費內容")).toHaveValue("早餐 100")
    parseText.mockResolvedValueOnce([])
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("沒有辨識到支出，請換個說法再試一次"))
  })

  it("turns a receipt photo into one item", async () => {
    parseReceipt.mockResolvedValue({ amount: 880, description: "超商", category: "shopping", date: null, confidence: 1 })
    setup()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    fireEvent.click(screen.getByText("fake-shot"))
    await screen.findByText("1 / 1")
    expect(screen.getByLabelText("金額")).toHaveValue("880")
  })

  it("returns to input when a receipt parse fails", async () => {
    parseReceipt.mockRejectedValue(new Error("收據辨識失敗"))
    setup()
    fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))
    fireEvent.click(screen.getByText("fake-shot"))
    expect(await screen.findByRole("alert")).toHaveTextContent("收據辨識失敗")
    expect(screen.getByLabelText("消費內容")).toBeInTheDocument()
  })

  it("jumps to the first invalid item instead of saving", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2", 0)])
    setup()
    typeAndParse()
    await screen.findByText("1 / 2")
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    expect(await screen.findByText("2 / 2")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("第 2 筆請輸入有效金額")
    expect(save).not.toHaveBeenCalled()
  })

  it("keeps only unsaved items after a partial failure and retries them", async () => {
    parseText.mockResolvedValue([parsed("1"), parsed("2"), parsed("3")])
    save.mockResolvedValueOnce({ savedIds: ["1"], failed: { index: 1, message: "伺服器錯誤" } })
    const p = setup()
    typeAndParse()
    await screen.findByText("1 / 3")
    fireEvent.click(screen.getByRole("button", { name: "新增 3 筆" }))
    expect(await screen.findByText("1 / 2")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("伺服器錯誤")
    expect(p.onSuccess).toHaveBeenCalledTimes(1)
    expect(p.onOpenChange).not.toHaveBeenCalled()
    save.mockResolvedValueOnce({ savedIds: ["2", "3"], failed: null })
    fireEvent.click(screen.getByRole("button", { name: "新增 2 筆" }))
    await waitFor(() => expect(p.onOpenChange).toHaveBeenCalledWith(false))
    expect(save.mock.calls[1][0].map((i: { id: string }) => i.id)).toEqual(["2", "3"])
  })

  it("returns to input after deleting every item and on 重新輸入", async () => {
    parseText.mockResolvedValue([parsed("1")])
    setup()
    typeAndParse()
    await screen.findByText("1 / 1")
    fireEvent.click(screen.getByRole("button", { name: "刪除此筆" }))
    expect(await screen.findByLabelText("消費內容")).toHaveValue("早餐 100")
    fireEvent.click(screen.getByRole("button", { name: "AI 解析" }))
    await screen.findByText("1 / 1")
    fireEvent.click(screen.getByRole("button", { name: "重新輸入" }))
    expect(screen.getByLabelText("消費內容")).toHaveValue("早餐 100")
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { fromParsed, validateItems, type QuickItem } from "@/lib/quick-expense/draft"
import { parseReceipt, parseText, receiptToItem } from "@/lib/quick-expense/parse"
import { useQuickSave } from "@/lib/quick-expense/use-quick-save"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { CameraStep } from "./camera-step"
import { ConfirmStep } from "./confirm-step"
import { QuickInputStep } from "./quick-input-step"

type Step = "input" | "camera" | "parsing" | "confirm" | "saving"
type Member = { id: string; displayName: string }

export function QuickExpenseV2({ open, onOpenChange, projectId, projectName, members, currentUserMemberId, onSuccess, currency = DEFAULT_CURRENCY }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  members: Member[]
  currentUserMemberId: string
  onSuccess: () => void
  currency?: string
}) {
  const authFetch = useAuthFetch()
  const plainMembers = members.map((m) => ({ id: m.id, displayName: m.displayName }))
  const { save, progress, canNotifyLine } = useQuickSave({ projectId, projectName, members: plainMembers })
  const [step, setStep] = useState<Step>("input")
  const [text, setText] = useState("")
  const [items, setItems] = useState<QuickItem[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Reset everything when the overlay closes.
  useEffect(() => {
    if (open) return
    setStep("input")
    setText("")
    setItems([])
    setIndex(0)
    setError(null)
  }, [open])

  if (!open) return null
  const close = () => onOpenChange(false)

  const showItems = (next: QuickItem[]) => {
    if (next.length === 0) throw new Error("沒有辨識到支出，請換個說法再試一次")
    setItems(next)
    setIndex(0)
    setError(null)
    setStep("confirm")
  }

  const handleParse = async () => {
    setStep("parsing")
    setError(null)
    try {
      const results = await parseText(authFetch, { transcript: text.trim(), members: plainMembers, currentUserMemberId, defaultCurrency: currency })
      showItems(fromParsed(results))
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失敗，請重試")
      setStep("input")
    }
  }

  const handleImage = async (file: File) => {
    setStep("parsing")
    setError(null)
    try {
      const result = await parseReceipt(authFetch, file)
      showItems([
        receiptToItem(result, { currency, payerId: currentUserMemberId, memberIds: plainMembers.map((m) => m.id), file, preview: URL.createObjectURL(file) }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "收據辨識失敗")
      setStep("input")
    }
  }

  const handleItemsChange = (next: QuickItem[]) => {
    if (next.length === 0) {
      setItems([])
      setError(null)
      setStep("input")
      return
    }
    setItems(next)
  }

  const handleSubmit = async (notifyLine: boolean) => {
    const invalid = validateItems(items)
    if (invalid) {
      setIndex(invalid.index)
      setError(invalid.message)
      return
    }
    setStep("saving")
    setError(null)
    const { savedIds, failed } = await save(items, { notifyLine })
    if (savedIds.length > 0) onSuccess()
    if (!failed) {
      close()
      return
    }
    const remaining = items.filter((i) => !savedIds.includes(i.id))
    setItems(remaining)
    // Saving is sequential, so the failed item is the first unsaved one.
    setIndex(0)
    setError(failed.message)
    setStep("confirm")
  }

  return (
    <UiV2Scope className="fixed inset-0 z-50 overflow-y-auto bg-v2-paper">
      <div className="mx-auto min-h-full max-w-md">
        {step === "input" && (
          <QuickInputStep text={text} onTextChange={setText} onParse={handleParse} onCamera={() => { setError(null); setStep("camera") }} onClose={close} error={error} />
        )}
        {step === "camera" && <CameraStep onImage={handleImage} onManual={() => setStep("input")} onClose={close} />}
        {(step === "parsing" || step === "saving") && (
          <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-v2-ink-muted">
            <Loader2 className="h-8 w-8 animate-spin text-v2-lake" aria-hidden="true" />
            {step === "parsing" ? "AI 解析中…" : progress ? `正在新增 ${progress.current} / ${progress.total}` : "正在新增…"}
          </div>
        )}
        {step === "confirm" && (
          <ConfirmStep
            items={items}
            members={plainMembers}
            index={Math.min(index, items.length - 1)}
            onIndexChange={setIndex}
            onItemsChange={handleItemsChange}
            onReinput={() => { setItems([]); setError(null); setStep("input") }}
            onSubmit={handleSubmit}
            onClose={close}
            canNotifyLine={canNotifyLine}
            error={error}
          />
        )}
      </div>
    </UiV2Scope>
  )
}
```

`UiV2Scope` accepts `className`; `bg-v2-paper` is the v2 page background token. Note the `useEffect` must stay above the `if (!open) return null` early return (hooks order).

- [ ] **Step 4: Run** `npx vitest run tests/components/v2/quick-expense` → PASS.

- [ ] **Step 5: Wire pages** — in `components/v2/project/project-overview-v2.tsx` and `components/v2/expenses/expenses-v2.tsx`: replace `import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"` with `import { QuickExpenseV2 } from "@/components/v2/quick-expense/quick-expense-v2"` and rename the JSX tag `VoiceExpenseDialog` → `QuickExpenseV2` (keep all props). If existing tests for these pages mock `@/components/voice/voice-expense-dialog`, change the mock path/name to the new component.

- [ ] **Step 6: Full verification** — `npm run test:run` (all pass) and `npm run lint` (no new errors) and `npx tsc --noEmit` (no errors in new/changed files).

- [ ] **Step 7: Commit** — `feat: Use v2 AI quick-expense overlay on v2 pages`.
