# V2 畫面 Demo（現況 baseline）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/demo` 建一個免登入、免後端的示範區，用真實 v2 畫面元件 + 一組共用假資料，擺出 12 個畫面當作實作對齊的基準。

**Architecture:** 每個畫面是一頁 `app/demo/<screen>/page.tsx`，直接渲染對應的 `*-view` 元件並餵入 `app/demo/_data/fixtures.ts` 的假資料；`app/demo/layout.tsx` 統一包 `UiV2Scope` 並掛一個固定的「回 Demo 目錄」按鈕。無獨立 view 的兩個畫面：新專案抽成 `NewProjectV2View`、快速記帳組合其 step 元件。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind v4、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-10-11-v2-demo-baseline-design.md`

## Global Constraints

- 回覆用繁體中文；程式碼註解用英文（`CLAUDE.md`）。
- 所有 demo 路由都在 `/demo/*` 底下 —— 已在 `PUBLIC_PREFIXES`（`components/auth/liff-provider.tsx`）為公開路由，不需再改 auth。
- 不動 v1、資料庫、API、既有 app 路由與行為。**唯一允許的正式碼改動**是 Task 8 的 `new-project-v2.tsx → NewProjectV2View` 抽取。
- Demo 頁**不得** import 資料 hook（`useProjects`、`useSettlement`、`useProjectData`、`useProjectExpenses`、`useCurrencyConversion`…）；一律餵 fixtures。純畫面 hook（`useState`、`useExpenseFilters`、`useExpenseDraft`）可用。
- 任何渲染 v2 markup 的測試檔，開頭都要 `vi.mock("next/font/google", () => ({ Noto_Serif_TC: () => ({ variable: "font-var-serif" }), Noto_Sans_TC: () => ({ variable: "font-var-sans" }) }))`。
- 假資料日期一律用**固定 ISO 字串**，測試不得依賴 `Date.now()`（需要 now 時明確傳入）。
- 完成時 `npm run lint` 與 `npm run test:run` 全綠。

## Review Focus

Spec 隱含、但任務測試未涵蓋、最容易讓人踩到的五類：

1. **畫面內的連結指向真實路由** —— view 內部寫死 `backHref`／`Link` 到 `/projects/[id]`、`/settings`、`/projects/new`。從 demo 畫面點下去會離開 demo（可能 404 或被 AuthGate 擋）。baseline 接受此行為；不修。
2. **`RateSheet` 改日期才會打 `/api/exchange-rates`** —— 預設今天不 fetch，安全；一旦使用者改日期，無 DB 會失敗，sheet 內部已處理錯誤訊息。
3. **`ExpenseFormV2View` 會渲染 `LocationPickerV2` + `V2ImagePicker`（瀏覽器 API）** —— demo 頁照常渲染；測試需 mock 這兩個 + `@/lib/geolocation`。
4. **`ProfileV2View` 依賴 `@/components/avatar-picker`（瀏覽器）** —— demo 頁照常渲染；測試需 mock 或容忍（該檔在 coverage 排除名單）。
5. **跨幣別金額不換算** —— 支出列表的 summary 是固定值，不等於清單原始金額加總（baseline 沒接匯率換算）。這是刻意的，不要「修正」成加總。

---

### Task 1: 共用假資料模組

**Files:**
- Create: `app/demo/_data/fixtures.ts`
- Test: `tests/demo/fixtures.test.ts`

**Interfaces:**
- Produces（後續所有任務消費）：
  - `DEMO_PROJECT_ID = "tokyo"`、`DEMO_CURRENCY = "TWD"`、`DEMO_CURRENT_MEMBER_ID = "me"`、`DEMO_TRIP_NAME = "東京之旅"`
  - `DEMO_MEMBERS: DraftMember[]`（我/阿明/阿凱/小婷）
  - `DEMO_USER: { name: string; image: string | null }`
  - `DEMO_PROJECT: OverviewProject`、`DEMO_SUMMARY: ProjectSummary`
  - `DEMO_PROJECT_CARDS: ProjectListItem[]`（3 張卡）
  - `DEMO_EXPENSES: ProjectExpense[]`（12 筆）
  - `DEMO_EXPENSE_SUMMARY: { total: number; count: number; average: number }`
  - `DEMO_FILTERS: ExpenseFilters`
  - `DEMO_SETTLE: SettleData`
  - `DEMO_LIVE_RATE = 0.215`、`DEMO_RECENT_RATES: RecentRate[]`
  - `DEMO_FORM_VALUES: ProjectFormValues`
  - `DEMO_EXPORT_COUNTS: { memberCount: number; expenseCount: number; filteredCount: number }`
  - `DEMO_QUICK_ITEMS: QuickItem[]`（由 `fromParsed(DEMO_PARSED_ITEMS, FIXED_TODAY)` 產生）

- [ ] **Step 1: 寫失敗測試**

```ts
// tests/demo/fixtures.test.ts
import { describe, it, expect } from "vitest"
import {
  DEMO_MEMBERS, DEMO_EXPENSES, DEMO_EXPENSE_SUMMARY, DEMO_SETTLE,
  DEMO_CURRENT_MEMBER_ID, DEMO_CURRENCY, DEMO_QUICK_ITEMS, DEMO_PROJECT_CARDS,
} from "@/app/demo/_data/fixtures"

describe("demo fixtures", () => {
  it("has 4 members and 12 expenses", () => {
    expect(DEMO_MEMBERS).toHaveLength(4)
    expect(DEMO_EXPENSES).toHaveLength(12)
  })
  it("references only known member ids", () => {
    const ids = new Set(DEMO_MEMBERS.map((m) => m.id))
    ids.add(DEMO_CURRENT_MEMBER_ID)
    for (const e of DEMO_EXPENSES) {
      for (const p of e.payers) expect(ids.has(p.memberId)).toBe(true)
      for (const p of e.participants) expect(ids.has(p.member.id)).toBe(true)
    }
  })
  it("uses the project currency as the expense summary currency", () => {
    expect(DEMO_EXPENSE_SUMMARY.count).toBe(12)
    expect(DEMO_CURRENCY).toBe("TWD")
  })
  it("settle balances sum to zero", () => {
    const sum = DEMO_SETTLE.balances.reduce((s, b) => s + b.balance, 0)
    expect(Math.round(sum)).toBe(0)
  })
  it("builds at least one quick-expense item", () => {
    expect(DEMO_QUICK_ITEMS.length).toBeGreaterThan(0)
    expect(DEMO_QUICK_ITEMS[0].amount).toBe("1280")
  })
  it("has three project cards", () => {
    expect(DEMO_PROJECT_CARDS).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/fixtures.test.ts`
Expected: FAIL（`Cannot find module '@/app/demo/_data/fixtures'`）

- [ ] **Step 3: 建立 `app/demo/_data/fixtures.ts`**

用下列固定值（型別對齊各 view 的 props）。成員：`me`=我、`ming`=阿明、`kai`=阿凱、`ting`=小婷（`DraftMember` 為 `{ id, displayName, image: null }`）。

- 12 筆支出（`ProjectExpense`），至少含這些（description 供測試斷言）：
  - `{ id: "e1", amount: 1280, currency: "JPY", description: "晚餐 · 拉麵", category: "food", expenseDate: "2026-10-08", payers:[{memberId:"me",amount:1280}], participants:[全部 4 人 shareAmount 320] }`
  - `e2` `800` JPY「地鐵一日券」transport `2026-10-08`；`e3` `8600` TWD「飯店 2 晚」accommodation；`e4` `3200` JPY「藥妝採買」shopping；`e5` `1450` JPY「拉麵午餐」food；`e6` `2100` JPY「晴空塔門票」ticket；`e7` `8.5` USD「咖啡」food；`e8` `2600` JPY「計程車」transport；`e9` `5400` TWD「和牛燒肉」food；`e10` `4800` JPY「伴手禮」gift；`e11` `1600` JPY「博物館門票」ticket；`e12` `950` JPY「便利商店」food。
  - 每筆 `image: null, location: null, latitude: null, longitude: null`；`createdAt` 用對應 `expenseDate` 的 ISO；`payers` 的 member 用 `ExpenseMember`（含 `user`），`participants` 的 member 同樣。
- `DEMO_EXPENSE_SUMMARY = { total: 48600, count: 12, average: 4050 }`（刻意固定，見 Review Focus 5）。
- `DEMO_SETTLE`：balances `me +3370 / ming -1200 / kai -900 / ting -1270`（和為 0）；settlements 三筆（ting/ming/kai → me）；summary `{ totalExpenses: 12, totalAmount: 29660, totalShared: 29660, isBalanced: true, currency: "TWD", exchangeRatesUsed: { JPY: 0.215 } }`。
- `DEMO_RECENT_RATES`: `[{ rate: 0.215, kind: "market", date: "2026-10-08", description: "晚餐 · 拉麵" }, { rate: 0.22, kind: "custom", date: null, description: "藥妝採買" }, { rate: 0.2135, kind: "market", date: "2026-10-05", description: "計程車" }]`。
- `DEMO_PROJECT`: `id "tokyo"`, `name "東京之旅"`, `description "秋季賞楓與美食"`, `cover DEFAULT_ICON_COVER`（`@/lib/covers`）, `budget "60000"`, `currency "TWD"`, `exchangeRatePrecision 2`, `startDate "2026-10-08"`, `endDate "2026-10-12"`, `creator { id:"u-me", name:"我", email:"me@demo" }`, `members`: 4 位 `OverviewMember`（`user` 非 null 供 `me`，其餘可 null）, `expenses`: 由上述 12 筆映射為 `OverviewExpense`。
- `DEMO_SUMMARY = { totalAmount: 48600, perPerson: 12150, budget: 60000, budgetProgress: 81, budgetRemaining: 11400, userBalance: 3370, hasMixedCurrencies: true, currentMemberId: "me" }`。
- `DEMO_PROJECT_CARDS`：3 張 `ProjectListItem` ——「東京之旅」(進行中)、「大阪美食行」(已完成)、「清邁數位遊牧」(無日期)。
- `DEMO_FILTERS`: `{ searchQuery: "", selectedCategories: new Set(), selectedPayers: new Set(), selectedParticipants: new Set(), selectedCurrencies: new Set(), amountRange: [0, 0], createdDateRange: undefined, expenseDateRange: undefined }`。
- `DEMO_FORM_VALUES: ProjectFormValues`：由 `DEMO_PROJECT` 的值組成（`budget: "60000"`, `joinMode: "both"`, `cover: DEFAULT_ICON_COVER`）。
- `DEMO_EXPORT_COUNTS = { memberCount: 4, expenseCount: 12, filteredCount: 12 }`。
- `DEMO_QUICK_ITEMS`：`fromParsed([{ id:"q1", amount:1280, description:"晚餐 拉麵", category:"food", currency:"JPY", payers:[{memberId:"me",amount:1280}], participantIds:["me","ming","kai","ting"], selected:true }], new Date(2026, 9, 8))`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/fixtures.test.ts`
Expected: PASS（6 個測試）

- [ ] **Step 5: Commit**

```bash
git add app/demo/_data/fixtures.ts tests/demo/fixtures.test.ts
git commit -m "feat(demo): shared v2 demo fixtures"
```

---

### Task 2: Demo 外框 + 目錄頁

**Files:**
- Create: `components/demo/demo-shell.tsx`
- Create: `app/demo/layout.tsx`
- Create: `app/demo/page.tsx`
- Test: `tests/demo/demo-shell.test.tsx`、`tests/demo/demo-index.test.tsx`

**Interfaces:**
- Consumes: 無（Task 1 未用到）。
- Produces: `/demo` 目錄頁，列出 12 個畫面的連結。

- [ ] **Step 1: 寫失敗測試**

```tsx
// tests/demo/demo-shell.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { usePathname } from "next/navigation"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }))

import { DemoShell } from "@/components/demo/demo-shell"

describe("DemoShell", () => {
  it("shows the back link on a screen page", () => {
    vi.mocked(usePathname).mockReturnValue("/demo/settle")
    render(<DemoShell><p>content</p></DemoShell>)
    expect(screen.getByRole("link", { name: "回 Demo 目錄" })).toHaveAttribute("href", "/demo")
  })
  it("hides the back link on the index page", () => {
    vi.mocked(usePathname).mockReturnValue("/demo")
    render(<DemoShell><p>content</p></DemoShell>)
    expect(screen.queryByRole("link", { name: "回 Demo 目錄" })).toBeNull()
  })
})
```

```tsx
// tests/demo/demo-index.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import DemoIndexPage from "@/app/demo/page"

const ROUTES = [
  "/demo/expenses", "/demo/add-expense", "/demo/quick-expense", "/demo/rate-sheet",
  "/demo/projects", "/demo/new-project", "/demo/overview", "/demo/project-settings",
  "/demo/settle", "/demo/profile", "/demo/export", "/demo/login",
]

describe("demo index", () => {
  it("links to all 12 screens", () => {
    render(<DemoIndexPage />)
    for (const href of ROUTES) {
      expect(screen.getByRole("link", { name: new RegExp(href) })).toHaveAttribute("href", href)
    }
  })
})
```

> 註：目錄頁的每個連結 `name` 以路由字串結尾（例如顯示「新增支出 · /demo/add-expense」），讓 `getByRole` 以 href 命中。實作時把路由字串放在連結文字中。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/demo-shell.test.tsx tests/demo/demo-index.test.tsx`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作**

`components/demo/demo-shell.tsx`（`"use client"`）：用 `usePathname()`；`pathname === "/demo"` 時只回傳 `children`；否則在 `{children}` 之後加一個固定 pill：

```tsx
<Link href="/demo" aria-label="回 Demo 目錄"
  className="fixed bottom-4 left-4 z-50 rounded-full border border-v2-line bg-v2-surface px-3.5 py-2 text-[12px] font-bold text-v2-lake shadow-md">
  ← Demo 目錄
</Link>
```

`app/demo/layout.tsx`（server component）：

```tsx
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DemoShell } from "@/components/demo/demo-shell"
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <UiV2Scope><DemoShell>{children}</DemoShell></UiV2Scope>
}
```

`app/demo/page.tsx`（server component，預設 export）：分「支出 / 專案 / 結算 / 個人」四組，每組一個標題 + 連結清單。每條連結文字含路由字串（見測試註記），href 為 §3 表中的路由；描述用該畫面一句話說明。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/demo-shell.test.tsx tests/demo/demo-index.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/demo app/demo/layout.tsx app/demo/page.tsx tests/demo/demo-shell.test.tsx tests/demo/demo-index.test.tsx
git commit -m "feat(demo): shell, layout and index page"
```

---

### Task 3: 支出列表

**Files:**
- Create: `app/demo/expenses/page.tsx`
- Test: `tests/demo/expenses-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_EXPENSES`、`DEMO_CURRENCY`、`DEMO_CURRENT_MEMBER_ID`、`DEMO_FILTERS`（Task 1）。
- Uses: `ExpensesV2View`、`ExpenseFilterBar`、`useExpenseFilters`（純 hook）、`summarizeExpenses`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoExpensesPage from "@/app/demo/expenses/page"

describe("demo expenses page", () => {
  it("renders the list header and an expense", () => {
    render(<DemoExpensesPage />)
    expect(screen.getByRole("heading", { name: "全部支出" })).toBeInTheDocument()
    expect(screen.getByText("晚餐 · 拉麵")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/expenses-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/expenses/page.tsx`（`"use client"`）**

```tsx
const f = useExpenseFilters(DEMO_EXPENSES)
const convert = (n: number) => n
return (
  <div className="mx-auto max-w-md">
    <ExpensesV2View
      projectId={DEMO_PROJECT_ID}
      currency={DEMO_CURRENCY}
      dateRangeLabel="10/08 – 10/12"
      allCount={DEMO_EXPENSES.length}
      expenses={f.filteredExpenses}
      summary={summarizeExpenses(f.filteredExpenses, convert, DEMO_CURRENCY)}
      currentMemberId={DEMO_CURRENT_MEMBER_ID}
      now={new Date(2026, 9, 11)}
      filterBar={
        <ExpenseFilterBar
          filters={f.filters} currency={DEMO_CURRENCY} maxAmount={f.maxAmount}
          payers={f.uniquePayers} participants={f.uniqueParticipants} currencies={f.uniqueCurrencies}
          hasActiveFilters={f.hasActiveFilters} currentMemberId={DEMO_CURRENT_MEMBER_ID}
          onSearch={f.setSearchQuery} onToggleCategory={f.toggleCategory}
          onClearCategories={() => f.setCategories(new Set())} onSetPayers={f.setPayers}
          onClearPayers={() => f.setPayers(new Set())} onToggleParticipant={f.toggleParticipant}
          onClearParticipants={() => f.setParticipants(new Set())} onToggleCurrency={f.toggleCurrency}
          onClearCurrencies={() => f.setCurrencies(new Set())} onAmountRange={f.setAmountRange}
          onExpenseRange={f.setExpenseDateRange} onClearFilters={f.clearFilters}
        />
      }
      onRequestDelete={(e) => alert(`（demo）刪除 ${e.description ?? "支出"}`)}
      onViewImage={() => alert("（demo）檢視圖片")}
    />
  </div>
)
```

> `DEMO_FILTERS` 供需要時作為 `useExpenseFilters` 初始值；本頁先用預設即可。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/expenses-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/expenses tests/demo/expenses-page.test.tsx
git commit -m "feat(demo): expense list screen"
```

---

### Task 4: 新增支出（升級為真 view）

**Files:**
- Modify: `app/demo/add-expense/page.tsx`（改為渲染 `ExpenseFormV2View`）
- Test: `tests/demo/add-expense-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_MEMBERS`、`DEMO_CURRENCY`、`DEMO_LIVE_RATE`、`DEMO_RECENT_RATES`（Task 1）。
- Uses: `ExpenseFormV2View` + `useExpenseDraft`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => null }))
vi.mock("@/components/v2/expense-form/v2-image-picker", () => ({ V2ImagePicker: () => null }))
vi.mock("@/lib/geolocation", () => ({ getCurrentLocation: () => Promise.resolve(null) }))
import DemoAddExpensePage from "@/app/demo/add-expense/page"

describe("demo add-expense page", () => {
  it("renders the expense form", () => {
    render(<DemoAddExpensePage />)
    expect(screen.getByText("新增支出")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/add-expense-page.test.tsx`
Expected: FAIL（現有頁面未 export 預設的 `ExpenseFormV2View` 版本、或斷言找不到）

- [ ] **Step 3: 改寫 `app/demo/add-expense/page.tsx`（`"use client"`）**

保留現有 draft 設定：

```tsx
const previewRateInfo = (currency: string) =>
  currency === "JPY" ? { rate: DEMO_LIVE_RATE, source: "live" as const }
  : currency === "USD" ? { rate: 31.8, source: "live" as const }
  : { rate: null, source: "none" as const }
const draft = useExpenseDraft(
  { members: DEMO_MEMBERS, currency: DEMO_CURRENCY, projectCurrency: DEMO_CURRENCY, paidBy: "me" },
  previewRateInfo,
)
```

渲染：

```tsx
<div className="mx-auto max-w-md">
  <ExpenseFormV2View
    mode="create" projectId={DEMO_PROJECT_ID} members={DEMO_MEMBERS} draft={draft}
    canNotifyLine={false} submitting={false} submitError={null}
    projectCurrency={DEMO_CURRENCY} previewRateInfo={previewRateInfo}
    rateContext={() => ({ liveRate: DEMO_LIVE_RATE, liveTimestamp: null })}
    recentRates={() => DEMO_RECENT_RATES}
    onSubmit={() => alert("（demo）新增支出")}
  />
</div>
```

移除舊的手動子元件組合與外層 `UiV2Scope`（現在由 `app/demo/layout.tsx` 提供）。`useExpenseDraft` 的 `init` 需要 `paidBy` 欄位，沿用現有頁的值。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/add-expense-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/add-expense/page.tsx tests/demo/add-expense-page.test.tsx
git commit -m "feat(demo): add-expense renders the real form view"
```

---

### Task 5: 匯率面板（升級為真元件）

**Files:**
- Modify: `app/demo/rate-sheet/page.tsx`（渲染真 `RateSheet`）
- Test: `tests/demo/rate-sheet-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_LIVE_RATE`、`DEMO_RECENT_RATES`、`DEMO_CURRENCY`（Task 1）。
- Uses: `RateSheet`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => vi.fn() }))
import DemoRateSheetPage from "@/app/demo/rate-sheet/page"

describe("demo rate-sheet page", () => {
  it("renders the sheet header", () => {
    render(<DemoRateSheetPage />)
    expect(screen.getByRole("heading", { name: "匯率" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/rate-sheet-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 改寫 `app/demo/rate-sheet/page.tsx`（`"use client"`）**

用 `useState` 管 `open`（預設 true，讓面板一進頁就張開）與目前 rate；渲染真 `RateSheet`：

```tsx
<RateSheet
  open={open} onClose={() => setOpen(false)}
  fromCurrency="JPY" toCurrency={DEMO_CURRENCY}
  rate={rate} customRate={custom} appliedKind={kind}
  liveRate={DEMO_LIVE_RATE} liveTimestamp={null}
  recentRates={DEMO_RECENT_RATES}
  onUseRate={(v, k) => { setRate(v); setKind(k); setCustom(k === "custom") }}
  onReset={() => { setRate(DEMO_LIVE_RATE); setKind(null); setCustom(false) }}
/>
```

附一個「重新開啟面板」按鈕（`setOpen(true)`）。移除外層 `UiV2Scope` 與舊的手刻預覽。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/rate-sheet-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/rate-sheet/page.tsx tests/demo/rate-sheet-page.test.tsx
git commit -m "feat(demo): rate-sheet renders the real sheet"
```

---

### Task 6: 快速記帳

**Files:**
- Create: `app/demo/quick-expense/page.tsx`
- Test: `tests/demo/quick-expense-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_MEMBERS`、`DEMO_CURRENCY`、`DEMO_QUICK_ITEMS`（Task 1）。
- Uses: `QuickInputStep` + `ConfirmStep`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/lib/quick-expense/speech-input", () => ({
  useSpeechInput: () => ({ recording: false, transcribing: false, error: null }),
}))
import DemoQuickExpensePage from "@/app/demo/quick-expense/page"

describe("demo quick-expense page", () => {
  it("shows the input step", () => {
    render(<DemoQuickExpensePage />)
    expect(screen.getByRole("heading", { name: "AI 快速記帳" })).toBeInTheDocument()
  })
  it("switches to the confirm step", () => {
    render(<DemoQuickExpensePage />)
    fireEvent.click(screen.getByRole("button", { name: /確認步驟/ }))
    expect(screen.getByText("晚餐 拉麵")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/quick-expense-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/quick-expense/page.tsx`（`"use client"`）**

用 `useState<"input" | "confirm">` 切步驟；頂部加兩個切換鈕（`aria-label="文字步驟"` / `"確認步驟"`）。`input` 立即回傳 `QuickInputStep`（本地 `text`/`mode` state、`onParse` 切到 confirm、`onCamera`/`onGallery`/`onClose` 為 no-op 或 alert）。`confirm` 回傳 `ConfirmStep`：

```tsx
<ConfirmStep
  items={items} members={DEMO_MEMBERS} index={index} onIndexChange={setIndex}
  onItemsChange={setItems} onReinput={() => setStep("input")}
  onSubmit={() => alert("（demo）新增支出")} onClose={() => setStep("input")}
  canNotifyLine={false} notifyLine={false} onNotifyLineChange={() => {}}
  error={null} projectCurrency={DEMO_CURRENCY}
  previewRateInfo={() => ({ rate: DEMO_LIVE_RATE, source: "live" })}
/>
```

`items` 初值為 `DEMO_QUICK_ITEMS`。整頁包 `mx-auto max-w-md`。

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/quick-expense-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/quick-expense tests/demo/quick-expense-page.test.tsx
git commit -m "feat(demo): quick-expense screen"
```

---

### Task 7: 專案列表

**Files:**
- Create: `app/demo/projects/page.tsx`
- Test: `tests/demo/projects-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_PROJECT_CARDS`、`DEMO_USER`（Task 1）。
- Uses: `ProjectsV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoProjectsPage from "@/app/demo/projects/page"

describe("demo projects page", () => {
  it("lists the demo trip", () => {
    render(<DemoProjectsPage />)
    expect(screen.getByRole("link", { name: /東京之旅/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/projects-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/projects/page.tsx`**

```tsx
<div className="mx-auto max-w-md">
  <ProjectsV2View projects={DEMO_PROJECT_CARDS} loading={false} userName={DEMO_USER.name}
    userImage={DEMO_USER.image} now={new Date(2026, 9, 11)} />
</div>
```

（server component 即可，不需 `"use client"`。）

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/projects-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/projects tests/demo/projects-page.test.tsx
git commit -m "feat(demo): projects list screen"
```

---

### Task 8: 新專案（抽 view）

**Files:**
- Create: `components/v2/new-project/new-project-v2-view.tsx`
- Modify: `components/v2/new-project/new-project-v2.tsx`
- Create: `app/demo/new-project/page.tsx`
- Test: `tests/components/v2/new-project-v2-view.test.tsx`、`tests/demo/new-project-page.test.tsx`

**Interfaces:**
- Produces: `NewProjectV2View(props: { values: ProjectFormValues; set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void; submitting: boolean; error: string | null; onCreate: () => void })`
- Consumes: `DEMO_FORM_VALUES`（Task 1）。

- [ ] **Step 1: 寫失敗測試（新 view）**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import { NewProjectV2View } from "@/components/v2/new-project/new-project-v2-view"
import { emptyProjectForm } from "@/lib/hooks/use-project-form"
import { DEMO_FORM_VALUES } from "@/app/demo/_data/fixtures"

describe("NewProjectV2View", () => {
  it("shows the current values and calls onCreate", () => {
    const set = vi.fn()
    const onCreate = vi.fn()
    render(<NewProjectV2View values={DEMO_FORM_VALUES} set={set} submitting={false} error={null} onCreate={onCreate} />)
    expect(screen.getByDisplayValue("東京之旅")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "建立旅程" }))
    expect(onCreate).toHaveBeenCalled()
  })
  it("shows a submit error", () => {
    render(<NewProjectV2View values={emptyProjectForm("TWD")} set={vi.fn()} submitting={false} error="建立失敗，請重試" onCreate={vi.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("建立失敗，請重試")
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/components/v2/new-project-v2-view.test.tsx`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 抽出 `NewProjectV2View`**

把 `new-project-v2.tsx` 目前的 JSX（`UiV2Scope` 底下的全部 markup）原封不動搬到新檔 `components/v2/new-project/new-project-v2-view.tsx`，改成吃 props：`values/set/submitting/error/onCreate`。**View 內不含 `UiV2Scope`**（container 與 demo 各自包）。保留所有 `aria-label`、class 與文案（「建立旅程」按鈕、`role="alert"` 錯誤列、「卡片預覽」…）。

`new-project-v2.tsx` 的 container 改為：

```tsx
return (
  <UiV2Scope>
    <div className="mx-auto max-w-md">
      <NewProjectV2View values={values} set={set} submitting={submitting} error={error} onCreate={handleCreate} />
    </div>
  </UiV2Scope>
)
```

`V2TopBar title="建立旅程" backHref="/projects"` 放回 container（在 view 之上），確保「建立旅程」標題仍在頁面上（view 測試用 `getByRole("button", { name: "建立旅程" })`，不依賴 top bar）。

- [ ] **Step 4: 確認既有測試仍綠**

Run: `npm run test:run -- tests/components/v2/new-project-v2.test.tsx`
Expected: PASS（行為不變；若該測試斷言 `data-ui="v2"`，container 仍包 `UiV2Scope`，維持）

- [ ] **Step 5: 寫失敗測試（demo 頁）**

```tsx
// tests/demo/new-project-page.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoNewProjectPage from "@/app/demo/new-project/page"

describe("demo new-project page", () => {
  it("renders the create form with demo values", () => {
    render(<DemoNewProjectPage />)
    expect(screen.getByDisplayValue("東京之旅")).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/new-project-page.test.tsx`
Expected: FAIL

- [ ] **Step 7: 實作 `app/demo/new-project/page.tsx`（`"use client"`）**

用 `useProjectForm(DEMO_FORM_VALUES)` 取得 `values/set`；渲染 `V2TopBar`（title 建立旅程）+ `NewProjectV2View`，`onCreate={() => alert("（demo）建立旅程")}`，`submitting={false}`、`error={null}`。包 `mx-auto max-w-md`。

- [ ] **Step 8: 跑測試確認通過**

Run: `npm run test:run -- tests/components/v2/new-project-v2-view.test.tsx tests/demo/new-project-page.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add components/v2/new-project app/demo/new-project tests/components/v2/new-project-v2-view.test.tsx tests/demo/new-project-page.test.tsx
git commit -m "refactor(v2): extract NewProjectV2View and add demo screen"
```

---

### Task 9: 專案總覽

**Files:**
- Create: `app/demo/overview/page.tsx`
- Test: `tests/demo/overview-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_PROJECT`、`DEMO_SUMMARY`、`DEMO_USER`（Task 1）。
- Uses: `ProjectOverviewV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoOverviewPage from "@/app/demo/overview/page"

describe("demo overview page", () => {
  it("renders the trip overview", () => {
    render(<DemoOverviewPage />)
    expect(screen.getByRole("heading", { name: "旅程總覽" })).toBeInTheDocument()
    expect(screen.getByText("東京之旅")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/overview-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/overview/page.tsx`**

```tsx
<div className="mx-auto max-w-md">
  <ProjectOverviewV2View project={DEMO_PROJECT} summary={DEMO_SUMMARY}
    onShare={() => alert("（demo）分享")} onVoice={() => alert("（demo）語音記帳")}
    currentUserName={DEMO_USER.name} currentUserImage={DEMO_USER.image} />
</div>
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/overview-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/overview tests/demo/overview-page.test.tsx
git commit -m "feat(demo): project overview screen"
```

---

### Task 10: 專案設定

**Files:**
- Create: `app/demo/project-settings/page.tsx`
- Test: `tests/demo/project-settings-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_FORM_VALUES`（Task 1）。
- Uses: `ProjectSettingsV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoProjectSettingsPage from "@/app/demo/project-settings/page"

describe("demo project-settings page", () => {
  it("shows the project name field", () => {
    render(<DemoProjectSettingsPage />)
    expect(screen.getByLabelText("專案名稱")).toHaveValue("東京之旅")
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/project-settings-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/project-settings/page.tsx`（`"use client"`）**

用 `useProjectForm(DEMO_FORM_VALUES)` 取 `values/set`；渲染 `ProjectSettingsV2View`：

```tsx
<div className="mx-auto max-w-md">
  <ProjectSettingsV2View values={values} set={set} isCreator
    saving={false} submitError={null}
    onCancel={() => {}} onSave={() => alert("（demo）儲存")}
    onRequestDelete={() => alert("（demo）刪除專案")} />
</div>
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/project-settings-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/project-settings tests/demo/project-settings-page.test.tsx
git commit -m "feat(demo): project settings screen"
```

---

### Task 11: 結算

**Files:**
- Create: `app/demo/settle/page.tsx`
- Test: `tests/demo/settle-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_SETTLE`、`DEMO_CURRENT_MEMBER_ID`、`DEMO_CURRENCY`（Task 1）。
- Uses: `SettleV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/ads/ad-container", () => ({ AdContainer: () => null }))
import DemoSettlePage from "@/app/demo/settle/page"

describe("demo settle page", () => {
  it("renders the settlement summary", () => {
    render(<DemoSettlePage />)
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("29,660")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/settle-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/settle/page.tsx`（`"use client"`）**

```tsx
const toDisplay = (n: number) => n
return (
  <div className="mx-auto max-w-md">
    <SettleV2View
      projectId={DEMO_PROJECT_ID} data={DEMO_SETTLE} currentMemberId={DEMO_CURRENT_MEMBER_ID}
      dailyAverage={5932} displayCurrencyCode={DEMO_CURRENCY} currencyOptions={[DEMO_CURRENCY, "JPY"]}
      onDisplayCurrency={() => {}} toDisplay={toDisplay}
      onShowCalc={() => alert("（demo）分帳計算")} onShare={() => alert("（demo）分享")}
    />
  </div>
)
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/settle-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/settle tests/demo/settle-page.test.tsx
git commit -m "feat(demo): settle screen"
```

---

### Task 12: 個人設定

**Files:**
- Create: `app/demo/profile/page.tsx`
- Test: `tests/demo/profile-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_USER`（Task 1）。
- Uses: `ProfileV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/avatar-picker", () => ({
  AvatarDisplay: () => null,
  AvatarPicker: () => null,
}))
import DemoProfilePage from "@/app/demo/profile/page"

describe("demo profile page", () => {
  it("shows the user name", () => {
    render(<DemoProfilePage />)
    expect(screen.getByDisplayValue("我")).toBeInTheDocument()
  })
})
```

> 先確認 `ProfileV2View` 的名稱欄位是否為可編輯 input（`getByDisplayValue`）或純文字；若為純文字，改用 `getByText("我")`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/profile-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/profile/page.tsx`（`"use client"`）**

`useState` 管 `pickerOpen`/`logoutOpen`；渲染 `ProfileV2View`：

```tsx
<div className="mx-auto max-w-md">
  <ProfileV2View
    name={DEMO_USER.name} image={DEMO_USER.image} avatarData={null} hasExternalImage={false}
    pickerOpen={pickerOpen} saving={false}
    onOpenPicker={() => setPickerOpen(true)} onPickerOpenChange={setPickerOpen}
    onSelectAvatar={() => {}} logoutOpen={logoutOpen} onLogoutOpenChange={setLogoutOpen}
    onLogout={() => alert("（demo）登出")} />
</div>
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/profile tests/demo/profile-page.test.tsx
git commit -m "feat(demo): profile screen"
```

---

### Task 13: 匯出

**Files:**
- Create: `app/demo/export/page.tsx`
- Test: `tests/demo/export-page.test.tsx`

**Interfaces:**
- Consumes: `DEMO_PROJECT`、`DEMO_EXPORT_COUNTS`、`DEMO_CURRENCY`（Task 1）。
- Uses: `ExportV2View`。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoExportPage from "@/app/demo/export/page"

describe("demo export page", () => {
  it("shows the project name and export action", () => {
    render(<DemoExportPage />)
    expect(screen.getByText("東京之旅")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /匯出/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/export-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/export/page.tsx`（`"use client"`）**

用 `useState` 管 `format`/`content`/`filters`（初值 `format: "csv"`、`content` 用 `defaultExportOptions.content`、`filters: {}`）：

```tsx
<div className="mx-auto max-w-md">
  <ExportV2View
    projectId={DEMO_PROJECT_ID} projectName={DEMO_PROJECT.name} currency={DEMO_CURRENCY}
    format={format} content={content} filters={filters}
    memberCount={DEMO_EXPORT_COUNTS.memberCount} expenseCount={DEMO_EXPORT_COUNTS.expenseCount}
    filteredCount={DEMO_EXPORT_COUNTS.filteredCount}
    exporting={false} showLargeDataWarning={false}
    onFormatChange={setFormat} onContentChange={setContent} onFiltersChange={setFilters}
    onExport={() => alert("（demo）匯出")} />
</div>
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/export-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/export tests/demo/export-page.test.tsx
git commit -m "feat(demo): export screen"
```

---

### Task 14: 登入

**Files:**
- Create: `app/demo/login/page.tsx`
- Test: `tests/demo/login-page.test.tsx`

**Interfaces:**
- Uses: `LoginV2`（`isDevMode`、`onLogin`）。

- [ ] **Step 1: 寫失敗測試**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
import DemoLoginPage from "@/app/demo/login/page"

describe("demo login page", () => {
  it("renders the login card", () => {
    render(<DemoLoginPage />)
    expect(screen.getByText("Wander Wallet")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /LINE 登入/ }))
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm run test:run -- tests/demo/login-page.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 `app/demo/login/page.tsx`**

`LoginV2` 本身已含 `UiV2Scope`（`min-h-screen`）。直接：

```tsx
export default function DemoLoginPage() {
  return <LoginV2 isDevMode={false} onLogin={() => alert("（demo）LINE 登入")} />
}
```

（此頁由 demo layout 再包一層 `UiV2Scope` 無妨。）

- [ ] **Step 4: 跑測試確認通過**

Run: `npm run test:run -- tests/demo/login-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/demo/login tests/demo/login-page.test.tsx
git commit -m "feat(demo): login screen"
```

---

### Task 15: 全量驗收

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 errors。

- [ ] **Step 2: 全套測試**

Run: `npm run test:run`
Expected: 全綠（含 Task 8 的既有 `new-project-v2` 測試）。

- [ ] **Step 3: 手動驗收**

Run: `npm run dev`，開 `/demo`：
- 目錄頁列出 12 個畫面並可點入。
- 逐頁確認畫面與正式版一致、可操作；按鈕跳 demo 提示。
- 每頁左下角有「← Demo 目錄」可回首頁（目錄頁本身沒有）。
- 點「新專案」看得到完整表單；點「匯率面板」面板預設展開。

- [ ] **Step 4: Commit（若驗收有微調）**

```bash
git add -A && git commit -m "chore(demo): verification fixes"
```

---

## Self-Review

- **Spec coverage**：§3 的 12 畫面 → Task 3–14 各一頁；§4.1 路由外框 → Task 2；§4.2 假資料 → Task 1；§4.3 呈現策略 → Task 3（view）、Task 4/5（升級真元件）、Task 6（steps）、Task 8（抽 view）、Task 14（login）；§6 測試 → 每任務一測試 + Task 15 全量。無遺漏。
- **Step scan**：每個 step 皆可寫出唯一合理的東西；未出現 TBD。
- **Type consistency**：`NewProjectV2View` 的 props 名稱在 Task 8 內一致；fixtures 匯出名稱（`DEMO_*`）在 Task 3–14 一致引用。
- **Review Focus**：五項皆已寫入並對應說明（1→不修；2→Task 5 說明；3→Task 4 mock；4→Task 12 mock；5→Task 3 固定 summary）。
- **Proportion**：計畫約為 spec 的數倍，但每任務僅列關鍵 props 對映與測試斷言，未逐行抄寫畫面。
