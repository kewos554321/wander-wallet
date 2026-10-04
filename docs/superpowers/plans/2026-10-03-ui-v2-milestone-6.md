# UI v2 里程碑 6（套用 v20261003 設計稿）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 執行者若是 opencode：照字面逐步執行，不要自行重構、不要合併 task、不要跳過測試。

**Goal:** 把 v2 的 A1 A2 A2d A3b A3d A5b A6b A7b A9b A13 A14 畫面對齊 `design/project-v20261003/` 的新設計，且完全不影響 v1。

**Architecture:** v2 已有這些畫面，本計畫只做差異修正。共用基礎（tokens、`V2TopBar` 參數）在 Part 0 一次做完；之後 4 個 Part 各自只改自己的資料夾，互不共用檔案。所有顏色走 `[data-ui="v2"]` 內的 token，v1 用的檔案一律不碰。

**Tech Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind v4 + Vitest（jsdom, v8 coverage）+ Testing Library。

**Spec:** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`（決策 D1–D21、tokens 表、問題清單）；差異細節在 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-*.md`。**本文件與 spec 衝突時以 spec 為準。**

## Global Constraints

這些規則適用於每一個 task：

1. 基準 commit：`36633e1`。工作分支：`feat/ui-v2-m6`（Task 0.1 建立）。
2. **只能改**：`components/v2/**`、`app/globals.css`（只新增 v2 tokens）、`lib/covers.ts`（只新增 id）、`tests/**`、`docs/**`。
3. **絕對不能改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、`tests/components/v1/**`。若某個 task 看起來必須改它們，**停止並回報**，不要自己改。
4. `components/v2/**` 裡禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`；只能用 token class（`bg-v2-*`、`text-v2-*`、`border-v2-*`）。例外：`rgba()` / `rgb()` 的陰影可以。
5. 不新增 API、不改 Prisma。
6. 註解用英文，一行以內，非必要不寫。回覆與文件用繁體中文。
7. 每個 task：測試先寫、先看到失敗、再實作、再看到通過，然後 `npm run lint`，全部通過才 commit。commit 訊息用 `feat:` / `fix:` / `test:` / `refactor:` / `chore:` 開頭、英文、一行。
8. 不要 `git push`，不要 `git commit --amend`，不要 `--no-verify`。
9. 若測試失敗而你不知道原因：**停止並回報錯誤全文**，不要刪測試、不要加 `.skip`、不要放寬斷言。
10. 驗證 v1 沒被動到（任何時候都可以跑，輸出必須為空）：
    ```bash
    git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
    ```

## Review Focus

spec 沒明說、但最容易出事的輸入（每條都必須在對應 Part 有測試；Task 5.1 會逐條 grep 確認）：

1. **舊封面資料**：已存在的 `icon:compass;color:red`（`red` 已從 picker 隱藏）仍可解析、仍能顯示；v1 對任何 `icon:` 封面仍回傳 preset 1（`toLegacyCover` 行為不變）。→ Part 4，`tests/lib/covers-icon.test.ts`
2. **A6b 支出卡片缺資料**：沒有描述、沒有地點、沒有圖片、只有 1 位分攤者、分攤者超過 3 位（`+N`）時不當掉，且沒有地點與圖片時不出現 footer。→ Part 3，`tests/components/v2/expenses-v2.test.tsx`
3. **A13 描述超過 50 字**（舊資料）：計數器變 danger 色，但仍可儲存、不被截斷。→ Part 4，`tests/components/v2/project-settings-v2.test.tsx`
4. **篩選面板互動**：點面板外關閉、按 Escape 關閉、同時只開一個面板、有篩選時才出現「移除篩選」。→ Part 3，`tests/components/v2/filter-panels.test.tsx` 與 `expenses-v2.test.tsx`
5. **A2 無描述／無預算／無日期的旅程**：描述區塊不渲染、預算進度不出現、不出現天數；沒有資料時「最近支出」顯示空狀態且不當掉。→ Part 1，`tests/components/v2/project-overview-v2.test.tsx`

---

## Part 0：基礎（本檔直接執行）

### Task 0.1：建立分支並提交設計稿與文件

**Files:** （無程式碼變更）

- [ ] **Step 1: 確認工作目錄乾淨度與目前 commit**

Run: `git status --short && git log --oneline -1`
Expected: 只看到 `?? design/project-backup-20260929/`、`?? design/project-v20261003/`、`?? docs/superpowers/...`（本計畫與 spec 檔）；最新 commit 是 `36633e1`。

- [ ] **Step 2: 建立分支**

Run: `git checkout -b feat/ui-v2-m6`
Expected: `Switched to a new branch 'feat/ui-v2-m6'`

- [ ] **Step 3: 確認基準測試與 lint 是綠的**

Run: `npm run lint && npm run test:run`
Expected: 兩者都通過。若有失敗：停止並回報（基準本身就壞了，不是你造成的）。

- [ ] **Step 4: 提交設計稿與文件**

```bash
git add design/project-backup-20260929 design/project-v20261003 docs/superpowers
git commit -m "docs: Add v20261003 design snapshot and UI v2 milestone 6 spec and plans"
```

### Task 0.2：新增 v2 tokens

**Files:**
- Create: `tests/components/v2/v2-tokens.test.ts`
- Modify: `app/globals.css`（三處：`@theme inline` 的 v2 區塊、`[data-ui="v2"]` 區塊、`.dark [data-ui="v2"]` 區塊，外加一個 `.v2-scroll` 規則）

- [ ] **Step 1: 寫失敗的測試**

建立 `tests/components/v2/v2-tokens.test.ts`，內容完整如下：

```ts
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

function block(selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  expect(start).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf("}", start))
}

const NEW_TOKENS: Record<string, [string, string]> = {
  "lake-edge": ["#B7D9CB", "#2E5A4C"],
  "danger-tint": ["#FDF1EC", "#2A1713"],
  "danger-border": ["#F3D3C4", "#5A2E23"],
  "danger-wash": ["#FDF2EF", "#2E1914"],
  "danger-edge": ["#E8A796", "#6A3A2E"],
}

describe("v2 tokens added in milestone 6", () => {
  const light = block('[data-ui="v2"]')
  const dark = block('.dark [data-ui="v2"]')

  for (const [name, [lightValue, darkValue]] of Object.entries(NEW_TOKENS)) {
    it(`defines --v2-${name} in light and dark blocks`, () => {
      expect(light).toContain(`--v2-${name}: ${lightValue};`)
      expect(dark).toContain(`--v2-${name}: ${darkValue};`)
    })

    it(`maps --color-v2-${name} in @theme inline`, () => {
      expect(css).toContain(`--color-v2-${name}: var(--v2-${name});`)
    })
  }

  it("does not change the existing lake-border token", () => {
    expect(light).toContain("--v2-lake-border: #DDEDE6;")
    expect(dark).toContain("--v2-lake-border: #2C4A41;")
  })

  it("defines the v2-scoped scroll utility", () => {
    expect(css).toContain('[data-ui="v2"] .v2-scroll')
    expect(css).toContain("scrollbar-width: thin;")
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/v2-tokens.test.ts`
Expected: FAIL（找不到 `--v2-lake-edge` 等）。

- [ ] **Step 3: 修改 `app/globals.css`**

(a) 在 `@theme inline` 的 v2 區塊中，找到這一行：

```css
  --color-v2-knob: var(--v2-knob);
```

在它**後面**插入（保持 2 格縮排）：

```css
  --color-v2-lake-edge: var(--v2-lake-edge);
  --color-v2-danger-tint: var(--v2-danger-tint);
  --color-v2-danger-border: var(--v2-danger-border);
  --color-v2-danger-wash: var(--v2-danger-wash);
  --color-v2-danger-edge: var(--v2-danger-edge);
```

(b) 在 `[data-ui="v2"] {` 區塊中，找到：

```css
  --v2-knob: #FFFFFF;
}
```

改成：

```css
  --v2-knob: #FFFFFF;
  --v2-lake-edge: #B7D9CB;
  --v2-danger-tint: #FDF1EC;
  --v2-danger-border: #F3D3C4;
  --v2-danger-wash: #FDF2EF;
  --v2-danger-edge: #E8A796;
}
```

(c) 在 `.dark [data-ui="v2"] {` 區塊中，找到：

```css
  --v2-knob: #F2EDE4;
}
```

改成：

```css
  --v2-knob: #F2EDE4;
  --v2-lake-edge: #2E5A4C;
  --v2-danger-tint: #2A1713;
  --v2-danger-border: #5A2E23;
  --v2-danger-wash: #2E1914;
  --v2-danger-edge: #6A3A2E;
}
```

(d) 在檔案最後一行 `.dark [data-ui="v2"] [data-cover-art] { ... }` 之後，新增一行空行與：

```css

[data-ui="v2"] .v2-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--v2-line) transparent;
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/v2-tokens.test.ts tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add app/globals.css tests/components/v2/v2-tokens.test.ts
git commit -m "feat: Add v2 tokens for lake-edge and danger variants"
```

### Task 0.3：`V2TopBar` 新增 `titleClassName`

**Files:**
- Create: `tests/components/v2/v2-top-bar.test.tsx`
- Modify: `components/v2/layout/v2-top-bar.tsx`

- [ ] **Step 1: 寫失敗的測試**

建立 `tests/components/v2/v2-top-bar.test.tsx`：

```tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

describe("V2TopBar title classes", () => {
  it("uses the default size and weight when titleClassName is omitted", () => {
    render(<V2TopBar title="結算" backHref="/projects" />)
    const h1 = screen.getByRole("heading", { level: 1, name: "結算" })
    expect(h1.className).toContain("text-base")
    expect(h1.className).toContain("font-medium")
  })

  it("replaces the default size and weight with titleClassName", () => {
    render(<V2TopBar title="成員" backHref="/projects" titleClassName="text-[17px] font-semibold" />)
    const h1 = screen.getByRole("heading", { level: 1, name: "成員" })
    expect(h1.className).toContain("text-[17px]")
    expect(h1.className).toContain("font-semibold")
    expect(h1.className).not.toContain("font-medium")
    expect(h1.className).not.toContain("text-base")
  })

  it("keeps the serif font and back link", () => {
    render(<V2TopBar title="結算" backHref="/projects/p1" titleClassName="font-bold" />)
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("font-v2-serif")
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects/p1")
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/v2-top-bar.test.tsx`
Expected: FAIL（第二、三個測試：`font-medium` 仍在、TypeScript 也可能報 prop 不存在）。

- [ ] **Step 3: 修改 `components/v2/layout/v2-top-bar.tsx`**

整個檔案替換為：

```tsx
import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface V2TopBarProps {
  title: string
  backHref: string
  actions?: ReactNode
  titleClassName?: string
}

export function V2TopBar({ title, backHref, actions, titleClassName }: V2TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-v2-line px-3.5 py-4">
      <Link
        href={backHref}
        aria-label="返回"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"
      >
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
      <h1 className={`m-0 font-v2-serif leading-6 tracking-[.15px] ${titleClassName ?? "text-base font-medium"}`}>{title}</h1>
      <div className="flex min-w-[34px] justify-end gap-1.5">{actions}</div>
    </div>
  )
}
```

（不要用 `cn()` / `twMerge`：它會把 `font-v2-serif` 與 `font-medium` 當成衝突而吃掉其中一個。）

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/v2-top-bar.test.tsx tests/components/v2/ui-v2-scope.test.tsx`
Expected: 全部 PASS。

- [ ] **Step 5: 全部 v2 測試 + lint + commit**

```bash
npx vitest run tests/components/v2
npm run lint
git add components/v2/layout/v2-top-bar.tsx tests/components/v2/v2-top-bar.test.tsx
git commit -m "feat: Allow V2TopBar to override title classes"
```

---

## Part 1–4：各畫面群組

依序完成，每個檔案都要完整做完（所有 task、所有 step）才進入下一個。每個 Part 的最後一個 task 是該 Part 的驗證。

- [ ] **Part 1** — `docs/superpowers/plans/2026-10-03-ui-v2-m6-part1-overview.md`（A1、A2、A2d）
- [ ] **Part 2** — `docs/superpowers/plans/2026-10-03-ui-v2-m6-part2-expense-form.md`（A3b、A3d）
- [ ] **Part 3** — `docs/superpowers/plans/2026-10-03-ui-v2-m6-part3-lists.md`（A5b、A6b、A7b）
- [ ] **Part 4** — `docs/superpowers/plans/2026-10-03-ui-v2-m6-part4-forms.md`（A9b、A13、A14）

---

## Part 5：最終驗證

### Task 5.1：Review Focus 與 v1 保護驗證

- [ ] **Step 1: 確認 v1 沒被動到**

Run: 本檔 Global Constraints 第 10 點的 `git diff --name-only 36633e1 -- ...` 指令。
Expected: 沒有任何輸出。若有輸出：`git diff 36633e1 -- <那個檔案>` 看內容，把該檔還原到基準（`git checkout 36633e1 -- <檔案>`），再重跑測試，並在報告中記錄原因。

- [ ] **Step 2: 確認只動了允許的檔案**

Run: `git diff --name-only 36633e1`
Expected: 每一行都以 `components/v2/`、`tests/`、`docs/`、`design/` 開頭，或剛好是 `app/globals.css`、`lib/covers.ts`。出現其他路徑 → 停止並回報。

- [ ] **Step 3: 確認 Review Focus 的測試存在**

分別執行並確認都有結果（無結果＝缺測試，回到該 Part 補上）：

```bash
grep -n "red" tests/lib/covers-icon.test.ts
grep -n "toLegacyCover" tests/lib/covers-icon.test.ts
grep -n "+" tests/components/v2/expenses-v2.test.tsx
grep -n "50" tests/components/v2/project-settings-v2.test.tsx
grep -n "Escape" tests/components/v2/filter-panels.test.tsx
grep -n "最近支出" tests/components/v2/project-overview-v2.test.tsx
```

### Task 5.2：完整測試、lint、build

- [ ] **Step 1: 完整測試**

Run: `npm run test:run`
Expected: 全部 PASS（v1 的測試也必須在內且全綠）。

- [ ] **Step 2: Lint 與 build**

Run: `npm run lint && npm run build`
Expected: 兩者成功。

### Task 5.3：覆蓋率比對

- [ ] **Step 1: 產生覆蓋率**

Run: `npx vitest run --coverage > /tmp/cov-after.txt 2>&1`

- [ ] **Step 2: 比對**

用 `sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-after.txt | grep -E "components/v2|covers.ts"` 取出各資料夾的 `% Lines`，與 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt` 逐資料夾比較。
Expected：
- 每個 `components/v2/<資料夾>` 的 Lines% **不低於** baseline。
- `components/v2/expenses` ≥ 80%、`components/v2/members` ≥ 80%。
- 本里程碑**新增**的檔案 Lines% ≥ 90%。
不符合 → 回到對應 Part，為未覆蓋的行補測試（用輸出的 `Uncovered Line #s` 欄找行號），補完重跑本 task。

### Task 5.4：寫執行報告

- [ ] **Step 1: 建立 `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-report.md`**

內容：
1. 每個畫面一行：完成／部分完成（說明缺什麼）。
2. 覆蓋率前後對照表（資料夾 × Lines%）。
3. spec §7 的問題清單（逐條保留），並加上你在執行中發現的新問題（例如某個設計值找不到對應 token、某個測試必須改斷言的原因）。
4. v1 驗證指令的輸出（應為空）。

- [ ] **Step 2: commit**

```bash
git add docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-report.md
git commit -m "docs: Add UI v2 milestone 6 execution report"
```

### Task 5.5：人工目視比對（交給人類，不是 opencode）

在瀏覽器分別開 `?ui=v1` 與 `?ui=v2`，對照 `design/project-v20261003/*.dc.html` 逐畫面檢查；特別確認 `?ui=v1` 的所有頁面與里程碑開始前完全一致。
