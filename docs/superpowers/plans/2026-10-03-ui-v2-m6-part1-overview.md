# UI v2 里程碑 6 — Part 1：A1 / A2 / A2d Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL：使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐 task 執行。本檔每個 task 都是「先寫失敗測試 → 看到 FAIL → 實作 → 看到 PASS → `npm run lint` → commit」。照字面執行，不要重構、不要合併 task、不要跳過測試、不要放寬斷言。

**Goal:** 把 v2 的 A1 旅程列表、A2 旅程總覽、A2d 功能列對齊 `design/project-v20261003/` 的新設計，且完全不影響 v1。

**Spec:** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`（決策 D13/D14/D15/D23/D24 與 §2 保護規則、§4 tokens）。
**Gap report:** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a1-a2.md`。
**Master plan:** `docs/superpowers/plans/2026-10-03-ui-v2-milestone-6.md`（Part 0 與最終驗證）。
**Design:** `design/project-v20261003/MainCard3-njus.dc.html`（A1）、`Trip-m0lh.dc.html`（A2）、`Trip-feature-row-demo.dc.html`（A2d，單排＋更多，權威像素參考）。

## 前提（Part 0 必須已完成並 commit）

- 分支：`feat/ui-v2-m6`，基準 commit `36633e1`。
- Task 0.2 已在 `app/globals.css` 新增 `--v2-lake-edge`（`#B7D9CB` / dark `#2E5A4C`）與 `--color-v2-lake-edge`；本 Part **只使用** `border-v2-lake-edge`，**不得**再改 `app/globals.css`、**不得**新增任何 token。
- Task 0.3 已讓 `V2TopBar` 接受 `titleClassName`；本 Part 不重做這個 prop。
- 若上述 token/class 不存在（例如 `border-v2-lake-edge` 沒效果），**STOP and report to user**，不要自己加 token。

## Global Constraints（每個 task 都適用）

1. 只能改：`components/v2/**`、`tests/**`、`docs/**`。**不要**改 `app/globals.css`、`lib/*`。
2. **絕對不能改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、`tests/components/v1/**`。若某一步看起來必須改它們，**STOP and report to user**。
3. `components/v2/**` 禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會掃）。`rgba()` / `rgb()` 陰影可以。
4. 顏色一律用 token class：`bg-v2-*`、`text-v2-*`、`border-v2-*`。
5. 不新增 API、不改 Prisma、不動 v1。
6. 註解用英文、一行以內、非必要不寫；文件與回覆用繁體中文。
7. commit 訊息英文、一行、`feat:` / `fix:` / `refactor:` / `test:` / `chore:` 開頭。不 `git push`、不 `--amend`、不 `--no-verify`。
8. 測試失敗而原因不明：**STOP and report to user**，附完整錯誤，不要刪測試、不要 `.skip`、不要改斷言放寬。
9. v1 保護驗證（任何時候可跑，輸出必須為空）：
   ```bash
   git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
   ```

## Review Focus（master plan 第 5 條；本 Part 必須有測試）

> **A2 無描述／無預算／無日期的旅程必須安全渲染**：描述區塊不渲染、預算進度不出現、不出現天數；沒有支出時「最近支出」顯示空狀態且不當掉。
> 對應測試：`tests/components/v2/project-overview-v2.test.tsx` 的 `"renders an undated, unbudgeted, description-less trip with an empty expenses state"`（Task 1.7 建立），並在 Task 1.8 用 `grep -n "最近支出" tests/components/v2/project-overview-v2.test.tsx` 確認存在。

## 檔案總覽

| Task | 檔案 |
|---|---|
| 1.1 | `components/v2/projects/projects-v2-view.tsx`、`tests/components/v2/projects-v2-view.test.tsx` |
| 1.2 | `components/v2/project/trip-summary-card.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.3 | `components/v2/project/balance-card.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.4 | `components/v2/project/feature-grid.tsx`、`tests/components/v2/feature-grid.test.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.5 | `components/v2/project/recent-expenses.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.6 | `components/v2/project/quick-actions.tsx`、`components/v2/project/project-overview-v2-view.tsx`、`components/v2/project/project-overview-v2.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.7 | `components/v2/project/project-overview-v2-view.tsx`、`tests/components/v2/project-overview-v2.test.tsx` |
| 1.8 | （驗證，無新程式碼） |

---

### Task 1.1：A1 標語

**Files:**
- Modify: `components/v2/projects/projects-v2-view.tsx`
- Modify: `tests/components/v2/projects-v2-view.test.tsx`

- [ ] **Step 1：寫失敗測試**

在 `tests/components/v2/projects-v2-view.test.tsx` 的 `"renders greeting, title and cards"` 測試中，`expect(screen.getByRole("heading", { name: "你的旅程" })).toBeInTheDocument()` 之後加入一行：

```tsx
    expect(screen.getByText("每一趟旅程，都值得被好好記住")).toBeInTheDocument()
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: FAIL（找不到文字 `每一趟旅程，都值得被好好記住`）。

- [ ] **Step 3：實作**

在 `components/v2/projects/projects-v2-view.tsx` 的 `<h1 ...>你的旅程</h1>` **之後**（同一個 `<div>` 內）插入：

```tsx
          <p className="mt-1 text-[12px] leading-4 tracking-[.3px] text-v2-ink-muted">每一趟旅程，都值得被好好記住</p>
```

結果片段應為：

```tsx
          <h1 className="m-0 font-v2-serif text-[32px] font-bold leading-10">你的旅程</h1>
          <p className="mt-1 text-[12px] leading-4 tracking-[.3px] text-v2-ink-muted">每一趟旅程，都值得被好好記住</p>
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: PASS（7 個測試全綠）。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/projects/projects-v2-view.tsx tests/components/v2/projects-v2-view.test.tsx
git commit -m "feat: Add tagline to v2 projects list"
```

---

### Task 1.2：A2 旅程摘要卡改用 Sparkles 裝飾

**Files:**
- Modify: `components/v2/project/trip-summary-card.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

- [ ] **Step 1：寫失敗測試**

在 `tests/components/v2/project-overview-v2.test.tsx` 的 `describe("ProjectOverviewV2View", ...)` 內新增一個測試（放在第一個測試之後即可）：

```tsx
  it("uses the sparkle decoration on the trip summary card", () => {
    const { container } = render(
      <ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />
    )
    expect(container.querySelector(".lucide-sparkles")).not.toBeNull()
    expect(container.querySelector(".lucide-compass")).toBeNull()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（目前是 `lucide-compass`，`lucide-sparkles` 不存在）。

- [ ] **Step 3：實作**

`components/v2/project/trip-summary-card.tsx`：import 由 `Compass` 改為 `Sparkles`，並把 JSX 的 `<Compass ... />` 改成 `<Sparkles ... />`（其餘 className/strokeWidth 不變）：

```tsx
import { Sparkles } from "lucide-react"
```

```tsx
      <Sparkles className="absolute -right-6 -top-6 h-[120px] w-[120px] opacity-[.08]" strokeWidth={1.2} aria-hidden="true" />
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: PASS。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/trip-summary-card.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Use sparkle decoration on v2 trip summary card"
```

---

### Task 1.3：A2 餘額卡標籤與金額顏色

**Files:**
- Modify: `components/v2/project/balance-card.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

- [ ] **Step 1：寫失敗測試**

在 `tests/components/v2/project-overview-v2.test.tsx` 的 `describe("ProjectOverviewV2View", ...)` 內新增：

```tsx
  it("uses ink for a non-negative balance, danger for a negative one and a lake label", () => {
    const { rerender } = render(
      <ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />
    )
    expect(screen.getByText("+TWD 4,820").className).toContain("text-v2-ink")
    expect(screen.getByText("我的餘額").className).toContain("text-v2-lake")
    expect(screen.getByText("我的餘額").className).toContain("text-[13px]")

    rerender(
      <ProjectOverviewV2View
        project={project}
        summary={{ ...summary, userBalance: -1200.4 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
        onCamera={vi.fn()}
      />
    )
    expect(screen.getByText("−TWD 1,200").className).toContain("text-v2-danger")
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（目前正數用 `text-v2-lake`、標籤是 `text-sm`）。

- [ ] **Step 3：實作**

`components/v2/project/balance-card.tsx`：

把 tone 那行

```tsx
  const tone = rounded < 0 ? "text-v2-danger" : "text-v2-lake"
```

改成

```tsx
  const tone = rounded < 0 ? "text-v2-danger" : "text-v2-ink"
```

把標籤那行

```tsx
          <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">我的餘額</p>
```

改成

```tsx
          <p className="m-0 text-[13px] font-bold leading-4 text-v2-lake">我的餘額</p>
```

（其餘不變：`查看結算明細` 連結、info 按鈕、金額 `<p>` 的 `mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums ${tone}`。）

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: PASS。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/balance-card.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Update v2 balance card label and amount colors"
```

---

### Task 1.4：A2d 功能列重寫（單排＋更多）

**Files:**
- Modify: `components/v2/project/feature-grid.tsx`
- Modify（整檔替換）: `tests/components/v2/feature-grid.test.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`（`"links all 11 features"` → `"links all ten features"`）

- [ ] **Step 1：寫失敗測試**

**(a)** 用以下內容**整檔替換** `tests/components/v2/feature-grid.test.tsx`：

```tsx
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { FeatureGrid } from "@/components/v2/project/feature-grid"

const PRIMARY: [string, string][] = [
  ["結算", "settle"],
  ["成員", "members"],
  ["統計", "stats"],
  ["匯率", "currency"],
]

const SECONDARY: [string, string][] = [
  ["歷史", "activity-logs"],
  ["里程", "mileage"],
  ["匯出", "export"],
  ["筆記", "notes"],
  ["地圖", "map"],
  ["照片", "photos"],
]

describe("FeatureGrid", () => {
  it("renders the primary row of five actions with no settings tile or pager", () => {
    render(<FeatureGrid projectId="p1" />)
    const nav = screen.getByRole("navigation", { name: "功能" })
    for (const [label, path] of PRIMARY) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
    expect(within(nav).getByRole("button", { name: "更多功能" })).toHaveAttribute("aria-expanded", "false")
    expect(within(nav).queryByRole("link", { name: "設定" })).not.toBeInTheDocument()
    expect(within(nav).queryByRole("button", { name: /跳到第/ })).not.toBeInTheDocument()
    for (const [label] of SECONDARY) {
      expect(within(nav).queryByRole("link", { name: label })).not.toBeInTheDocument()
    }
  })

  it("expands and collapses the secondary features", () => {
    render(<FeatureGrid projectId="p1" />)
    const nav = screen.getByRole("navigation", { name: "功能" })
    const more = within(nav).getByRole("button", { name: "更多功能" })

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "true")
    for (const [label, path] of SECONDARY) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }

    fireEvent.click(more)
    expect(more).toHaveAttribute("aria-expanded", "false")
    for (const [label] of SECONDARY) {
      expect(within(nav).queryByRole("link", { name: label })).not.toBeInTheDocument()
    }
  })
})
```

**(b)** 在 `tests/components/v2/project-overview-v2.test.tsx` 中，把**整個** `"links all 11 features"` 測試（目前從 `it("links all 11 features", ...)` 到它對應的 `})`）替換為：

```tsx
  it("links all ten features", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    const grid = screen.getByRole("navigation", { name: "功能" })
    const primary: [string, string][] = [
      ["結算", "settle"],
      ["成員", "members"],
      ["統計", "stats"],
      ["匯率", "currency"],
    ]
    for (const [label, path] of primary) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }

    fireEvent.click(within(grid).getByRole("button", { name: "更多功能" }))
    const secondary: [string, string][] = [
      ["歷史", "activity-logs"],
      ["里程", "mileage"],
      ["匯出", "export"],
      ["筆記", "notes"],
      ["地圖", "map"],
      ["照片", "photos"],
    ]
    for (const [label, path] of secondary) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
    expect(within(grid).queryByRole("link", { name: "設定" })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/feature-grid.test.tsx tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（沒有「更多功能」按鈕、沒有 10 個連結；舊 feature-grid 測試已被替換）。

- [ ] **Step 3：實作：整檔替換 `components/v2/project/feature-grid.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRightLeft,
  BarChart3,
  Car,
  Coins,
  Download,
  History,
  Images,
  MapPin,
  MoreHorizontal,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react"

interface Feature {
  label: string
  path: string
  icon: LucideIcon
  tone: string
}

// Primary row follows design/project-v20261003/Trip-feature-row-demo.dc.html.
const PRIMARY: Feature[] = [
  { label: "結算", path: "settle", icon: ArrowRightLeft, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "成員", path: "members", icon: Users, tone: "bg-v2-coral-soft text-v2-coral" },
  { label: "統計", path: "stats", icon: BarChart3, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "匯率", path: "currency", icon: Coins, tone: "bg-v2-coral-soft text-v2-coral" },
]

const SECONDARY: Feature[] = [
  { label: "歷史", path: "activity-logs", icon: History, tone: "bg-v2-rose-soft text-v2-rose" },
  { label: "里程", path: "mileage", icon: Car, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "匯出", path: "export", icon: Download, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "筆記", path: "notes", icon: StickyNote, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "地圖", path: "map", icon: MapPin, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "照片", path: "photos", icon: Images, tone: "bg-v2-rose-soft text-v2-rose" },
]

const labelClass = "text-[11px] font-medium leading-[14px] tracking-[.3px]"
const wideLabelClass = "text-[12px] font-medium leading-4 tracking-[.5px]"

export function FeatureGrid({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav aria-label="功能" className="px-4 pt-5">
      <div className="rounded-[18px] border border-v2-line bg-v2-surface px-3 pb-3 pt-4">
        <p className="mb-3 px-1 text-[13px] font-bold text-v2-lake">功能</p>

        <div className="flex items-start justify-between">
          {PRIMARY.map(({ label, path, icon: Icon, tone }) => (
            <Link
              key={path}
              href={`/projects/${projectId}/${path}`}
              className="flex w-[52px] flex-col items-center gap-[5px] text-center"
            >
              <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <span className={path === "currency" ? wideLabelClass : labelClass}>{label}</span>
            </Link>
          ))}

          <button
            type="button"
            aria-label="更多功能"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex w-[52px] flex-col items-center gap-[5px] text-center"
          >
            <span
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${
                expanded ? "bg-v2-lake text-v2-on-lake" : "bg-v2-sand text-v2-ink-muted"
              }`}
              aria-hidden="true"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className={labelClass}>更多</span>
          </button>
        </div>

        {expanded && (
          <div className="mt-3.5 border-t border-dashed border-v2-line pt-3.5">
            <p className="mb-3 px-1 text-[11px] font-bold tracking-[.5px] text-v2-ink-subtle">更多功能</p>
            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
              {SECONDARY.map(({ label, path, icon: Icon, tone }) => (
                <Link
                  key={path}
                  href={`/projects/${projectId}/${path}`}
                  className="flex flex-col items-center gap-[5px] text-center"
                >
                  <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className={wideLabelClass}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
```

重點：
- 移除 `useRef`、`PAGE_SIZE`、pager/dots、snap-scroll、`Settings`；`功能` 標題移入卡片內（13px/700 lake）。
- 主列 4 連結 + `更多` 按鈕（`aria-label="更多功能"`、`aria-expanded`）；tone 依 A2d：結算 lake、成員/匯率 coral、統計 plum、更多 sand/ink-muted；展開時更多圓為 lake/on-lake。
- 展開面板：`border-t border-dashed border-v2-line` + `更多功能` 11px/700 ink-subtle + `grid-cols-5` 六連結；tone 修正：筆記 plum、地圖 gold（原本相反）。
- 標籤：主列 11px/500（匯率 12px/500），次要列 12px/500。

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/feature-grid.test.tsx tests/components/v2/project-overview-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS（含 no-hardcoded-colors）。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/feature-grid.tsx tests/components/v2/feature-grid.test.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Rebuild v2 feature grid with expandable more section"
```

---

### Task 1.5：A2「最近支出」標題移入卡片

**Files:**
- Modify: `components/v2/project/recent-expenses.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

- [ ] **Step 1：寫失敗測試**

**(a)** 在 `tests/components/v2/project-overview-v2.test.tsx` 的 `"lists recent expenses with payer and split count"` 測試開頭加入卡片範圍斷言，改為：

```tsx
  it("lists recent expenses with payer and split count", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("最近支出")).toBeInTheDocument()
    expect(within(card).getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/projects/p1/expenses")
    expect(screen.getByText("一蘭拉麵晚餐")).toBeInTheDocument()
    expect(screen.getByText("志明 付款 · 2 人分攤")).toBeInTheDocument()
    expect(screen.getByText("我 付款 · 1 人分攤")).toBeInTheDocument()
    expect(screen.getByText("購物")).toBeInTheDocument() // description fallback to category label
  })
```

**(b)** 在 `"shows an empty state without expenses"` 中，把斷言改為 also inside the card：

```tsx
  it("shows an empty state without expenses", () => {
    render(<ProjectOverviewV2View project={{ ...project, expenses: [] }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} onCamera={vi.fn()} />)
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（`v2-recent-expenses-card` 不存在）。

- [ ] **Step 3：實作**

`components/v2/project/recent-expenses.tsx` 的 return 改成（`recent.map(...)` 內容不變，只縮排/包一層）：

```tsx
  return (
    <section className="px-4 pb-44 pt-5">
      <div data-testid="v2-recent-expenses-card" className="overflow-hidden rounded-[16px] border border-v2-line bg-v2-surface">
        <div className="flex items-baseline justify-between px-3.5 pb-2 pt-3.5">
          <p className="m-0 text-[13px] font-bold text-v2-lake">最近支出</p>
          <Link href={`/projects/${projectId}/expenses`} className="text-xs font-medium tracking-[.5px] text-v2-link">
            查看全部
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-v2-ink-muted">還沒有支出，點右下角開始記帳</p>
        ) : (
          recent.map((expense, i) => {
            const key = categoryKey(expense.category)
            const Icon = CATEGORY_ICONS[key]
            const payer = expense.payer.id === currentMemberId ? "我" : expense.payer.displayName
            return (
              <Link
                key={expense.id}
                href={`/projects/${projectId}/expenses/${expense.id}/edit`}
                className={`flex items-center gap-3 px-3.5 py-3 ${i < recent.length - 1 ? "border-b border-v2-line-soft" : ""}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_TONES[key]}`} aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5 tracking-[.1px]">
                    {expense.description || getCategoryLabel(key)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
                    {payer} 付款 · {expense.participants.length} 人分攤
                  </span>
                </span>
                <span className="text-sm font-bold leading-5 tracking-[.1px] tabular-nums">
                  {formatCurrency(Number(expense.amount), expense.currency || DEFAULT_CURRENCY)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
```

（重點：外層保留 `<section className="px-4 pb-44 pt-5">`，卡片加 `data-testid="v2-recent-expenses-card"`、圓角改 `rounded-[16px]`，標題移到卡片頂部、`13px/700 text-v2-lake`；`查看全部` 連結保留。）

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: PASS。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/recent-expenses.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Move v2 recent expenses heading inside card"
```

---

### Task 1.6：A2 移除拍照 FAB 與 `onCamera` plumbing；手動 FAB 陰影 .4

**Files:**
- Modify: `components/v2/project/quick-actions.tsx`
- Modify: `components/v2/project/project-overview-v2-view.tsx`（僅移除 `onCamera` prop/用法，標題列留待 Task 1.7）
- Modify: `components/v2/project/project-overview-v2.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

- [ ] **Step 1：寫失敗測試**

**(a)** 把 `tests/components/v2/project-overview-v2.test.tsx` 最後的 `"wires share, voice, camera and add actions"` 整個測試替換為：

```tsx
  it("wires share, voice and add actions without a camera FAB", () => {
    const onShare = vi.fn()
    const onVoice = vi.fn()
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={onShare} onVoice={onVoice} />)
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(onShare).toHaveBeenCalled()
    expect(onVoice).toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /拍照記帳/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "手動新增支出" })).toHaveAttribute("href", "/projects/p1/expenses/new")
  })
```

**(b)** 在本檔所有還留著的 `ProjectOverviewV2View` render 中，刪除 `onCamera={vi.fn()}`（含換行的 `onCamera={vi.fn()}` 單獨一行）。用下列指令找出所有位置並全部刪掉：

```bash
grep -n "onCamera" tests/components/v2/project-overview-v2.test.tsx
```

刪完後此檔不應再有 `onCamera`（`grep -c onCamera ...` 應為 0）。Task 1.2/1.3/1.4/1.5 新增的測試也一併移除。

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（目前仍有 `拍照記帳` 按鈕）。

- [ ] **Step 3：實作**

**(a)** 整檔替換 `components/v2/project/quick-actions.tsx`：

```tsx
import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"

const pill =
  "rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium leading-4 tracking-[.5px] text-v2-ink shadow-[0_2px_6px_rgba(27,24,21,.08)]"

export function QuickActions({ projectId, onVoice }: { projectId: string; onVoice: () => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
      <button type="button" onClick={onVoice} className="flex items-center gap-2">
        <span className={pill}>AI 快速記帳</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-v2-on-lake shadow-[0_4px_10px_rgba(232,130,90,.35)]">
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </button>
      <Link
        href={`/projects/${projectId}/expenses/new`}
        aria-label="手動新增支出"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-lake text-v2-on-lake shadow-[0_6px_16px_rgba(27,88,71,.4)]"
      >
        <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </Link>
    </div>
  )
}
```

（移除 `Camera` import 與整個拍照按鈕；AI FAB 已用 `Sparkles`（verify only，不改）；手動 FAB 陰影 alpha `.35 → .4`。`rgba()` 不觸發顏色守門。）

**(b)** `components/v2/project/project-overview-v2-view.tsx`：
- 從 `ProjectOverviewV2ViewProps` 刪除 `onCamera: () => void`。
- 解構簽名改為 `export function ProjectOverviewV2View({ project, summary, onShare, onVoice }: ProjectOverviewV2ViewProps) {`。
- `<QuickActions projectId={project.id} onVoice={onVoice} onCamera={onCamera} />` 改成 `<QuickActions projectId={project.id} onVoice={onVoice} />`。

**(c)** `components/v2/project/project-overview-v2.tsx`：
- `const [quickStep, setQuickStep] = useState<"input" | "camera" | null>(null)` 改成 `const [quickStep, setQuickStep] = useState<"input" | null>(null)`。
- 刪除 `onCamera={() => setQuickStep("camera")}` 這一行。
- `QuickExpenseV2` 與其 `initialStep={quickStep ?? "input"}` **保持不變**（camera step 仍可由 `quick-input-step.tsx` 內的「拍照或掃描收據」進入；`QuickExpenseV2` 本體不改）。

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx tests/components/v2/quick-expense`
Expected: PASS。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/quick-actions.tsx components/v2/project/project-overview-v2-view.tsx components/v2/project/project-overview-v2.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "refactor: Remove camera FAB from v2 overview"
```

---

### Task 1.7：A2 標題列改版（頭像、描述、分享／修改膠囊）

**Files:**
- Modify: `components/v2/project/project-overview-v2-view.tsx`
- Modify: `tests/components/v2/project-overview-v2.test.tsx`

- [ ] **Step 1：寫失敗測試**

在 `tests/components/v2/project-overview-v2.test.tsx` 的 `describe("ProjectOverviewV2View", ...)` 內新增兩個測試：

```tsx
  it("renders the settings avatar and the edit pill and links them to settings", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByRole("link", { name: "通用設定" })).toHaveAttribute("href", "/settings")
    expect(screen.getByRole("link", { name: "修改" })).toHaveAttribute("href", "/projects/p1/settings")
    expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "專案設定" })).not.toBeInTheDocument()
  })

  it("renders the description only when present", () => {
    const description = "跟著楓葉季節走訪京都嵐山與東京近郊，中間安排一晚溫泉旅館放鬆，行程盡量不要太趕，留點時間走走。"
    const { rerender } = render(
      <ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />
    )
    expect(screen.queryByText(description)).not.toBeInTheDocument()

    rerender(
      <ProjectOverviewV2View project={{ ...project, description }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />
    )
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it("renders an undated, unbudgeted, description-less trip with an empty expenses state", () => {
    render(
      <ProjectOverviewV2View
        project={{ ...project, description: null, budget: null, startDate: null, endDate: null, expenses: [] }}
        summary={{ ...summary, totalAmount: 0, perPerson: 0, budget: null, budgetProgress: 0, budgetRemaining: null, userBalance: 0 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.getByText("尚未設定日期")).toBeInTheDocument()
    expect(screen.queryByText(/%|％/)).not.toBeInTheDocument()
    const card = screen.getByTestId("v2-recent-expenses-card")
    expect(within(card).getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
    expect(screen.queryByText("＋TWD 0")).not.toBeInTheDocument()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL（沒有 `通用設定` 頭像連結、沒有 `修改` 連結、描述未渲染；既有 gear 連結名為 `專案設定`）。

- [ ] **Step 3：實作**

`components/v2/project/project-overview-v2-view.tsx`：import 改為 `Pencil, Share2`（移除 `Settings`）；移除 `iconButton` 常數；加 `pill` 常數；改標題列。完成的檔案前段應為：

```tsx
import Link from "next/link"
import { Pencil, Share2 } from "lucide-react"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"
import { formatTripDateRange } from "@/lib/trip"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { TripSummaryCard } from "./trip-summary-card"
import { BalanceCard } from "./balance-card"
import { FeatureGrid } from "./feature-grid"
import { RecentExpenses } from "./recent-expenses"
import { QuickActions } from "./quick-actions"

interface ProjectOverviewV2ViewProps {
  project: OverviewProject
  summary: ProjectSummary
  onShare: () => void
  onVoice: () => void
}

const pill =
  "flex h-8 items-center gap-1.5 rounded-[9px] border border-v2-lake-edge bg-v2-lake-soft px-2.5 text-[12px] font-semibold text-v2-lake"

export function ProjectOverviewV2View({ project, summary, onShare, onVoice }: ProjectOverviewV2ViewProps) {
  const currency = project.currency || DEFAULT_CURRENCY
  const initial = project.creator.name?.trim().charAt(0).toUpperCase() || "?"

  return (
    <>
      <V2TopBar
        title="旅程總覽"
        backHref="/projects"
        actions={
          <Link
            href="/settings"
            aria-label="通用設定"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake text-sm font-bold text-v2-paper"
          >
            {initial}
          </Link>
        }
      />

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="m-0 font-v2-serif text-2xl font-bold leading-8">{project.name}</h2>
          <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
            {formatTripDateRange(project.startDate, project.endDate)} · {project.members.length} 位旅伴
          </p>
          {project.description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-[17px] tracking-[.3px] text-v2-ink-muted">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onShare} className={pill}>
            <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            分享
          </button>
          <Link href={`/projects/${project.id}/settings`} className={pill}>
            <Pencil className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
            修改
          </Link>
        </div>
      </div>

      <TripSummaryCard summary={summary} currency={currency} />
      <BalanceCard balance={summary.userBalance} currency={currency} projectId={project.id} />
      <FeatureGrid projectId={project.id} />
      <RecentExpenses projectId={project.id} expenses={project.expenses} currentMemberId={summary.currentMemberId} />
      <QuickActions projectId={project.id} onVoice={onVoice} />
    </>
  )
}
```

重點：
- 頭像為 36px（`h-9 w-9`）連結 `/settings`、`aria-label="通用設定"`、字母取 `creator.name` 首字大寫（無值時 `?`），移除 gear 與 `專案設定`。
- 描述只在非空時渲染，`line-clamp-2 text-[12px] leading-[17px] tracking-[.3px] text-v2-ink-muted`。
- 分享（`button`、呼叫 `onShare`）與修改（`Link` → `/projects/{id}/settings`）是膠囊，邊框 `border-v2-lake-edge`。

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: PASS。

- [ ] **Step 5：Lint 並 commit**

```bash
npm run lint
git add components/v2/project/project-overview-v2-view.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Redesign v2 overview header with avatar and pills"
```

---

### Task 1.8：Part 1 驗證

**Files:** 無（只驗證；若發現缺口才回對應 task 補測試）

- [ ] **Step 1：跑本 Part 觸及的測試檔**

Run:
```bash
npx vitest run tests/components/v2/projects-v2-view.test.tsx tests/components/v2/project-overview-v2.test.tsx tests/components/v2/feature-grid.test.tsx tests/components/v2/no-hardcoded-colors.test.ts
```
Expected: 全部 PASS。

- [ ] **Step 2：確認 Review Focus 測試存在**

Run:
```bash
grep -n "最近支出" tests/components/v2/project-overview-v2.test.tsx
```
Expected: 有輸出（Task 1.5/1.7 的卡片內斷言）。沒有輸出 → 回 Task 1.7 補。

- [ ] **Step 3：完整測試**

Run: `npm run test:run`
Expected: 全部 PASS（含 v1 測試，不得有 skipped/failed）。

- [ ] **Step 4：v1 保護驗證（必須為空）**

Run:
```bash
git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
```
Expected: 沒有任何輸出。有輸出 → 停止並回報；把該檔還原（`git checkout 36633e1 -- <檔案>`）後重跑測試。

- [ ] **Step 5：確認只動了允許的檔案**

Run: `git diff --name-only 36633e1`
Expected: 每行都以 `components/v2/`、`tests/`、`docs/`、`design/` 開頭，或剛好是 `app/globals.css`、`lib/covers.ts`。出現其他路徑 → 停止並回報。

- [ ] **Step 6：Lint**

Run: `npm run lint`
Expected: 通過、無警告。

- [ ] **Step 7：覆蓋率比對**

Run:
```bash
npx vitest run --coverage > /tmp/cov-m6-part1.txt 2>&1
sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-m6-part1.txt | grep -E "components/v2/(project|projects)"
```
Expected（對照 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`）：
- `components/v2/project` Lines% **≥ 83.78**。
- `components/v2/projects` Lines% **≥ 86.95**。
- 本 Part 未新增檔案；若任何新檔 Lines% < 90%，回對應 task 補測試。不足 → 用輸出的 `Uncovered Line #s` 找行號補測試後重跑本 task。

- [ ] **Step 8：若上述都無需再改，不需額外 commit**

本 Part 的每個 task 已各自 commit。若 Task 1.8 有補測試，才：
```bash
git add tests
git commit -m "test: Cover v2 overview edge cases"
```

---

## 已知偏差（執行後寫進報告，不需另行修正）

- A2 頭像字母取 `project.creator.name` 首字（不是登入者名稱）；設計稿僅示意。
- 「修改」導向 `/projects/{id}/settings`（D14）；gear 移除後，專案設定只能由此進入。
- 無日期旅程不顯示天數 badge（D16，維持現狀）。
- 餘額負數維持 `text-v2-danger`，≥0 改 `text-v2-ink`（D15）。
- 金額維持 `TWD 1,280`（D17）。
