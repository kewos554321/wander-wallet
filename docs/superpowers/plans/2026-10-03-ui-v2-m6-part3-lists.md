# UI v2 里程碑 6 — Part 3：A5b 結算／A6b 全部支出（含篩選下拉）／A7b 成員

> **For agentic workers:** REQUIRED SUB-SKILL：使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans，逐 task、逐 step 執行。步驟用 `- [ ]` 追蹤。照字面執行，不要自行重構、不要合併 task、不要跳過測試。若某步看起來必須改到保護檔案，寫「STOP and report」，不要動手。

**Goal:** 把 v2 的 A5b、A6b、A7b 三個畫面從現況對齊 `design/project-v20261003/`，且完全不影響 v1。

**Spec：** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`（D1–D26、v1 保護 §2、覆蓋率 §6、tokens §4）。**衝突時以 spec 為準。**
**Gap：** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a5-a7.md`（已修正版，含 file:line 證據、token 修正、D21 滑動規則、D26 頁尾規則）。
**Master plan：** `docs/superpowers/plans/2026-10-03-ui-v2-milestone-6.md`（Task 0.1–0.3 為本 Part 的前置）。

## 前置條件（Task 0 必須先完成）

執行本 Part 前，`feat/ui-v2-m6` 分支上必須已存在以下由 **Part 0** 新增的東西；本 Part **只使用、不重建**：

- `app/globals.css`：tokens `--v2-lake-edge`、`--v2-danger-tint`、`--v2-danger-border`、`--v2-danger-wash`、`--v2-danger-edge`（含 `@theme inline` 的 `--color-v2-*` 對應）與工具 class `[data-ui="v2"] .v2-scroll`。
- `components/v2/layout/v2-top-bar.tsx`：`titleClassName?: string` prop（省略時維持 `text-base font-medium`）。
- `tests/components/v2/v2-tokens.test.ts`、`tests/components/v2/v2-top-bar.test.tsx`。

若這些不存在，先回到 Part 0，不要在本 Part 重做。

## Global Constraints（每個 task 都適用）

1. 基準 commit：`36633e1`。工作分支：`feat/ui-v2-m6`。
2. **只能改**：`components/v2/**`、`tests/**`、`docs/**`。（本 Part 預期不會動 `app/globals.css`、`lib/covers.ts`。）
3. **絕對不能改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、`tests/components/v1/**`。`lib/expense-list.ts` 也不在允許清單內，**不要改它**。若某個 task 看起來必須改它們，**STOP and report**。
4. 篩選下拉面板**不可**使用 Radix Portal／`components/ui/popover.tsx`（tokens 只在 `[data-ui="v2"]` 內生效，Portal 會把內容移到 body 外面）。改用 inline absolute panel + `useDismiss`。
5. `components/v2/**` 禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會檢查）。顏色一律用 token（`bg-v2-*`、`text-v2-*`、`border-v2-*`）；`rgba()` 只用於陰影，`bg-v2-on-lake/20` 這類 token opacity 修飾可用。**不新增 token**（唯一例外見 Task 3.5 Step 3 的備註，但本計畫採「不加 token」的替代方案）。
6. 不新增 API、不改 Prisma、不改 v1。
7. 註解用英文、一行以內、非必要不寫。回覆與文件用繁體中文。測試碼與註解用英文。
8. 每個 task：先寫測試（完整程式碼）→ 跑，看到 FAIL → 實作 → 跑，看到 PASS → `npm run lint` → commit。commit 訊息英文、一行，`feat:` / `fix:` / `test:` / `refactor:` / `chore:` 開頭。
9. 不要 `git push`、不要 `git commit --amend`、不要 `--no-verify`。
10. 測試失敗又不知道原因：**STOP and report 錯誤全文**，不要刪測試、不要 `.skip`、不要放寬斷言。
11. v1 驗證（隨時可跑，輸出必須為空）：
    ```bash
    git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
    ```

## 跨 Part 歸屬（重要）

- `section-card.tsx`（`components/v2/expense-form/section-card.tsx`）與 `tests/components/v2/section-card.test.tsx` 由 **Part 2**（`gap-a3.md`）建立與擁有。本 Part **不建立、不修改、不重複測試**這兩個檔案（避免兩個 Part 共用檔案）。本 Part 的三個畫面把 section card 的 class 直接 inline 在各自元件裡（`rounded-2xl border border-v2-line bg-v2-surface p-4`、標題 `text-[13px] font-bold text-v2-lake`）。這是刻意的，**不是遺漏**，已在回報中標記。
- 若執行到本 Part 時 `components/v2/expense-form/section-card.tsx` 不存在，仍可完成本 Part（不需要它）。

## Review Focus（本 Part 必須有的測試）

1. **A6b 卡片缺資料**（master Review Focus #2，`tests/components/v2/expenses-v2.test.tsx`）：沒有描述、沒有地點、沒有圖片、只有 1 位分攤者、分攤者 > 3 位（`+N`）都不當掉。**頁尾依 D26 一律渲染**：左側 `未填寫地點` 佔位、右側 32px 指示（`已附明細圖片`／`未附明細圖片`）。
2. **篩選面板互動**（master Review Focus #4，`tests/components/v2/filter-panels.test.tsx`）：點面板外關閉、按 Escape 關閉、同時只開一個面板、有篩選時才出現「移除篩選」。
3. **D21 滑動刪除**：紅色刪除鈕永遠在 DOM 且可 focus，focus 自動展開，不可 `aria-hidden`／`display:none`／`inert`，不可有只用來測試的隱藏 prop。

## 覆蓋率目標

- baseline：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`。
- `components/v2/expenses` ≥ 80% Lines（baseline 28.33；目前 `expense-filter-bar.tsx` 與 `expenses-v2.tsx` 皆 0%）。
- `components/v2/members` ≥ 80% Lines（baseline 57.5；`members-v2.tsx` 39.28%）。
- 新增檔案 Lines ≥ 90%（`components/**/*.tsx` 會被量；`.ts` 檔依設定可能不量，但仍要測）。

## 不新增 token 的決定

Gap F9 的「開啟中且未啟用」觸發鍵設計值 `border:1.5px solid #B7AE9D; background:#F5F1E8`。`#B7AE9D` 對應既有 `--v2-ink-subtle`；`#F5F1E8` 無對應 token。本計畫**不新增 `--v2-sand-hover`**，改用既有 `bg-v2-sand`（`#F1EBE0`，gap 認可的 accepted deviation）。因此本 Part 不動 `app/globals.css`。

---

## Task 3.1：A5b 結算 — section card 化 + top bar 標題 + 頭像色調

**Files:**
- Modify: `components/v2/settle/settle-summary-grid.tsx`
- Modify: `components/v2/settle/settlement-list.tsx`
- Modify: `components/v2/settle/member-balances.tsx`
- Modify: `components/v2/settle/settle-v2-view.tsx`
- Modify: `tests/components/v2/settle-v2.test.tsx`

- [ ] **Step 1: 在 `tests/components/v2/settle-v2.test.tsx` 的 `describe("SettleV2View", ...)` 內、最後一個 `it` 之後，加入以下 4 個測試（完整程式碼）**

```tsx
  it("keeps the summary heading inside the summary card", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("計算總覽")).toBeInTheDocument()
  })

  it("renders the summary tile values in ink", () => {
    renderView()
    const grid = screen.getByTestId("settle-summary")
    expect(within(grid).getByText("29,660").className).toContain("text-v2-ink")
  })

  it("keeps the transfer heading in the same card as the rows", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    const heading = screen.getByText("轉帳建議")
    expect(row.closest("div.rounded-2xl")).toBe(heading.closest("div.rounded-2xl"))
  })

  it("uses the gold tone for the current user avatar", () => {
    renderView()
    const row = screen.getByTestId("settlement-0")
    const meLabel = within(row).getByText("我", { selector: "span.font-medium" })
    expect(meLabel.previousElementSibling?.className).toContain("bg-v2-gold-soft")
  })
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx`
Expected: FAIL（`計算總覽` 不在 `settle-summary` 內、value 是 `text-v2-lake`、標題與列不同卡、頭像非 gold）。

- [ ] **Step 3: 替換 `components/v2/settle/settle-summary-grid.tsx` 全檔**

```tsx
import { Calculator, Receipt, TrendingUp, Users, type LucideIcon } from "lucide-react"

interface Tile {
  label: string
  value: string
  icon: LucideIcon
  tone: { bg: string; iconBg: string; text: string }
}

const LAKE = { bg: "bg-v2-lake-soft", iconBg: "bg-v2-lake-tint", text: "text-v2-lake" }
const CORAL = { bg: "bg-v2-coral-soft", iconBg: "bg-v2-coral-tint", text: "text-v2-coral-strong" }
const PLUM = { bg: "bg-v2-plum-soft", iconBg: "bg-v2-plum-tint", text: "text-v2-plum" }

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
    <div data-testid="settle-summary" className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-[13px] font-bold text-v2-lake">計算總覽</p>
        {currencySelect}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`flex flex-col items-center rounded-[12px] px-1 py-3 ${tone.bg}`}>
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${tone.iconBg} ${tone.text}`} aria-hidden="true">
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
            </div>
            <span className="font-v2-serif text-base font-bold tabular-nums text-v2-ink">{value}</span>
            <span className="mt-0.5 text-xs text-v2-ink-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 替換 `components/v2/settle/settlement-list.tsx` 全檔**

```tsx
import { ArrowRight, Info, Share2 } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { SettleSettlement } from "@/lib/hooks/useSettlement"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-gold-soft text-v2-gold",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-coral-soft text-v2-coral-strong",
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
  /** Total expense count, used to distinguish "no expenses yet" from "all settled". */
  expenseCount: number
}

const actionButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-v2-lake-edge bg-v2-lake-soft px-3 py-1.5 text-xs font-semibold text-v2-lake"

export function SettlementList({
  settlements,
  memberIds,
  currentMemberId,
  currencyCode,
  toDisplay,
  onShowCalc,
  onShare,
  expenseCount,
}: SettlementListProps) {
  const tone = (memberId: string) =>
    memberId === currentMemberId
      ? "bg-v2-gold-soft text-v2-gold"
      : AVATAR_TONES[Math.max(0, memberIds.indexOf(memberId)) % AVATAR_TONES.length]
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
    <div className="mx-4 mt-4 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-[13px] font-bold text-v2-lake">轉帳建議</p>
        <div className="flex gap-2">
          <button type="button" onClick={onShowCalc} className={actionButton}>
            <Info className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
            計算說明
          </button>
          <button type="button" onClick={onShare} className={actionButton}>
            <Share2 className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
            分享
          </button>
        </div>
      </div>
      {settlements.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-v2-ink-muted">
          {expenseCount === 0 ? "尚無支出記錄" : "所有人都已結清"}
        </p>
      ) : (
        settlements.map((s, i) => (
          <div
            key={`${s.from.memberId}-${s.to.memberId}`}
            data-testid={`settlement-${i}`}
            className={`flex items-center justify-between gap-2.5 ${i < settlements.length - 1 ? "border-b border-v2-line-soft py-3" : "pt-3"}`}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {person(s.from.memberId, s.from.displayName)}
              <ArrowRight className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" strokeWidth={2.2} aria-label="付給" />
              {person(s.to.memberId, s.to.displayName)}
            </div>
            <p className="m-0 shrink-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums">
              {formatCurrency(Math.round(toDisplay(s.amount)), currencyCode)}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: 替換 `components/v2/settle/member-balances.tsx` 全檔**

```tsx
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
    <section aria-label="各人收支" className="mx-4 mt-4 rounded-2xl border border-v2-line bg-v2-surface p-4">
      <p className="mb-2.5 text-[13px] font-bold text-v2-lake">各人收支</p>
      {balances.map((b, i) => {
        const rounded = Math.round(toDisplay(b.balance))
        const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
        return (
          <div key={b.memberId} className={`flex items-center justify-between gap-3 ${i < balances.length - 1 ? "border-b border-v2-line-soft py-3" : "pt-3"}`}>
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
    </section>
  )
}
```

- [ ] **Step 6: 在 `components/v2/settle/settle-v2-view.tsx` 做 2 處精確修改**

(a) 把：

```tsx
      <V2TopBar title="結算" backHref={`/projects/${props.projectId}`} />
```

改成：

```tsx
      <V2TopBar title="結算" backHref={`/projects/${props.projectId}`} titleClassName="font-bold" />
```

(b) 把底部「查看統計」的兩個 icon 大小改成設計值：

```tsx
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          查看統計
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
```

改成：

```tsx
          <BarChart3 className="h-[13px] w-[13px]" aria-hidden="true" />
          查看統計
          <ChevronRight className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden="true" />
```

- [ ] **Step 7: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 8: lint 並 commit**

```bash
npm run lint
git add components/v2/settle tests/components/v2/settle-v2.test.tsx
git commit -m "feat: Align v2 settle screen with v20261003 section cards"
```

---

## Task 3.2：滑動數學 `swipe-math.ts`（D21 純函式）

**Files:**
- Create: `components/v2/expenses/swipe-math.ts`
- Create: `tests/components/v2/swipe-math.test.ts`

- [ ] **Step 1: 建立 `tests/components/v2/swipe-math.test.ts`（完整程式碼）**

```ts
import { describe, it, expect } from "vitest"
import { nextOffset, SWIPE_OPEN } from "@/components/v2/expenses/swipe-math"

describe("nextOffset", () => {
  it("snaps back when movement is below the threshold", () => {
    expect(nextOffset(100, 130, 0)).toBe(0)
    expect(nextOffset(100, 70, 0)).toBe(0)
  })

  it("opens to the left when dragged left past the threshold", () => {
    expect(nextOffset(100, 50, 0)).toBe(-SWIPE_OPEN)
  })

  it("opens to the right when dragged right past the threshold", () => {
    expect(nextOffset(100, 150, 0)).toBe(SWIPE_OPEN)
  })

  it("closes when tapping an already open row", () => {
    expect(nextOffset(100, 100, SWIPE_OPEN)).toBe(0)
    expect(nextOffset(100, 100, -SWIPE_OPEN)).toBe(0)
  })

  it("keeps the open side when dragged further", () => {
    expect(nextOffset(100, 30, -SWIPE_OPEN)).toBe(-SWIPE_OPEN)
    expect(nextOffset(100, 170, SWIPE_OPEN)).toBe(SWIPE_OPEN)
  })

  it("clamps to the open width for long drags", () => {
    expect(nextOffset(100, -900, 0)).toBe(-SWIPE_OPEN)
    expect(nextOffset(100, 900, 0)).toBe(SWIPE_OPEN)
  })

  it("ignores a gesture without horizontal movement", () => {
    expect(nextOffset(100, 100, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/swipe-math.test.ts`
Expected: FAIL（找不到模組 `@/components/v2/expenses/swipe-math`）。

- [ ] **Step 3: 建立 `components/v2/expenses/swipe-math.ts`（完整程式碼）**

```ts
export const SWIPE_OPEN = 72
export const SWIPE_THRESHOLD = 40

/** Resolves the resting offset (px) after a released horizontal swipe. */
export function nextOffset(startX: number, currentX: number, open: number): number {
  const dx = currentX - startX
  if (open !== 0) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) return 0
    return dx < 0 ? -SWIPE_OPEN : SWIPE_OPEN
  }
  if (dx <= -SWIPE_THRESHOLD) return -SWIPE_OPEN
  if (dx >= SWIPE_THRESHOLD) return SWIPE_OPEN
  return 0
}
```

- [ ] **Step 4: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/swipe-math.test.ts`
Expected: PASS。

- [ ] **Step 5: lint 並 commit**

```bash
npm run lint
git add components/v2/expenses/swipe-math.ts tests/components/v2/swipe-math.test.ts
git commit -m "feat: Add swipe offset math for v2 expense delete"
```

---

## Task 3.3：`swipe-row.tsx`（D21 無障礙）

**Files:**
- Create: `components/v2/expenses/swipe-row.tsx`
- Create: `tests/components/v2/swipe-row.test.tsx`

- [ ] **Step 1: 建立 `tests/components/v2/swipe-row.test.tsx`（完整程式碼）**

```tsx
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SwipeRow } from "@/components/v2/expenses/swipe-row"

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    // jsdom has no PointerEvent; MouseEvent carries clientX/clientY.
    ;(window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class PointerEvent extends MouseEvent {}
  }
})

function renderRow(props: Partial<Parameters<typeof SwipeRow>[0]> = {}) {
  const onDelete = vi.fn()
  render(
    <SwipeRow onDelete={onDelete} {...props}>
      <div>card body</div>
    </SwipeRow>
  )
  return { onDelete }
}

describe("SwipeRow", () => {
  it("always renders the delete button and keeps it focusable", () => {
    renderRow()
    const buttons = screen.getAllByRole("button", { name: "刪除" })
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((b) => {
      expect(b).not.toHaveAttribute("aria-hidden", "true")
      expect(b).not.toHaveAttribute("tabindex", "-1")
      expect(b).not.toHaveStyle({ display: "none" })
    })
  })

  it("expands when the delete button receives focus and collapses on blur", () => {
    renderRow()
    const button = screen.getAllByRole("button", { name: "刪除" })[0]
    const layer = screen.getByText("card body").parentElement!
    fireEvent.focus(button)
    expect(layer).toHaveStyle({ transform: "translateX(72px)" })
    fireEvent.blur(button)
    expect(layer).toHaveStyle({ transform: "translateX(0px)" })
  })

  it("disables the delete button and swipe when disabled", () => {
    renderRow({ disabled: true })
    screen.getAllByRole("button", { name: "刪除" }).forEach((b) => expect(b).toBeDisabled())
  })

  it("calls onDelete when the delete button is clicked", () => {
    const { onDelete } = renderRow()
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    expect(onDelete).toHaveBeenCalled()
  })

  it("opens the right action after a left swipe past the threshold", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 100, clientY: 110 })
    fireEvent.pointerUp(layer, { clientX: 100, clientY: 110 })
    expect(layer).toHaveStyle({ transform: "translateX(-72px)" })
  })

  it("opens the left action after a right swipe past the threshold", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 200, clientY: 110 })
    fireEvent.pointerUp(layer, { clientX: 200, clientY: 110 })
    expect(layer).toHaveStyle({ transform: "translateX(72px)" })
  })

  it("ignores vertical drags", () => {
    renderRow()
    const layer = screen.getByText("card body").parentElement!
    fireEvent.pointerDown(layer, { clientX: 200, clientY: 100 })
    fireEvent.pointerMove(layer, { clientX: 210, clientY: 400 })
    fireEvent.pointerUp(layer, { clientX: 210, clientY: 400 })
    expect(layer).toHaveStyle({ transform: "translateX(0px)" })
  })
})
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/swipe-row.test.tsx`
Expected: FAIL（找不到模組 `@/components/v2/expenses/swipe-row`）。

- [ ] **Step 3: 建立 `components/v2/expenses/swipe-row.tsx`（完整程式碼）**

```tsx
"use client"

import { useRef, useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { nextOffset, SWIPE_OPEN } from "./swipe-math"

interface SwipeRowProps {
  onDelete: () => void
  disabled?: boolean
  children: ReactNode
}

export function SwipeRow({ onDelete, disabled = false, children }: SwipeRowProps) {
  const [offset, setOffset] = useState(0)
  const start = useRef<{ x: number; y: number; vertical: boolean } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return
    start.current = { x: e.clientX, y: e.clientY, vertical: false }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (disabled || !start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.abs(dy) > Math.abs(dx)) start.current.vertical = true
  }

  function onPointerUp(e: React.PointerEvent) {
    if (disabled || !start.current) return
    const { x, vertical } = start.current
    start.current = null
    if (vertical) return
    setOffset(nextOffset(x, e.clientX, offset))
  }

  const action = (side: "left" | "right") => (
    <button
      type="button"
      aria-label="刪除"
      disabled={disabled}
      onFocus={() => !disabled && setOffset(side === "left" ? SWIPE_OPEN : -SWIPE_OPEN)}
      onBlur={() => !disabled && setOffset(0)}
      onClick={onDelete}
      className={`absolute inset-y-0 flex w-[72px] flex-col items-center justify-center gap-1.5 bg-v2-danger text-v2-on-lake disabled:opacity-60 ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-on-lake/20">
        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="text-[11px] font-bold">刪除</span>
    </button>
  )

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      {action("left")}
      {action("right")}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative z-10"
        style={{ transform: `translateX(${offset}px)`, transition: "transform .25s ease", touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/swipe-row.test.tsx tests/components/v2/swipe-math.test.ts tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: lint 並 commit**

```bash
npm run lint
git add components/v2/expenses/swipe-row.tsx tests/components/v2/swipe-row.test.tsx
git commit -m "feat: Add swipe row component for v2 expense delete"
```

---

## Task 3.4：A6b 支出卡 + 摘要卡 + 一律顯示的頁尾（D26）+ 容器覆蓋率

**Files:**
- Modify: `components/v2/expenses/expense-summary-card.tsx`
- Modify: `components/v2/expenses/expense-card.tsx`
- Modify: `components/v2/expenses/expenses-v2-view.tsx`
- Modify: `components/v2/expenses/expenses-v2.tsx`（移除 view 的兩個 props）
- Replace: `tests/components/v2/expenses-v2.test.tsx`

- [ ] **Step 1: 以完整內容替換 `tests/components/v2/expenses-v2.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { ExpensesV2View } from "@/components/v2/expenses/expenses-v2-view"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/v2/quick-expense/quick-expense-v2", () => ({ QuickExpenseV2: () => null }))
vi.mock("@/components/expense/notify-line-checkbox", () => ({ NotifyLineCheckbox: () => null }))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/components/ui/confirm-delete-dialog", () => ({ ConfirmDeleteDialog: () => null }))

const mocks = vi.hoisted(() => ({
  projectData: vi.fn(),
  projectExpenses: vi.fn(),
  currencyConversion: vi.fn(),
  expenseFilters: vi.fn(),
}))
vi.mock("@/lib/hooks", () => ({
  useProjectData: () => mocks.projectData(),
  useCurrencyConversion: () => mocks.currencyConversion(),
  useExpenseFilters: () => mocks.expenseFilters(),
}))
vi.mock("@/lib/hooks/useProjectExpenses", () => ({ useProjectExpenses: () => mocks.projectExpenses() }))

import { ExpensesV2 } from "@/components/v2/expenses/expenses-v2"

const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min).toISOString()
const now = new Date(2026, 10, 16, 21, 0)
const zhi = { id: "chi", displayName: "志明", userId: null, user: null }
const me = { id: "me", displayName: "Emma", userId: "u1", user: null }
const m2 = { id: "m2", displayName: "小美", userId: null, user: null }
const m3 = { id: "m3", displayName: "佳婷", userId: null, user: null }
const m4 = { id: "m4", displayName: "阿凱", userId: null, user: null }

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
    expect(within(card).getByText("付款日期")).toBeInTheDocument()
    expect(within(card).getByText("11/16")).toBeInTheDocument()
    expect(screen.getByText("TWD 1,280")).toBeInTheDocument()
  })

  it("falls back to the category label, shows location, payer as 我 and head count", () => {
    renderView()
    const card = screen.getByRole("link", { name: /交通/ })
    expect(within(card).getByText("京都市內")).toBeInTheDocument()
    expect(within(card).getByText("我付款")).toBeInTheDocument()
    expect(within(card).getByText("共2人分攤")).toBeInTheDocument()
  })

  it("always renders the footer, using placeholders without location or image", () => {
    renderView()
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(within(card).getByText("未填寫地點")).toBeInTheDocument()
    expect(within(card).getByLabelText("未附明細圖片")).toBeInTheDocument()
  })

  it("renders a card with no description and a single participant", () => {
    const single = expense({ id: "e5", description: null, category: "food", location: null, image: null, participants: [{ id: "p1", shareAmount: 100, member: zhi }] })
    renderView({ expenses: [single], allCount: 1, summary: { total: 100, count: 1, average: 100 } })
    const card = screen.getByRole("link", { name: /餐飲/ })
    expect(within(card).getByText("共1人分攤")).toBeInTheDocument()
    expect(within(card).getByText("未填寫地點")).toBeInTheDocument()
  })

  it("shows a +N overflow when there are more than three participants", () => {
    const many = expense({ id: "e6", participants: [me, m2, m3, m4].map((m, i) => ({ id: `p${i}`, shareAmount: 100, member: m })) })
    renderView({ expenses: [many], allCount: 1, summary: { total: 400, count: 1, average: 400 } })
    const card = screen.getByRole("link", { name: /一蘭拉麵晚餐/ })
    expect(within(card).getByText("+1")).toBeInTheDocument()
    expect(within(card).getByText("共4人分攤")).toBeInTheDocument()
  })

  it("shows the count line and wires batch, delete, image and voice", () => {
    const props = renderView()
    expect(screen.getByText(/顯示/).textContent).toBe("顯示 2 / 2 筆")
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    fireEvent.click(screen.getAllByRole("button", { name: "刪除" })[0])
    fireEvent.click(screen.getByRole("button", { name: "查看圖片" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(props.onToggleSelectMode).toHaveBeenCalled()
    expect(props.onRequestDelete).toHaveBeenCalledWith(expenses[0])
    expect(props.onViewImage).toHaveBeenCalledWith("https://example.com/r.jpg")
    expect(props.onVoice).toHaveBeenCalled()
  })

  it("does not render its own clear button", () => {
    renderView()
    expect(screen.queryByText("清除")).not.toBeInTheDocument()
  })

  it("switches cards to checkboxes in select mode", () => {
    const props = renderView({ selectMode: true, selectedIds: new Set(["e1"]) })
    const deletes = screen.getAllByRole("button", { name: "刪除" })
    expect(deletes).toHaveLength(4)
    deletes.forEach((d) => expect(d).toBeDisabled())
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

describe("ExpensesV2 container", () => {
  beforeEach(() => {
    mocks.projectData.mockReset().mockReturnValue({
      project: { name: "東京", startDate: null, endDate: null, expenses: [] },
      members: [],
      loading: false,
      projectCurrency: "TWD",
      customRates: {},
      precision: 2,
    })
    mocks.projectExpenses.mockReset().mockReturnValue({
      expenses: [],
      loading: false,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    mocks.currencyConversion.mockReset().mockReturnValue({ convert: (n: number) => n })
    mocks.expenseFilters.mockReset().mockReturnValue({
      filters: {
        searchQuery: "",
        selectedCategories: new Set<string>(),
        selectedPayers: new Set<string>(),
        selectedParticipants: new Set<string>(),
        selectedCurrencies: new Set<string>(),
        amountRange: [0, 0] as [number, number],
        createdDateRange: undefined,
        expenseDateRange: undefined,
      },
      filteredExpenses: [],
      hasActiveFilters: false,
      setSearchQuery: vi.fn(),
      toggleCategory: vi.fn(),
      setCategories: vi.fn(),
      togglePayer: vi.fn(),
      setPayers: vi.fn(),
      toggleParticipant: vi.fn(),
      setParticipants: vi.fn(),
      toggleCurrency: vi.fn(),
      setCurrencies: vi.fn(),
      setAmountRange: vi.fn(),
      setCreatedDateRange: vi.fn(),
      setExpenseDateRange: vi.fn(),
      clearFilters: vi.fn(),
      uniquePayers: [],
      uniqueParticipants: [],
      uniqueCurrencies: ["TWD"],
      maxAmount: 0,
    })
  })

  it("renders the list view through the container", () => {
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.getByRole("heading", { level: 1, name: "全部支出" })).toBeInTheDocument()
    expect(screen.getByText("尚無支出記錄")).toBeInTheDocument()
  })

  it("renders the loading skeleton", () => {
    mocks.projectExpenses.mockReturnValue({
      expenses: [],
      loading: true,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn(),
      batchDeleteExpenses: vi.fn(),
    })
    render(<ExpensesV2 projectId="p1" />)
    expect(screen.getByTestId("v2-expenses-skeleton")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/expenses-v2.test.tsx`
Expected: FAIL（找不到 `付款日期`、`未填寫地點`、`我付款`、`共N人分攤`、`+1`；清除連結仍在；select mode 刪除鈕不存在等）。

- [ ] **Step 3: 修改 `components/v2/expenses/expense-summary-card.tsx`**

把總金額的 class：

```tsx
      <p className="mt-1 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-lake">
```

改成：

```tsx
      <p className="mt-1 font-v2-serif text-2xl font-bold leading-8 tabular-nums text-v2-ink">
```

- [ ] **Step 4: 以完整內容替換 `components/v2/expenses/expense-card.tsx`**

```tsx
import Link from "next/link"
import { CalendarDays, ChevronRight, Image, MapPin } from "lucide-react"
import { CATEGORY_ICONS, getCategoryLabel } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { ProjectExpense } from "@/lib/hooks/useProjectExpenses"
import { CATEGORY_TONES, categoryKey } from "@/components/v2/category-style"
import { SwipeRow } from "./swipe-row"

const PARTICIPANT_TONES = ["bg-v2-lake", "bg-v2-coral", "bg-v2-plum"]

const monthDay = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const initial = (name: string) => name.charAt(0)

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
  const members = expense.participants.map((p) => p.member)
  const shown = members.slice(0, 3)
  const overflow = members.length - shown.length

  const body = (
    <div className="flex items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${CATEGORY_TONES[key]}`} aria-hidden="true">
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold leading-[19px]">{title}</h3>
          <span className="flex shrink-0 items-center gap-[3px]">
            <span className="text-sm font-bold tabular-nums text-v2-ink">
              {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
            </span>
            <ChevronRight className="h-3 w-3 text-v2-check" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-[5px] flex items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <CalendarDays className="h-[11px] w-[11px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          <span className="shrink-0 text-[11px] text-v2-ink-subtle">付款日期</span>
          <span className="shrink-0 text-[11px] font-semibold text-v2-ink">{monthDay(expense.expenseDate)}</span>
        </div>
        <div className="mt-[5px] flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-v2-on-lake ${isMe ? "bg-v2-lake" : "bg-v2-coral"}`}
            aria-hidden="true"
          >
            {initial(payerName)}
          </span>
          <span className="shrink-0 text-[11px] font-medium">{isMe ? "我付款" : `${payerName}付款`}</span>
          <span className="h-px w-2 shrink-0 bg-v2-check" aria-hidden="true" />
          <span className="flex shrink-0" aria-hidden="true">
            {shown.map((m, i) => {
              const label = m.id === currentMemberId ? "我" : initial(m.displayName)
              return (
                <span
                  key={m.id}
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-v2-surface text-[6px] font-bold text-v2-on-lake ${PARTICIPANT_TONES[i % PARTICIPANT_TONES.length]} ${i > 0 ? "-ml-[5px]" : ""}`}
                >
                  {label}
                </span>
              )
            })}
            {overflow > 0 && (
              <span className="-ml-[5px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-line text-[6px] font-bold text-v2-ink-muted">
                +{overflow}
              </span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-v2-ink-subtle">共{members.length}人分攤</span>
        </div>
      </div>
    </div>
  )

  const footer = (
    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-v2-line pt-2.5">
      <span className="flex min-w-0 items-center gap-[5px]">
        {expense.location ? (
          <>
            <MapPin className="h-3 w-3 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
            <span className="truncate text-[11px] text-v2-ink-muted">{expense.location}</span>
          </>
        ) : (
          <span className="truncate text-[11px] text-v2-ink-subtle">未填寫地點</span>
        )}
      </span>
      {expense.image && !selectMode ? (
        <button
          type="button"
          aria-label="查看圖片"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onViewImage(expense.image!)
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-v2-lake-border text-v2-lake"
        >
          <Image className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
        </button>
      ) : (
        <span
          aria-label={expense.image ? "已附明細圖片" : "未附明細圖片"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
            expense.image ? "bg-v2-lake-border text-v2-lake" : "bg-v2-line-soft text-v2-check"
          }`}
        >
          <Image className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
        </span>
      )}
    </div>
  )

  const card = (
    <div className="rounded-[14px] border border-v2-line bg-v2-surface p-[11px] shadow-[0_1px_2px_rgba(27,24,21,.05)]">
      {selectMode ? (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(expense.id)}
            aria-label={`選取 ${title}`}
            className="mt-4 h-4 w-4 accent-v2-lake"
          />
          <div className="min-w-0 flex-1">
            {body}
            {footer}
          </div>
        </label>
      ) : (
        <Link href={`/projects/${projectId}/expenses/${expense.id}/edit`} className="block">
          {body}
          {footer}
        </Link>
      )}
    </div>
  )

  return (
    <div className="mb-2">
      <SwipeRow onDelete={() => onRequestDelete(expense)} disabled={selectMode}>
        {card}
      </SwipeRow>
    </div>
  )
}
```

- [ ] **Step 5: 修改 `components/v2/expenses/expenses-v2-view.tsx`**

(a) 在 `ExpensesV2ViewProps` 介面中刪除這兩行：

```tsx
  filterBar: ReactNode
  hasActiveFilters: boolean
  onClearFilters: () => void
```

改成：

```tsx
  filterBar: ReactNode
```

(b) 把整個計數列區塊從：

```tsx
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
```

改成（只留「批次」按鈕）：

```tsx
      <div className="mx-4 mt-2.5 flex items-center justify-between">
        <span className="text-xs text-v2-ink-muted">
          顯示 <b className="text-v2-ink">{props.expenses.length}</b> / {props.allCount} 筆
        </span>
        <button
          type="button"
          onClick={props.onToggleSelectMode}
          className="inline-flex items-center gap-1 rounded-full border border-v2-line bg-v2-surface px-3 py-1.5 text-xs font-bold"
        >
          {props.selectMode ? <X className="h-3 w-3" aria-hidden="true" /> : <CheckSquare className="h-3 w-3" aria-hidden="true" />}
          {props.selectMode ? "取消" : "批次"}
        </button>
      </div>
```

(c) 把日期分組標籤：

```tsx
              <p className="mb-2 text-xs font-semibold text-v2-ink-subtle">{group.label}</p>
```

改成：

```tsx
              <p className="mb-1.5 text-[11px] font-bold text-v2-ink-subtle">{group.label}</p>
```

- [ ] **Step 6: 修改 `components/v2/expenses/expenses-v2.tsx`**

在 `<ExpensesV2View ...>` 的 props 中刪除這兩行：

```tsx
            hasActiveFilters={f.hasActiveFilters}
            onClearFilters={f.clearFilters}
```

- [ ] **Step 7: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/expenses-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 8: lint 並 commit**

```bash
npm run lint
git add components/v2/expenses/expense-summary-card.tsx components/v2/expenses/expense-card.tsx components/v2/expenses/expenses-v2-view.tsx components/v2/expenses/expenses-v2.tsx tests/components/v2/expenses-v2.test.tsx
git commit -m "feat: Restyle v2 expense card and always render its footer"
```

---

## Task 3.5：A6b 篩選下拉（自建 inline panel，不用 Portal）+ 移除建立日期

**Files:**
- Create: `components/v2/use-dismiss.ts`
- Create: `components/v2/expenses/filter-popover.tsx`
- Create: `components/v2/expenses/filter-panels.tsx`
- Replace: `components/v2/expenses/expense-filter-bar.tsx`
- Modify: `components/v2/expenses/expenses-v2.tsx`（傳新 props）
- Create: `tests/components/v2/filter-panels.test.tsx`

- [ ] **Step 1: 建立 `tests/components/v2/filter-panels.test.tsx`（完整程式碼）**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ExpenseFilterBar } from "@/components/v2/expenses/expense-filter-bar"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"

const baseFilters: ExpenseFilters = {
  searchQuery: "",
  selectedCategories: new Set(),
  selectedPayers: new Set(),
  selectedParticipants: new Set(),
  selectedCurrencies: new Set(),
  amountRange: [0, 0],
  createdDateRange: undefined,
  expenseDateRange: undefined,
}

function renderBar(overrides: Partial<Parameters<typeof ExpenseFilterBar>[0]> = {}) {
  const props: Parameters<typeof ExpenseFilterBar>[0] = {
    filters: baseFilters,
    currency: "TWD",
    maxAmount: 6400,
    payers: [
      { id: "me", displayName: "我" },
      { id: "chi", displayName: "志明" },
    ],
    participants: [
      { id: "me", displayName: "我" },
      { id: "chi", displayName: "志明" },
    ],
    currencies: ["TWD"],
    hasActiveFilters: false,
    currentMemberId: "me",
    onSearch: vi.fn(),
    onToggleCategory: vi.fn(),
    onClearCategories: vi.fn(),
    onSetPayers: vi.fn(),
    onClearPayers: vi.fn(),
    onToggleParticipant: vi.fn(),
    onClearParticipants: vi.fn(),
    onToggleCurrency: vi.fn(),
    onClearCurrencies: vi.fn(),
    onAmountRange: vi.fn(),
    onExpenseRange: vi.fn(),
    onClearFilters: vi.fn(),
    ...overrides,
  }
  render(<ExpenseFilterBar {...props} />)
  return props
}

describe("ExpenseFilterBar panels", () => {
  it("searches by text", () => {
    const props = renderBar()
    fireEvent.change(screen.getByLabelText("搜尋支出描述"), { target: { value: "拉麵" } })
    expect(props.onSearch).toHaveBeenCalledWith("拉麵")
  })

  it("opens the category panel with one checkbox per category", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.getAllByRole("checkbox")).toHaveLength(8)
  })

  it("toggles a category and clears the panel", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "餐飲" }))
    expect(props.onToggleCategory).toHaveBeenCalledWith("food")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCategories).toHaveBeenCalled()
  })

  it("single-selects a payer and clears", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    fireEvent.click(screen.getByRole("radio", { name: "志明" }))
    expect(props.onSetPayers).toHaveBeenCalledWith(new Set(["chi"]))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearPayers).toHaveBeenCalled()
  })

  it("shows the empty state when there are no payers", () => {
    renderBar({ payers: [] })
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByText("沒有資料")).toBeInTheDocument()
  })

  it("multi-selects participants", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "志明" }))
    expect(props.onToggleParticipant).toHaveBeenCalledWith("chi")
  })

  it("toggles a currency and clears", () => {
    const props = renderBar({ currencies: ["TWD", "JPY"] })
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "JPY" }))
    expect(props.onToggleCurrency).toHaveBeenCalledWith("JPY")
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onClearCurrencies).toHaveBeenCalled()
  })

  it("changes the amount range and clears", () => {
    const props = renderBar()
    fireEvent.click(screen.getByRole("button", { name: /金額/ }))
    fireEvent.change(screen.getByLabelText("最低金額"), { target: { value: "100" } })
    expect(props.onAmountRange).toHaveBeenCalledWith([100, 0])
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onAmountRange).toHaveBeenCalledWith([0, 0])
  })

  it("clears the payment date range", () => {
    const props = renderBar({
      filters: { ...baseFilters, expenseDateRange: { from: new Date(2026, 10, 12), to: new Date(2026, 10, 16) } },
    })
    fireEvent.click(screen.getByRole("button", { name: /付款日期/ }))
    fireEvent.click(screen.getByRole("button", { name: "清除" }))
    expect(props.onExpenseRange).toHaveBeenCalledWith(undefined)
  })

  it("closes the open panel on outside click", () => {
    renderBar()
    const trigger = screen.getByRole("button", { name: /類別/ })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.mouseDown(document.body)
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
  })

  it("closes the open panel on Escape", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps only one panel open at a time", () => {
    renderBar()
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByRole("button", { name: /類別/ })).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: /付款人/ })).toHaveAttribute("aria-expanded", "true")
  })

  it("renders checked controls for preselected filters", () => {
    const props = renderBar({
      filters: {
        ...baseFilters,
        selectedCategories: new Set(["food"]),
        selectedPayers: new Set(["chi"]),
        selectedParticipants: new Set(["me"]),
        selectedCurrencies: new Set(["JPY"]),
      },
      currencies: ["TWD", "JPY"],
    })
    fireEvent.click(screen.getByRole("button", { name: /類別/ }))
    expect(screen.getByRole("checkbox", { name: "餐飲" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /付款人/ }))
    expect(screen.getByRole("radio", { name: "志明" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /參與者/ }))
    expect(screen.getByRole("checkbox", { name: "我" })).toHaveAttribute("aria-checked", "true")
    fireEvent.mouseDown(document.body)
    fireEvent.click(screen.getByRole("button", { name: /幣別/ }))
    expect(screen.getByRole("checkbox", { name: "JPY" })).toHaveAttribute("aria-checked", "true")
    expect(props.filters.selectedPayers).toBeDefined()
  })

  it("shows 移除篩選 only when filters are active", () => {
    renderBar()
    expect(screen.queryByRole("button", { name: /移除篩選/ })).not.toBeInTheDocument()
    renderBar({ hasActiveFilters: true })
    expect(screen.getAllByRole("button", { name: /移除篩選/ })).toHaveLength(1)
  })

  it("calls onClearFilters from the chip", () => {
    const props = renderBar({ hasActiveFilters: true })
    fireEvent.click(screen.getByRole("button", { name: /移除篩選/ }))
    expect(props.onClearFilters).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/filter-panels.test.tsx`
Expected: FAIL（舊 bar 用 Radix，面板經 Portal，`getAllByRole("checkbox")` 找不到、`aria-expanded` 不存在等）。

- [ ] **Step 3: 建立 `components/v2/use-dismiss.ts`（完整程式碼）**

> 註：不使用 `--v2-sand-hover`，故 `app/globals.css` 不動。開啟中未啟用的觸發鍵底色用既有 `bg-v2-sand`（gap 認可的 accepted deviation）。

```ts
"use client"

import { useEffect, type RefObject } from "react"

/** Calls onDismiss on outside mousedown or Escape while active. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    function handleDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss()
    }
    document.addEventListener("mousedown", handleDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [ref, onDismiss, active])
}
```

- [ ] **Step 4: 建立 `components/v2/expenses/filter-panels.tsx`（完整程式碼）**

```tsx
"use client"

import type { DateRange } from "react-day-picker"
import { Check, CircleX } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/constants/expenses"
import { formatCurrency } from "@/lib/constants/currencies"
import { CATEGORY_TONES } from "@/components/v2/category-style"

function PanelHeader({ title, onClear }: { title: string; onClear: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <p className="m-0 text-[10px] font-bold text-v2-ink-subtle">{title}</p>
        <button type="button" onClick={onClear} className="flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger">
          <CircleX className="h-[11px] w-[11px]" strokeWidth={2.4} aria-hidden="true" />
          清除
        </button>
      </div>
      <div className="h-px bg-v2-line-soft" />
    </>
  )
}

function CheckBox({ checked, round }: { checked: boolean; round?: boolean }) {
  return (
    <span
      className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center ${
        round ? "rounded-full" : "rounded-[4px]"
      } ${checked ? "bg-v2-lake" : "border-[1.5px] border-v2-line bg-v2-surface"}`}
    >
      {checked && <Check className="h-2.5 w-2.5 text-v2-on-lake" strokeWidth={3} aria-hidden="true" />}
    </span>
  )
}

export function CategoryPanel({ selected, onToggle, onClear }: { selected: Set<string>; onToggle: (category: string) => void; onClear: () => void }) {
  return (
    <>
      <PanelHeader title="選擇類別（可複選）" onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {EXPENSE_CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={selected.has(key)}
            aria-label={CATEGORY_LABELS[key]}
            onClick={() => onToggle(key)}
            className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
          >
            <CheckBox checked={selected.has(key)} />
            <span className={`h-[18px] w-[18px] shrink-0 rounded-[5px] ${CATEGORY_TONES[key]}`} aria-hidden="true" />
            <span className="text-left">{CATEGORY_LABELS[key]}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function MemberPanel({
  title,
  members,
  selected,
  onToggle,
  onClear,
  round = false,
}: {
  title: string
  members: { id: string; displayName: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
  round?: boolean
}) {
  return (
    <>
      <PanelHeader title={title} onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {members.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-v2-ink-muted">沒有資料</div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              type="button"
              role={round ? "radio" : "checkbox"}
              aria-checked={selected.has(member.id)}
              aria-label={member.displayName}
              onClick={() => onToggle(member.id)}
              className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
            >
              <CheckBox checked={selected.has(member.id)} round={round} />
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-v2-lake-tint text-[8px] font-bold text-v2-lake" aria-hidden="true">
                {member.displayName.charAt(0)}
              </span>
              <span className="text-left">{member.displayName}</span>
            </button>
          ))
        )}
      </div>
    </>
  )
}

export function CurrencyPanel({
  currencies,
  selected,
  onToggle,
  onClear,
}: {
  currencies: string[]
  selected: Set<string>
  onToggle: (code: string) => void
  onClear: () => void
}) {
  return (
    <>
      <PanelHeader title="選擇幣別" onClear={onClear} />
      <div className="v2-scroll max-h-44 overflow-y-auto">
        {currencies.map((code) => (
          <button
            key={code}
            type="button"
            role="checkbox"
            aria-checked={selected.has(code)}
            aria-label={code}
            onClick={() => onToggle(code)}
            className="flex w-full items-center gap-2 px-2.5 py-[7px] text-xs"
          >
            <CheckBox checked={selected.has(code)} />
            <span className="text-left">{code}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function AmountPanel({
  range,
  max,
  currency,
  onChange,
  onClear,
}: {
  range: [number, number]
  max: number
  currency: string
  onChange: (range: [number, number]) => void
  onClear: () => void
}) {
  const upper = max || 10000
  const step = Math.max(1, Math.floor(upper / 100))
  return (
    <>
      <PanelHeader title="設定金額區間" onClear={onClear} />
      <div className="px-2.5 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-v2-ink">
          <span>{formatCurrency(range[0], currency)}</span>
          <span>{range[1] === 0 ? formatCurrency(upper, currency) : formatCurrency(range[1], currency)}</span>
        </div>
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={range[0]}
            aria-label="最低金額"
            onChange={(e) => onChange([Number(e.target.value), range[1]])}
            className="h-1 w-full appearance-none rounded-full accent-v2-lake"
          />
          <input
            type="range"
            min={0}
            max={upper}
            step={step}
            value={range[1]}
            aria-label="最高金額"
            onChange={(e) => onChange([range[0], Number(e.target.value)])}
            className="h-1 w-full appearance-none rounded-full accent-v2-lake"
          />
        </div>
      </div>
    </>
  )
}

export function DatePanel({ range, onChange }: { range: DateRange | undefined; onChange: (range: DateRange | undefined) => void }) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-v2-line px-2.5 py-[7px]">
        <span className="text-[11px] font-semibold text-v2-ink">付款日期</span>
        <button type="button" onClick={() => onChange(undefined)} className="rounded-[5px] px-[5px] py-0.5 text-[10px] text-v2-ink-muted">
          清除
        </button>
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <Calendar mode="range" numberOfMonths={1} selected={range} onSelect={onChange} />
      </div>
    </>
  )
}
```

- [ ] **Step 5: 建立 `components/v2/expenses/filter-popover.tsx`（完整程式碼）**

```tsx
"use client"

import { useRef, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { useDismiss } from "@/components/v2/use-dismiss"

interface FilterPopoverProps {
  label: string
  icon: ReactNode
  count: number
  open: boolean
  onToggle: () => void
  align?: "left" | "right"
  widthClass: string
  children: ReactNode
}

export function FilterPopover({ label, icon, count, open, onToggle, align = "left", widthClass, children }: FilterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onToggle, open)
  const active = count > 0
  const stateClass = active
    ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft font-bold text-v2-lake"
    : open
      ? "border-[1.5px] border-v2-ink-subtle bg-v2-sand font-semibold text-v2-ink"
      : "border border-v2-line bg-v2-surface font-semibold text-v2-ink"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
        className={`flex w-full items-center gap-[5px] rounded-[10px] px-2.5 py-[9px] text-xs ${stateClass}`}
      >
        <span className={active ? "text-v2-lake" : open ? "text-v2-ink" : "text-v2-ink-subtle"}>{icon}</span>
        <span className="flex-1 truncate text-left">{label}</span>
        {active ? (
          <span className="flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-full bg-v2-lake px-[3px] text-[9px] text-v2-on-lake">
            {count}
          </span>
        ) : (
          <ChevronDown className={`h-3 w-3 shrink-0 ${open ? "text-v2-ink" : "text-v2-ink-subtle"}`} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          className={`absolute top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-v2-line bg-v2-surface shadow-[0_10px_28px_rgba(27,24,21,.18)] ${
            align === "right" ? "right-0" : "left-0"
          } ${widthClass}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: 以完整內容替換 `components/v2/expenses/expense-filter-bar.tsx`**

```tsx
"use client"

import { useState, type ReactNode } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { CalendarDays, CircleX, Coins, DollarSign, Filter, Search, User, Users } from "lucide-react"
import type { ExpenseFilters } from "@/lib/hooks/useExpenseFilters"
import { FilterPopover } from "./filter-popover"
import { AmountPanel, CategoryPanel, CurrencyPanel, DatePanel, MemberPanel } from "./filter-panels"

interface ExpenseFilterBarProps {
  filters: ExpenseFilters
  currency: string
  maxAmount: number
  payers: { id: string; displayName: string }[]
  participants: { id: string; displayName: string }[]
  currencies: string[]
  hasActiveFilters: boolean
  currentMemberId?: string | null
  onSearch: (query: string) => void
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
  onSetPayers: (ids: Set<string>) => void
  onClearPayers: () => void
  onToggleParticipant: (id: string) => void
  onClearParticipants: () => void
  onToggleCurrency: (code: string) => void
  onClearCurrencies: () => void
  onAmountRange: (range: [number, number]) => void
  onExpenseRange: (range: DateRange | undefined) => void
  onClearFilters: () => void
}

function rangeLabel(range: DateRange | undefined, fallback: string): string {
  if (!range?.from) return fallback
  return range.to ? `${format(range.from, "M/d")}~${format(range.to, "M/d")}` : `${format(range.from, "M/d")}~`
}

const icon = "h-3.5 w-3.5 shrink-0"

export function ExpenseFilterBar(props: ExpenseFilterBarProps) {
  const { filters } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const amountActive = filters.amountRange[0] > 0 || filters.amountRange[1] > 0 ? 1 : 0
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id))
  const members = (list: { id: string; displayName: string }[]) =>
    list.map((m) => ({ id: m.id, displayName: m.id === props.currentMemberId ? "我" : m.displayName }))

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
        <FilterPopover label="類別" icon={<Filter className={icon} />} count={filters.selectedCategories.size} open={openId === "category"} onToggle={() => toggle("category")} widthClass="w-[232px]">
          <CategoryPanel selected={filters.selectedCategories} onToggle={props.onToggleCategory} onClear={props.onClearCategories} />
        </FilterPopover>

        <FilterPopover label="付款人" icon={<User className={icon} />} count={filters.selectedPayers.size} open={openId === "payer"} onToggle={() => toggle("payer")} widthClass="w-[184px]">
          <MemberPanel
            title="選擇付款人"
            members={members(props.payers)}
            selected={filters.selectedPayers}
            onToggle={(id) => props.onSetPayers(filters.selectedPayers.has(id) ? new Set() : new Set([id]))}
            onClear={props.onClearPayers}
            round
          />
        </FilterPopover>

        <FilterPopover label="參與者" icon={<Users className={icon} />} count={filters.selectedParticipants.size} open={openId === "participant"} onToggle={() => toggle("participant")} align="right" widthClass="w-[190px]">
          <MemberPanel title="選擇參與者（可複選）" members={members(props.participants)} selected={filters.selectedParticipants} onToggle={props.onToggleParticipant} onClear={props.onClearParticipants} />
        </FilterPopover>

        {props.currencies.length > 1 && (
          <FilterPopover label="幣別" icon={<Coins className={icon} />} count={filters.selectedCurrencies.size} open={openId === "currency"} onToggle={() => toggle("currency")} widthClass="w-[150px]">
            <CurrencyPanel currencies={props.currencies} selected={filters.selectedCurrencies} onToggle={props.onToggleCurrency} onClear={props.onClearCurrencies} />
          </FilterPopover>
        )}

        <FilterPopover label="金額" icon={<DollarSign className={icon} />} count={amountActive} open={openId === "amount"} onToggle={() => toggle("amount")} widthClass="w-[230px]">
          <AmountPanel range={filters.amountRange} max={props.maxAmount} currency={props.currency} onChange={props.onAmountRange} onClear={() => props.onAmountRange([0, 0])} />
        </FilterPopover>

        <FilterPopover label={rangeLabel(filters.expenseDateRange, "付款日期")} icon={<CalendarDays className={icon} />} count={filters.expenseDateRange?.from ? 1 : 0} open={openId === "date"} onToggle={() => toggle("date")} align="right" widthClass="w-[236px]">
          <DatePanel range={filters.expenseDateRange} onChange={props.onExpenseRange} />
        </FilterPopover>

        {props.hasActiveFilters && (
          <button
            type="button"
            onClick={props.onClearFilters}
            className="flex items-center gap-[5px] rounded-[10px] border border-dashed border-v2-danger-edge bg-v2-danger-wash px-2.5 py-[9px] text-xs font-semibold text-v2-danger"
          >
            <CircleX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate text-left">移除篩選</span>
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 7: 修改 `components/v2/expenses/expenses-v2.tsx` 的 `<ExpenseFilterBar>` 傳入新 props**

把整個 `filterBar={<ExpenseFilterBar ... />}` 區塊替換為：

```tsx
            filterBar={
              <ExpenseFilterBar
                filters={f.filters}
                currency={projectCurrency}
                maxAmount={f.maxAmount}
                payers={f.uniquePayers}
                participants={f.uniqueParticipants}
                currencies={f.uniqueCurrencies}
                hasActiveFilters={f.hasActiveFilters}
                currentMemberId={currentMemberId}
                onSearch={f.setSearchQuery}
                onToggleCategory={f.toggleCategory}
                onClearCategories={() => f.setCategories(new Set())}
                onSetPayers={f.setPayers}
                onClearPayers={() => f.setPayers(new Set())}
                onToggleParticipant={f.toggleParticipant}
                onClearParticipants={() => f.setParticipants(new Set())}
                onToggleCurrency={f.toggleCurrency}
                onClearCurrencies={() => f.setCurrencies(new Set())}
                onAmountRange={f.setAmountRange}
                onExpenseRange={f.setExpenseDateRange}
                onClearFilters={f.clearFilters}
              />
            }
```

- [ ] **Step 8: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/filter-panels.test.tsx tests/components/v2/expenses-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 9: lint 並 commit**

```bash
npm run lint
git add components/v2/use-dismiss.ts components/v2/expenses/filter-popover.tsx components/v2/expenses/filter-panels.tsx components/v2/expenses/expense-filter-bar.tsx components/v2/expenses/expenses-v2.tsx tests/components/v2/filter-panels.test.tsx
git commit -m "feat: Rebuild v2 expense filter dropdowns as inline panels"
```

---

## Task 3.6：A7b 成員 — section card 化 + 標題 + 連結 + 容器覆蓋率

**Files:**
- Modify: `components/v2/members/members-v2-view.tsx`
- Modify: `components/v2/members/members-v2.tsx`
- Replace: `tests/components/v2/members-v2.test.tsx`

- [ ] **Step 1: 以完整內容替換 `tests/components/v2/members-v2.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react"
import { MembersV2View } from "@/components/v2/members/members-v2-view"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/members/add-member-dialog", () => ({ AddMemberDialog: () => null }))
vi.mock("@/components/project/invite-dialog", () => ({ InviteDialog: () => null }))
vi.mock("@/components/ui/confirm-delete-dialog", async () => {
  const React = await import("react")
  return {
    ConfirmDeleteDialog: (props: { open: boolean; onConfirm: () => void; confirmText?: string }) =>
      props.open ? React.createElement("button", { onClick: props.onConfirm }, props.confirmText ?? "confirm") : null,
  }
})

const mockProjectMembers = vi.fn()
vi.mock("@/lib/hooks/useProjectMembers", () => ({ useProjectMembers: () => mockProjectMembers() }))

import { MembersV2 } from "@/components/v2/members/members-v2"

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
  it("shows the heading, count, badges and emails", () => {
    renderView()
    expect(screen.getByText("成員列表")).toBeInTheDocument()
    expect(screen.getByText("成員組成 · 3 位旅伴")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "前往專案設定修改加入方式" })).toHaveAttribute("href", "/projects/p1/settings")
    const me = screen.getByTestId("member-m1")
    expect(within(me).getByText("建立者")).toBeInTheDocument()
    expect(within(me).getByText("你")).toBeInTheDocument()
    expect(within(me).getByText("emma@example.com")).toBeInTheDocument()
    const kai = screen.getByTestId("member-m3")
    expect(within(kai).getByText("佔位成員")).toBeInTheDocument()
    expect(within(kai).getByText("尚未加入")).toBeInTheDocument()
  })

  it("renders the labelled share and add buttons", () => {
    renderView()
    expect(screen.getByRole("button", { name: "邀請成員" })).toHaveTextContent("分享")
    expect(screen.getByRole("button", { name: "手動新增成員" })).toHaveTextContent("增加成員")
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

describe("MembersV2 container", () => {
  beforeEach(() => {
    mockProjectMembers.mockReset()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("shows a back link when the project is not found", () => {
    mockProjectMembers.mockReturnValue({
      project: null,
      loading: false,
      isOwner: false,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByText("成員")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByText("專案不存在")).toBeInTheDocument()
  })

  it("shows a back link while loading", () => {
    mockProjectMembers.mockReturnValue({
      project: null,
      loading: true,
      isOwner: false,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
    expect(screen.getByTestId("v2-members-skeleton")).toBeInTheDocument()
  })

  it("renders the member list and toggles batch mode", () => {
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    expect(screen.getByText("成員組成 · 3 位旅伴")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    expect(screen.getByRole("button", { name: "移除 0 位" })).toBeInTheDocument()
  })

  it("opens the invite and add dialogs", () => {
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(screen.getByRole("button", { name: "邀請成員" }))
    fireEvent.click(screen.getByRole("button", { name: "手動新增成員" }))
    expect(screen.getByTestId("member-m1")).toBeInTheDocument()
  })

  it("removes a single member after confirm", async () => {
    const removeMember = vi.fn().mockResolvedValue(undefined)
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember,
      batchRemove: vi.fn(),
    })
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("button", { name: "移除小美" }))
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith("m2"))
  })

  it("batch removes selected members", async () => {
    const batchRemove = vi.fn().mockResolvedValue(undefined)
    mockProjectMembers.mockReturnValue({
      project,
      loading: false,
      isOwner: true,
      currentUserId: "u1",
      removing: null,
      refetch: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      batchRemove,
    })
    render(<MembersV2 projectId="p1" />)
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    fireEvent.click(within(screen.getByTestId("member-m2")).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "移除 1 位" }))
    fireEvent.click(screen.getByRole("button", { name: "移除 (1)" }))
    await waitFor(() => expect(batchRemove).toHaveBeenCalledWith(["m2"]))
  })
})
```

- [ ] **Step 2: 跑測試，確認 FAIL**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx`
Expected: FAIL（找不到「成員列表」「成員組成 · 3 位旅伴」「前往專案設定修改加入方式」，分享/增加成員沒有可見文字，容器未覆蓋等）。

- [ ] **Step 3: 以完整內容替換 `components/v2/members/members-v2-view.tsx`**

```tsx
import Link from "next/link"
import { Share2, UserMinus, UserPlus, User } from "lucide-react"
import type { MembersProject } from "@/lib/hooks/useProjectMembers"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

const AVATAR_TONES = [
  "bg-v2-lake-tint text-v2-lake",
  "bg-v2-coral-soft text-v2-coral-strong",
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

const pillButton =
  "inline-flex h-8 items-center gap-[5px] rounded-lg border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-xs font-semibold text-v2-lake"
const badge = "rounded-full px-[7px] py-0.5 text-xs font-bold"

export function MembersV2View(props: MembersV2ViewProps) {
  const { project } = props

  return (
    <>
      <V2TopBar title="成員" backHref={`/projects/${project.id}`} titleClassName="text-[17px] font-semibold" />
      <div className="mx-4 mb-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="m-0 text-[13px] font-bold text-v2-lake">成員列表</p>
          <div className="flex items-center gap-2">
            {props.isOwner && (
              <button type="button" onClick={props.onToggleBatch} className="text-xs font-bold text-v2-link">
                {props.batchMode ? "取消" : "批次"}
              </button>
            )}
            <button type="button" aria-label="邀請成員" title="邀請成員" onClick={props.onInvite} className={pillButton}>
              <Share2 className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
              分享
            </button>
            <button type="button" aria-label="手動新增成員" title="手動新增" onClick={props.onAdd} className={pillButton}>
              <UserPlus className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
              增加成員
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-v2-ink-muted">成員組成 · {project.members.length} 位旅伴</span>
          <Link href={`/projects/${project.id}/settings`} className="text-xs font-medium text-v2-link">
            前往專案設定修改加入方式
          </Link>
        </div>

        {project.members.map((member, i) => {
          const isMe = member.user?.id === props.currentUserId
          const isCreator = member.role === "owner"
          const isPlaceholder = !member.userId
          const canManage = props.isOwner && !isMe
          return (
            <div
              key={member.id}
              data-testid={`member-${member.id}`}
              className={`flex items-center gap-3 ${i < project.members.length - 1 ? "border-b border-v2-line-soft py-3.5" : "pt-3.5"}`}
            >
              {props.batchMode && canManage && (
                <input
                  type="checkbox"
                  checked={props.selected.has(member.id)}
                  onChange={() => props.onToggleSelect(member.id)}
                  aria-label={`選取${member.displayName}`}
                  className="h-4 w-4 shrink-0 accent-v2-lake"
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
                  {isMe && <span className={`${badge} border border-v2-lake-border bg-v2-surface py-px text-v2-lake`}>你</span>}
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

      {props.batchMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-v2-line bg-v2-surface px-4 py-3">
          <button
            type="button"
            disabled={props.selected.size === 0 || props.removing === "batch"}
            onClick={props.onRequestBatchRemove}
            className="mx-auto block w-full max-w-md rounded-full bg-v2-danger py-3 text-[15px] font-bold text-v2-on-lake disabled:opacity-40"
          >
            移除 {props.selected.size} 位
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: 修改 `components/v2/members/members-v2.tsx` 的三處 `V2TopBar`**

(a) loading 分支：

```tsx
        <V2TopBar title="成員" backHref={`/projects/${projectId}`} />
```

改成：

```tsx
        <V2TopBar title="成員" backHref={`/projects/${projectId}`} titleClassName="text-[17px] font-semibold" />
```

(b) not-found 分支：同一行改法（把該分支裡的 `<V2TopBar title="成員" backHref={`/projects/${projectId}`} />` 也加上 `titleClassName="text-[17px] font-semibold"`）。

(c) 不需改：成功畫面由 `MembersV2View` 自己渲染 top bar（Step 3 已含 `titleClassName`）。

> 提醒：兩個 `<V2TopBar ... />` 字串完全相同，使用編輯器時要**兩處都改**（各出現一次，分屬 loading 與 not-found 分支）。

- [ ] **Step 5: 跑測試，確認 PASS**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 6: lint 並 commit**

```bash
npm run lint
git add components/v2/members/members-v2-view.tsx components/v2/members/members-v2.tsx tests/components/v2/members-v2.test.tsx
git commit -m "feat: Align v2 members screen with v20261003 section cards"
```

---

## Task 3.7：覆蓋率補強（expenses ≥ 80%、members ≥ 80%）

**Files:**
- 可能 Modify：`tests/components/v2/expenses-v2.test.tsx`、`tests/components/v2/members-v2.test.tsx`、`tests/components/v2/filter-panels.test.tsx`
- 可能 Modify：對應的 `components/v2/expenses/**`、`components/v2/members/**`

- [ ] **Step 1: 產生覆蓋率並過濾出本 Part 的資料夾**

Run:

```bash
npx vitest run --coverage > /tmp/cov-part3.txt 2>&1
sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-part3.txt | grep -E "components/v2/(expenses|members|settle)|use-dismiss|swipe"
```

Expected（task 全綠後）：
- `components/v2/expenses` Lines ≥ 80。
- `components/v2/members` Lines ≥ 80。
- `components/v2/settle` Lines 不低於 baseline（81.48）。
- 新增檔案（`swipe-math.ts`、`swipe-row.tsx`、`filter-popover.tsx`、`filter-panels.tsx`、`use-dismiss.ts`）若有被量到，Lines ≥ 90。

- [ ] **Step 2: 若不達標，依 `Uncovered Line #s` 欄補測試**

用輸出裡的 `Uncovered Line #s` 找出未覆蓋行，回到對應測試檔加測試（不要改門檻、不要 `.skip`）。常見不足與對應補法：

- `components/v2/expenses/expenses-v2.tsx`：容器互動（切 select mode、單筆刪除、批次刪除、開圖片、開語音）可加：
  ```tsx
  it("toggles select mode and batch bar through the container", () => {
    mocks.projectExpenses.mockReturnValue({
      expenses: [expense({ id: "e1" })],
      loading: false,
      deleting: false,
      canNotifyLine: false,
      refetch: vi.fn(),
      deleteExpense: vi.fn().mockResolvedValue(true),
      batchDeleteExpenses: vi.fn().mockResolvedValue(true),
    })
    mocks.expenseFilters.mockReturnValue({ ...mocks.expenseFilters(), filteredExpenses: [expense({ id: "e1" })] })
    render(<ExpensesV2 projectId="p1" />)
    fireEvent.click(screen.getByRole("button", { name: "批次" }))
    expect(screen.getByRole("button", { name: "刪除 0 筆" })).toBeInTheDocument()
  })
  ```
  （若此測試需要更完整的 mock，照實際 `Uncovered Line #s` 對應補。）
- `components/v2/members/members-v2.tsx`：Task 3.6 已覆蓋 main branch、batch、remove；若仍有缺口，補「非 owner 也渲染列表」的容器測試。
- `components/v2/expenses/expense-filter-bar.tsx`：Task 3.5 的 `filter-panels.test.tsx` 已覆蓋所有 chip；若 currency chip 未覆蓋，於該測試檔加 `currencies: ["TWD", "JPY"]` 的案例。
- `components/v2/expenses/filter-panels.tsx`：確認 CategoryPanel／MemberPanel（round 與非 round、空狀態）／CurrencyPanel／AmountPanel／DatePanel 都被渲染。

- [ ] **Step 3: 重跑到全綠**

Run: `npx vitest run --coverage 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "components/v2/(expenses|members)"`
Expected: 兩個資料夾 Lines ≥ 80，全部測試 PASS。

- [ ] **Step 4: lint 並 commit（若有補測試）**

```bash
npm run lint
git add tests/components/v2
git commit -m "test: Raise v2 expense and member coverage above eighty percent"
```

（若 Step 1 已達標、無檔案變更，跳過 commit，直接進 Task 3.8。）

---

## Task 3.8：Part 3 驗證

- [ ] **Step 1: 只跑本 Part 觸及的測試，確認全綠**

Run:

```bash
npx vitest run tests/components/v2/settle-v2.test.tsx tests/components/v2/swipe-math.test.ts tests/components/v2/swipe-row.test.tsx tests/components/v2/expenses-v2.test.tsx tests/components/v2/filter-panels.test.tsx tests/components/v2/members-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 2: 完整測試**

Run: `npm run test:run`
Expected: 全部 PASS（含 v1 測試）。

- [ ] **Step 3: v1 保護驗證（輸出必須為空）**

Run:

```bash
git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
```

Expected: 無輸出。若有輸出：`git diff 36633e1 -- <檔案>` 檢查，必要時 `git checkout 36633e1 -- <檔案>` 還原後重跑測試，並回報原因。

- [ ] **Step 4: 確認只動了允許的檔案**

Run: `git diff --name-only 36633e1`
Expected: 每行都以 `components/v2/`、`tests/`、`docs/`、`design/` 開頭，或剛好是 `app/globals.css`、`lib/covers.ts`。出現其他路徑 → STOP and report。

- [ ] **Step 5: lint 與 build**

Run: `npm run lint && npm run build`
Expected: 兩者成功。

- [ ] **Step 6: 覆蓋率總結**

Run:

```bash
npx vitest run --coverage > /tmp/cov-part3-final.txt 2>&1
sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-part3-final.txt | grep -E "components/v2/(expenses|members|settle)"
```

Expected:
- `components/v2/expenses` Lines ≥ 80。
- `components/v2/members` Lines ≥ 80。
- `components/v2/settle` Lines 不低於 baseline 81.48。
- 本 Part 新增檔案 Lines ≥ 90（有被量測者）。

- [ ] **Step 7: 回報**

在 Part 5 的執行報告中，記錄本 Part 的：
1. 完成／部分完成的畫面（A5b、A6b、A7b）。
2. 覆蓋率前後對照（expenses、members、settle）。
3. 下列已知偏差與問題：
   - `section-card.test.tsx` 由 Part 2 擁有，本 Part 未重複建立（跨 Part 歸屬）。
   - 篩選面板「開啟中未啟用」底色用 `bg-v2-sand`（#F1EBE0）替代設計的 `#F5F1E8`，**未新增 token**；邊框用 `border-v2-ink-subtle`（#B7AE9D）。
   - A6b 移除了建立日期篩選 UI、建立時間、卡片垃圾桶；保留批次、AI FAB、幣別篩選（僅多幣別時）、`?ui=v1` 不受影響。
   - 付款人篩選改單選（`setPayers`）；`useExpenseFilters` 未改。
   - 金額與幣別仍用 `formatCurrency`（`TWD 1,280`），非設計的 `NT$ 1,280`。
   - 滑動刪除無桌機可視提示；已用 focus 自動展開提供鍵盤操作。
   - `未填寫地點` 佔位依 gap 不帶 MapPin 圖示（設計稿有帶，刻意依已修正 gap）。
   - 螢幕寬度未在 jsdom 驗證；實際瀏覽器目視交給 Part 5.5。
