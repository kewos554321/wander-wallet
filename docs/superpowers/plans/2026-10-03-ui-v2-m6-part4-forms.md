# UI v2 里程碑 6 — Part 4：A9b 建立旅程 / A13 專案設定 / A14 通用設定

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 執行者若是 opencode：照字面逐步執行，不要自行重構、不要合併 task、不要跳過測試。

**Goal:** 把 A9b（建立旅程）、A13（專案設定）、A14（通用設定）對齊 `design/project-v20261003/` 的設計，且完全不影響 v1。

**Scope / 本 Part 決策：** D2（更多圖示 disabled 占位）、D3/D4（新封面 id + `ink`）、D5（`red` 從 picker 隱藏但保留資料）、D6（移除自訂圖片上傳、保留「移除自訂圖片」）、D7（A13 48px 封面磚 → 底部抽屜）、D8（A13 固定頁尾、圓角 14）、D9（A13 描述 `n/50` 只顯示、不截斷、不擋儲存）、D10（預算前綴＝結算幣別符號、無千分位）、D11（A14 保留 Beta 卡）、D22（A9b 短名 `台幣`、A13 全名 `新台幣`）。

**Tech Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind v4 + Vitest（jsdom, v8 coverage）+ Testing Library。

**Spec:** `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6-design.md`（衝突時以 spec 為準）。
**Base commit:** `36633e1`。**Branch:** `feat/ui-v2-m6`（Task 0.1 建立）。**Part 0 已完成** tokens 與 `.v2-scroll`（本 Part 不重做）。

## Global Constraints（每個 task 都適用）

1. **只能改**：`components/v2/**`、`lib/covers.ts`（只新增 id，不可刪除／改名 `red`）、`tests/**`、`docs/**`。**本 Part 不動 `app/globals.css`**（tokens 已在 Part 0 完成）。
2. **絕對不能改**：`components/v1/**`、`components/ui/**`（含 `currency-select.tsx`）、`components/expense/**`、`components/location-picker.tsx`、`app/api/**`、`prisma/**`、`lib/hooks/useExpenseFilters.ts`、`lib/expense-split.ts`、`lib/project-overview.ts`、`lib/trip.ts`、`tests/components/v1/**`。若某步驟看起來必須改它們 → 寫「STOP and report」，不要改。
3. `components/v2/**` 禁止 `#hex` Tailwind class、`bg-white`、`text-white`、`bg-black`、`dark:`。封面顏色一律由 `lib/covers.ts` 資料經 inline style / CSS vars 帶入（`tests/components/v2/no-hardcoded-colors.test.ts` 會檢查 class 字串；inline style 的 `rgba()` 陰影允許）。
4. TDD 每個 task：先寫**完整**測試 → 跑 FAIL → 實作 → 跑 PASS → `npm run lint` → commit。commit 訊息英文、一行。
5. **本 Part 專屬檔案擁有權**：本 Part 會改 `components/v2/project/join-mode-picker.tsx` 與 `components/v2/project/date-range-field.tsx`（A9b/A13 共用）。Part 1（A1/A2/A2d）**不得**改這兩個檔；Part 1–3 不與本 Part 共用檔案。
6. 驗證 v1 沒被動到（任何時候可跑，輸出必須為空）：
   ```bash
   git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
   ```

## Review Focus（本 Part 必須有的測試）

- **RC1 舊封面資料**：已存在的 `icon:compass;color:red`（`red` 已從 picker 隱藏）仍可解析、仍能顯示；`toLegacyCover` 行為不變，v1 對任何 `icon:` 封面回傳 preset 1。→ Task 4.2。
- **RC3 A13 描述超過 50 字**：計數器變 danger 色，但仍可儲存、不被截斷。→ Task 4.8。

## 覆蓋率要求

baseline：`docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/coverage-baseline.txt`。
- `components/v2/new-project`（Lines 84.37）、`components/v2/project-settings`（81.81）、`components/v2/settings`（90.00）、`components/v2/cover`（95.45）、`lib/covers.ts`（97.14）不可低於 baseline。
- 本 Part **新增檔案** Lines ≥ 90%：`components/v2/cover/cover-icons.ts`、`components/v2/cover/cover-tile-button.tsx`、`components/v2/ui/currency-field.tsx`。

---

## Task 4.1：確認 Part 0 token 測試涵蓋 `danger-tint` / `danger-border`

**Files:**
- Modify（必要時）: `tests/components/v2/v2-tokens.test.ts`

- [ ] **Step 1: 確認測試已涵蓋**

Run: `grep -n "danger-tint\|danger-border" tests/components/v2/v2-tokens.test.ts`
Expected: 兩行都在。Part 0 的 `NEW_TOKENS` 應已包含下列兩個條目（連同 `lake-edge`、`danger-wash`、`danger-edge`）：

```ts
  "danger-tint": ["#FDF1EC", "#2A1713"],
  "danger-border": ["#F3D3C4", "#5A2E23"],
```

- [ ] **Step 2: 必要時補上（只在缺漏時）**

若 Step 1 找不到其中任一 key，把它補進 `NEW_TOKENS`（不要刪掉既有 key，也不要另寫第二個測試檔）。補完後：

Run: `npx vitest run tests/components/v2/v2-tokens.test.ts`
Expected: PASS。

- [ ] **Step 3: commit（只有真的改到檔案才 commit）**

```bash
git add tests/components/v2/v2-tokens.test.ts
git commit -m "test: Cover danger tint and border tokens in v2 token test"
```

若 Step 1 已完整涵蓋、無任何修改，跳過 commit，直接進入 Task 4.2。

---

## Task 4.2：`lib/covers.ts` 新增封面 id / `ink` / `COVER_PICKER_COLORS`

**Files:**
- Modify: `lib/covers.ts`
- Modify: `tests/lib/covers-icon.test.ts`

- [ ] **Step 1: 改寫失敗的測試**

把 `tests/lib/covers-icon.test.ts` 整個檔案替換為（import 增加 `COVER_PICKER_COLORS`、`toLegacyCover`、`PRESET_COVERS`）：

```ts
import { describe, it, expect } from "vitest"
import { COVER_ICONS, COVER_COLORS, COVER_PICKER_COLORS, DEFAULT_ICON_COVER, PRESET_COVERS, buildIconCover, isValidCover, parseCover, toLegacyCover } from "@/lib/covers"

describe("icon covers", () => {
  it("lists icons and colors", () => {
    expect(COVER_ICONS.map((i) => i.id)).toEqual([
      "compass", "leaf", "utensils", "globe", "car", "bed", "star",
      "camera", "fork-knife", "hiking", "mountain", "heart", "sparkle",
    ])
    expect(COVER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "red", "rose", "gold", "plum", "ink"])
    expect(DEFAULT_ICON_COVER).toBe("icon:leaf;color:lake")
  })
  it("builds and parses", () => {
    expect(buildIconCover("car", "gold")).toBe("icon:car;color:gold")
    expect(parseCover("icon:car;color:gold")).toEqual({ type: "icon", iconId: "car", colorId: "gold" })
  })
  it("treats unknown ids as none", () => {
    expect(parseCover("icon:rocket;color:lake")).toEqual({ type: "none" })
    expect(parseCover("icon:leaf;color:pink")).toEqual({ type: "none" })
  })
  it("validates covers", () => {
    for (const ok of [null, undefined, "", "preset:1", "icon:leaf;color:lake", "https://cdn.example.com/a.jpg", "data:image/webp;base64,AAAA", "data:image/jpeg;base64,AAAA"]) {
      expect(isValidCover(ok)).toBe(true)
    }
    for (const bad of [1, {}, "preset:999", "icon:rocket;color:lake", "icon:leaf", "javascript:alert(1)", "http://x.com/a.jpg", "data:text/html;base64,AAAA", "hello"]) {
      expect(isValidCover(bad)).toBe(false)
    }
  })
  it("accepts the new icon ids and rejects unknown ones", () => {
    expect(isValidCover("icon:camera;color:ink")).toBe(true)
    expect(parseCover("icon:fork-knife;color:ink")).toEqual({ type: "icon", iconId: "fork-knife", colorId: "ink" })
    expect(isValidCover("icon:rocket;color:lake")).toBe(false)
  })
  it("keeps red covers parseable for existing data but hides red from the picker", () => {
    expect(parseCover("icon:compass;color:red")).toEqual({ type: "icon", iconId: "compass", colorId: "red" })
    expect(isValidCover("icon:compass;color:red")).toBe(true)
    expect(toLegacyCover(parseCover("icon:compass;color:red"))).toEqual({ type: "preset", presetId: PRESET_COVERS[0].id })
    expect(COVER_PICKER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "plum", "gold", "rose", "ink"])
  })
  it("has dark colors for all cover colors", () => {
    expect(COVER_COLORS.map(({ id, darkFg, darkBg }) => ({ id, darkFg, darkBg }))).toEqual([
      { id: "lake", darkFg: "#4FB394", darkBg: "#17302A" },
      { id: "coral", darkFg: "#F09A76", darkBg: "#3A2519" },
      { id: "red", darkFg: "#E8735A", darkBg: "#3A1E18" },
      { id: "rose", darkFg: "#D77E9C", darkBg: "#37212A" },
      { id: "gold", darkFg: "#D4AE55", darkBg: "#332A16" },
      { id: "plum", darkFg: "#A897D6", darkBg: "#2A2438" },
      { id: "ink", darkFg: "#D9D2C7", darkBg: "#2A2622" },
    ])
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/lib/covers-icon.test.ts`
Expected: FAIL（新 id 不在清單、`COVER_PICKER_COLORS` 不存在 / `ink` 不存在）。

- [ ] **Step 3: 修改 `lib/covers.ts`（只新增）**

在 `COVER_ICONS` 陣列 `star` 後面追加 6 個：

```ts
  { id: "camera", label: "相機" },
  { id: "fork-knife", label: "美食" },
  { id: "hiking", label: "登山" },
  { id: "mountain", label: "山岳" },
  { id: "heart", label: "愛心" },
  { id: "sparkle", label: "亮點" },
```

在 `COVER_COLORS` 陣列 `plum` 後面追加 `ink`（**不可移除、改名既有 `red`**）：

```ts
  { id: "ink", fg: "#2A241F", bg: "#E9E5DF", darkFg: "#D9D2C7", darkBg: "#2A2622" },
```

在 `COVER_COLORS` 定義之後追加：

```ts
// D5: red stays in COVER_COLORS for old saved covers but is hidden from the picker.
const PICKER_COLOR_IDS = ["lake", "coral", "plum", "gold", "rose", "ink"] as const
export const COVER_PICKER_COLORS = PICKER_COLOR_IDS.map((id) => COVER_COLORS.find((c) => c.id === id)!)
```

（`parseCover` / `isValidCover` / `toLegacyCover` 邏輯**不變**；新 id 自動通過 `isIconId` / `isColorId`。）

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/lib/covers-icon.test.ts tests/lib/covers.test.ts`
Expected: 全部 PASS（`covers.test.ts` 的 `toLegacyCover` 測試不變、仍綠）。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add lib/covers.ts tests/lib/covers-icon.test.ts
git commit -m "feat: Add new cover icon ids, ink color and picker color list"
```

---

## Task 4.3：封面 icon map 與 `CoverArt` 的 `variant="solid"`

**Files:**
- Create: `components/v2/cover/cover-icons.ts`
- Modify: `components/v2/cover/cover-art.tsx`
- Modify: `tests/components/v2/cover.test.tsx`（先只加 CoverArt 相關）

- [ ] **Step 1: 寫失敗的測試**

在 `tests/components/v2/cover.test.tsx` 的 `describe("CoverArt", ...)` 內追加兩個測試：

```tsx
  it("renders an existing red cover for old data", () => {
    render(<CoverArt cover="icon:compass;color:red" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover", "icon:compass")
    expect(box.style.getPropertyValue("--cover-fg")).toBe("#C4472F")
  })
  it("renders a solid icon cover with the on-lake icon color", () => {
    render(<CoverArt cover="icon:car;color:gold" variant="solid" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover-art-solid", "")
    expect(box.style.getPropertyValue("--cover-bg")).toBe("#9C7A28")
    expect(box.style.getPropertyValue("--cover-bg-dark")).toBe("#D4AE55")
    expect(box.style.getPropertyValue("--cover-fg")).toBe("var(--v2-on-lake)")
    expect(box.style.getPropertyValue("--cover-fg-dark")).toBe("var(--v2-on-lake)")
  })
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/cover.test.tsx`
Expected: FAIL（`variant` prop 不存在；solid 的 `--cover-bg` 會是 `#F6ECCF` 而非 `#9C7A28`）。

- [ ] **Step 3a: 建立 `components/v2/cover/cover-icons.ts`**

```ts
import {
  BedDouble,
  Camera,
  Car,
  Compass,
  Globe,
  Heart,
  Leaf,
  Mountain,
  MountainSnow,
  Sparkles,
  Star,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"

// Lucide equivalents of COVER_ICONS (A9b cover picker tiles + CoverArt).
export const COVER_ICON_COMPONENTS: Record<string, LucideIcon> = {
  compass: Compass,
  leaf: Leaf,
  utensils: Utensils,
  globe: Globe,
  car: Car,
  bed: BedDouble,
  star: Star,
  camera: Camera,
  "fork-knife": UtensilsCrossed,
  hiking: MountainSnow,
  mountain: Mountain,
  heart: Heart,
  sparkle: Sparkles,
}
```

- [ ] **Step 3b: 改寫 `components/v2/cover/cover-art.tsx`**

```tsx
import Image from "next/image"
import { COVER_COLORS, getPresetCover, parseCover } from "@/lib/covers"
import { COVER_ICON_COMPONENTS } from "./cover-icons"

export function CoverArt({
  cover,
  className = "h-16 w-16 rounded-xl",
  iconClassName = "h-[26px] w-[26px]",
  variant = "default",
}: {
  cover: string | null
  className?: string
  iconClassName?: string
  variant?: "default" | "solid"
}) {
  const parsed = parseCover(cover)
  const box = `relative flex shrink-0 items-center justify-center overflow-hidden ${className}`

  if (parsed.type === "custom" && parsed.customUrl) {
    return (
      <div data-testid="cover-art" data-cover="custom" className={box}>
        <Image src={parsed.customUrl} alt="Custom cover" fill className="object-cover" unoptimized />
      </div>
    )
  }
  if (parsed.type === "preset") {
    const preset = getPresetCover(parsed.presetId!)
    if (preset) {
      return (
        <div data-testid="cover-art" data-cover={`preset:${preset.id}`} className={`${box} text-2xl`} style={{ background: preset.gradient }}>
          <span aria-hidden="true">{preset.emoji}</span>
        </div>
      )
    }
  }
  const iconId = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const color = COVER_COLORS.find((c) => c.id === (parsed.type === "icon" ? parsed.colorId : "lake")) ?? COVER_COLORS[0]
  const Icon = COVER_ICON_COMPONENTS[iconId] ?? COVER_ICON_COMPONENTS.leaf
  const solid = variant === "solid"
  return (
    <div
      data-testid="cover-art"
      data-cover={`icon:${iconId}`}
      data-cover-art=""
      {...(solid ? { "data-cover-art-solid": "" } : {})}
      className={box}
      style={
        {
          "--cover-fg": solid ? "var(--v2-on-lake)" : color.fg,
          "--cover-bg": solid ? color.fg : color.bg,
          "--cover-fg-dark": solid ? "var(--v2-on-lake)" : color.darkFg,
          "--cover-bg-dark": solid ? color.darkFg : color.darkBg,
        } as React.CSSProperties
      }
    >
      <Icon className={iconClassName} strokeWidth={1.5} aria-hidden="true" />
    </div>
  )
}
```

（`solid` 重複使用既有 `[data-cover-art]` 與 `.dark [data-ui="v2"] [data-cover-art]` CSS 規則切換 bg，因此**不需要**改 `app/globals.css`。）

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/cover.test.tsx`
Expected: PASS（此檔其餘 `CoverPickerV2` 測試仍為舊版；Task 4.4 會改，暫時保持綠）。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/cover/cover-icons.ts components/v2/cover/cover-art.tsx tests/components/v2/cover.test.tsx
git commit -m "feat: Add cover icon map and solid cover art variant"
```

---

## Task 4.4：重設計 `CoverPickerV2`（圓形圖示磚、更多圖示、移除上傳）

**Files:**
- Modify: `components/v2/cover/cover-picker-v2.tsx`
- Modify: `tests/components/v2/cover.test.tsx`（`describe("CoverPickerV2", ...)`）

- [ ] **Step 1: 改寫失敗的測試**

把 `tests/components/v2/cover.test.tsx` 檔頭 import 與 `describe("CoverPickerV2", ...)` 整個區塊替換為（移除 `@/lib/image-utils` mock 與上傳測試）：

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
import { CoverArt } from "@/components/v2/cover/cover-art"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"
```

```tsx
describe("CoverPickerV2", () => {
  it("picks icon then color, keeping the other part", () => {
    const onChange = vi.fn()
    const { rerender } = render(<CoverPickerV2 value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "汽車" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:car;color:lake")
    rerender(<CoverPickerV2 value="icon:car;color:lake" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "汽車" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "顏色 gold" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:car;color:gold")
  })
  it("shows the disabled more-icons placeholder, the new icons and hides red", () => {
    render(<CoverPickerV2 value={null} onChange={vi.fn()} />)
    const more = screen.getByRole("button", { name: "更多圖示" })
    expect(more).toBeDisabled()
    expect(more).toHaveAttribute("title", "即將推出")
    expect(screen.getByRole("button", { name: "相機" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "亮點" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "顏色 red" })).not.toBeInTheDocument()
  })
  it("offers no upload but can remove a custom image", () => {
    const onChange = vi.fn()
    const { container } = render(<CoverPickerV2 value="data:image/webp;base64,AAAA" onChange={onChange} />)
    expect(screen.queryByText("或上傳自訂圖片")).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "移除自訂圖片" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:leaf;color:lake")
  })
  it("marks the selected color tile", () => {
    render(<CoverPickerV2 value="icon:car;color:gold" onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "顏色 gold" })).toHaveAttribute("aria-pressed", "true")
  })
  it("does not submit form when clicking icon or color buttons", () => {
    const onChange = vi.fn()
    const submit = vi.fn()
    const { rerender } = render(
      <form onSubmit={submit}>
        <CoverPickerV2 value={null} onChange={onChange} />
      </form>
    )
    fireEvent.click(screen.getByRole("button", { name: "汽車" }))
    expect(submit).not.toHaveBeenCalled()
    rerender(
      <form onSubmit={submit}>
        <CoverPickerV2 value="icon:car;color:lake" onChange={onChange} />
      </form>
    )
    fireEvent.click(screen.getByRole("button", { name: "顏色 gold" }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "汽車" })).toHaveAttribute("aria-pressed", "true")
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/cover.test.tsx`
Expected: FAIL（找不到「更多圖示」、仍可找到「顏色 red」、仍有上傳按鈕／file input）。

- [ ] **Step 3: 改寫 `components/v2/cover/cover-picker-v2.tsx`**

```tsx
"use client"

import { COVER_ICONS, COVER_PICKER_COLORS, DEFAULT_ICON_COVER, buildIconCover, parseCover } from "@/lib/covers"
import { COVER_ICON_COMPONENTS } from "./cover-icons"

export function CoverPickerV2({ value, onChange, disabled }: { value: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const parsed = parseCover(value)
  const currentIcon = parsed.type === "icon" ? parsed.iconId! : "leaf"
  const currentColor = parsed.type === "icon" ? parsed.colorId! : "lake"
  const isCustom = parsed.type === "custom"

  const handleIconClick = (iconId: string) => onChange(buildIconCover(iconId, currentColor))
  const handleColorClick = (colorId: string) => onChange(buildIconCover(currentIcon, colorId))

  const rows = [COVER_ICONS.slice(0, 7), COVER_ICONS.slice(7)]

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">圖示</p>
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-between">
              {row.map((icon) => {
                const Icon = COVER_ICON_COMPONENTS[icon.id] ?? COVER_ICON_COMPONENTS.leaf
                const selected = parsed.type === "icon" && parsed.iconId === icon.id
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => handleIconClick(icon.id)}
                    disabled={disabled}
                    aria-label={icon.label}
                    aria-pressed={selected}
                    className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border transition-all disabled:opacity-50 ${
                      selected ? "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft text-v2-lake" : "border-v2-line bg-v2-surface text-v2-ink-muted"
                    }`}
                  >
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.6} aria-hidden="true" />
                  </button>
                )
              })}
              {rowIndex === rows.length - 1 && (
                <button
                  type="button"
                  disabled
                  title="即將推出"
                  aria-label="更多圖示"
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-v2-line bg-v2-sand text-v2-ink-muted disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <circle cx="6" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="18" cy="12" r="1.6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-v2-ink-muted">顏色</p>
        <div className="flex justify-between">
          {COVER_PICKER_COLORS.map((color) => {
            const selected = currentColor === color.id
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => handleColorClick(color.id)}
                disabled={disabled}
                aria-label={`顏色 ${color.id}`}
                aria-pressed={selected}
                data-cover-art=""
                data-cover-color-tile=""
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
                style={
                  {
                    "--cover-bg": color.fg,
                    "--cover-bg-dark": color.darkFg,
                    "--cover-fg": "var(--v2-surface)",
                    "--cover-fg-dark": "var(--v2-surface)",
                    boxShadow: selected ? `0 0 0 2px var(--v2-surface), 0 0 0 3.5px ${color.fg}` : undefined,
                  } as React.CSSProperties
                }
              >
                {selected && (
                  <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {isCustom && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ICON_COVER)}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-lg border border-v2-line px-3 py-2 text-sm text-v2-ink transition-colors hover:bg-v2-surface disabled:opacity-50"
        >
          移除自訂圖片
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/cover.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/cover/cover-picker-v2.tsx tests/components/v2/cover.test.tsx
git commit -m "feat: Redesign v2 cover picker with circular tiles and no upload"
```

---

## Task 4.5：新增 `V2CurrencyField`（`currencyLabel` / `currencySymbol`）

**Files:**
- Create: `components/v2/ui/currency-field.tsx`
- Create: `tests/components/v2/v2-currency-field.test.tsx`

- [ ] **Step 1: 寫失敗的測試**

建立 `tests/components/v2/v2-currency-field.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/components/ui/currency-select", () => ({
  CurrencySelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="幣別選擇" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="TWD">TWD</option>
      <option value="JPY">JPY</option>
    </select>
  ),
}))

import { V2CurrencyField, currencyLabel, currencySymbol } from "@/components/v2/ui/currency-field"

describe("currencyLabel", () => {
  it("uses the short name when short is true", () => {
    expect(currencyLabel("TWD", true)).toBe("TWD 台幣")
    expect(currencyLabel("JPY", true)).toBe("JPY 日圓")
  })
  it("uses the full name by default", () => {
    expect(currencyLabel("TWD")).toBe("TWD 新台幣")
    expect(currencyLabel("USD")).toBe("USD 美元")
  })
  it("falls back to the raw code for unknown currencies", () => {
    expect(currencyLabel("XXX")).toBe("XXX")
  })
})

describe("currencySymbol", () => {
  it("maps known settlement currencies", () => {
    expect(currencySymbol("TWD")).toBe("NT$")
    expect(currencySymbol("JPY")).toBe("¥")
    expect(currencySymbol("USD")).toBe("$")
  })
  it("falls back to the currency code", () => {
    expect(currencySymbol("EUR")).toBe("EUR")
  })
})

describe("V2CurrencyField", () => {
  it("shows the full label by default and reports changes", () => {
    const onChange = vi.fn()
    render(<V2CurrencyField value="TWD" onChange={onChange} />)
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("幣別選擇"), { target: { value: "JPY" } })
    expect(onChange).toHaveBeenCalledWith("JPY")
  })
  it("shows the short label when requested", () => {
    render(<V2CurrencyField value="TWD" onChange={vi.fn()} short />)
    expect(screen.getByText("TWD 台幣")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/v2-currency-field.test.tsx`
Expected: FAIL（模組 `components/v2/ui/currency-field` 不存在）。

- [ ] **Step 3: 建立 `components/v2/ui/currency-field.tsx`**

```tsx
"use client"

import { ChevronDown } from "lucide-react"
import { CurrencySelect } from "@/components/ui/currency-select"
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies"

// A9b shows the short name (台幣); A13/A14 show the full name (新台幣) (D22).
const SHORT_NAMES: Record<string, string> = { TWD: "台幣" }
// D10: budget prefix is the settlement currency symbol, no thousand separators.
const SYMBOLS: Record<string, string> = { TWD: "NT$", JPY: "¥", USD: "$" }

export function currencyLabel(code: string, short = false): string {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  if (!info) return code
  if (short) return `${info.code} ${SHORT_NAMES[info.code] ?? info.name}`
  return `${info.code} ${info.name}`
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

// v2-styled select trigger over the shared CurrencySelect (v1 component untouched).
export function V2CurrencyField({
  value,
  onChange,
  disabled,
  short = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  short?: boolean
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="flex w-full items-center justify-between rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] font-semibold text-v2-ink"
      >
        <span>{currencyLabel(value, short)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-v2-ink-subtle" />
      </div>
      <CurrencySelect
        value={value as CurrencyCode}
        onChange={(next) => onChange(next)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  )
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/v2-currency-field.test.tsx`
Expected: PASS。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/ui/currency-field.tsx tests/components/v2/v2-currency-field.test.tsx
git commit -m "feat: Add v2 currency field with code and name labels"
```

---

## Task 4.6：`JoinModePicker` variant 與 `DateRangeField` 觸發樣式

**Files:**
- Modify: `components/v2/project/join-mode-picker.tsx`
- Modify: `components/v2/project/date-range-field.tsx`
- Create: `tests/components/v2/join-mode-picker.test.tsx`

- [ ] **Step 1: 寫失敗的測試**

建立 `tests/components/v2/join-mode-picker.test.tsx`：

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"

describe("JoinModePicker", () => {
  it("renders the create variant with its own title and lake-mid radios", () => {
    const onChange = vi.fn()
    render(<JoinModePicker value="both" onChange={onChange} />)
    expect(screen.getByText("成員加入方式")).toBeInTheDocument()
    const selected = screen.getByLabelText("兩者皆可").closest("label")!
    expect(selected.className).toContain("border-v2-lake-mid")
    const unselected = screen.getByLabelText("僅建立新成員").closest("label")!
    expect(unselected.className).toContain("bg-v2-paper")
    fireEvent.click(screen.getByLabelText("僅建立新成員"))
    expect(onChange).toHaveBeenCalledWith("create_only")
  })

  it("renders the settings variant without a duplicated title", () => {
    render(<JoinModePicker value="both" onChange={vi.fn()} variant="settings" />)
    expect(screen.queryByText("成員加入方式")).not.toBeInTheDocument()
    const selected = screen.getByLabelText("兩者皆可").closest("label")!
    expect(selected.className).toContain("rounded-[14px]")
    expect(selected.className).toContain("border-v2-lake")
    const unselected = screen.getByLabelText("僅取代佔位成員").closest("label")!
    expect(unselected.className).toContain("bg-v2-surface")
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/join-mode-picker.test.tsx`
Expected: FAIL（`variant` prop 不存在；settings 仍會渲染「成員加入方式」）。

- [ ] **Step 3a: 改寫 `components/v2/project/join-mode-picker.tsx`**

```tsx
import { JOIN_MODE_OPTIONS, type JoinMode } from "@/lib/hooks/use-project-form"

// Shared "成員加入方式" radio-card group. "create" is A9b (owns its card
// title/legend); "settings" is A13 (the card renders the title itself).
export function JoinModePicker({
  value,
  onChange,
  disabled,
  variant = "create",
}: {
  value: JoinMode
  onChange: (value: JoinMode) => void
  disabled?: boolean
  variant?: "create" | "settings"
}) {
  const settings = variant === "settings"
  return (
    <fieldset>
      {!settings && (
        <>
          <legend className="mb-0.5 text-[13px] font-bold text-v2-lake">成員加入方式</legend>
          <p className="mb-2.5 text-xs text-v2-ink-subtle">設定新成員透過分享連結加入時的方式</p>
        </>
      )}
      <div className="flex flex-col gap-2">
        {JOIN_MODE_OPTIONS.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 border px-3.5 py-3 ${
                settings ? "rounded-[14px]" : "rounded-xl"
              } ${
                checked
                  ? settings
                    ? "border-[1.5px] border-v2-lake bg-v2-lake-soft"
                    : "border-[1.5px] border-v2-lake-mid bg-v2-lake-soft"
                  : settings
                    ? "border-v2-line bg-v2-surface"
                    : "border-v2-line bg-v2-paper"
              }`}
            >
              <input
                type="radio"
                name="v2-join-mode"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                aria-label={option.label}
              />
              {settings ? (
                <span aria-hidden="true" className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${checked ? "bg-v2-lake" : "border-[1.5px] border-v2-check"}`}>
                  {checked && <span className="h-1.5 w-1.5 rounded-full bg-v2-surface" />}
                </span>
              ) : (
                <span aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${checked ? "border-[5px] border-v2-lake-mid" : "border-[1.5px] border-v2-check"}`} />
              )}
              <span>
                <span className={`block leading-5 tracking-[.1px] ${settings ? `text-[13px] ${checked ? "font-bold" : "font-semibold"}` : "text-sm font-bold"}`}>{option.label}</span>
                <span className="mt-0.5 block text-xs text-v2-ink-muted">{option.description}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 3b: 修改 `components/v2/project/date-range-field.tsx`**

把 props 加上 `triggerClassName?: string`：

```tsx
export function DateRangeField({
  label,
  startDate,
  endDate,
  onChange,
  disabled,
  triggerClassName,
}: {
  label: string
  startDate: string | null
  endDate: string | null
  onChange: (start: string | null, end: string | null) => void
  disabled?: boolean
  triggerClassName?: string
}) {
```

把觸發按鈕 className 由 `bg-v2-surface` 改為 `bg-v2-paper`，並附加 `triggerClassName`：

```tsx
          <button
            type="button"
            disabled={disabled}
            className={`flex w-full items-center gap-2 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-left text-[13px] ${triggerClassName ?? ""}`}
          >
```

其餘邏輯（Popover / Calendar / onSelect）**不變**。

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/join-mode-picker.test.tsx tests/components/v2/new-project-v2.test.tsx tests/components/v2/project-settings-v2.test.tsx`
Expected: 新測 PASS；`new-project-v2` / `project-settings-v2` 可能因尚未改版而仍需綠（若紅，先把 Task 4.7/4.8 做完再回跑此步；設計上它們不檢查 join-mode 標題）。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/project/join-mode-picker.tsx components/v2/project/date-range-field.tsx tests/components/v2/join-mode-picker.test.tsx
git commit -m "feat: Add join mode picker settings variant and date trigger class"
```

---

## Task 4.7：A9b 建立旅程（卡片化 ＋ 幣別/預算 ＋ 封面）

**Files:**
- Modify: `components/v2/new-project/new-project-v2.tsx`
- Modify: `components/v2/new-project/trip-preview-card.tsx`
- Modify: `tests/components/v2/new-project-v2.test.tsx`

- [ ] **Step 1: 改寫失敗的測試**

在 `tests/components/v2/new-project-v2.test.tsx` 內：
(a) 保留檔頭既有 mock（特別是 `@/components/ui/currency-select` 的 mock）。
(b) 新增測試：

```tsx
  it("renders the section cards and the short currency label", () => {
    render(<NewProjectV2 />)
    for (const title of ["卡片預覽", "封面", "基本資訊", "描述（選填）", "成員加入方式"]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText("JPY 日圓")).toBeInTheDocument()
    expect(screen.getByText("¥")).toBeInTheDocument()
  })
```

(c) 在既有 `submits the create payload...` 測試中，於送出前追加一行斷言：

```tsx
    expect(screen.getByText("JPY 日圓")).toBeInTheDocument()
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/new-project-v2.test.tsx`
Expected: FAIL（找不到「卡片預覽」等卡片標題、找不到「JPY 日圓」與「¥」）。

- [ ] **Step 3a: 改寫 `components/v2/new-project/trip-preview-card.tsx`**

```tsx
import { CoverArt } from "@/components/v2/cover/cover-art"
import { parseLocalDate, slashDate } from "@/components/v2/project/date-utils"

// "卡片預覽" preview at the top of the new-trip form: reflects the cover,
// name and date range as they're being filled in. The card title is rendered
// by NewProjectV2.
export function TripPreviewCard({
  cover,
  name,
  startDate,
  endDate,
}: {
  cover: string | null
  name: string
  startDate: string | null
  endDate: string | null
}) {
  const dayCount =
    startDate && endDate
      ? Math.round((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / 86400000) + 1
      : null
  const dateLine =
    startDate || endDate
      ? `${slashDate(startDate ?? endDate!)} – ${slashDate(endDate ?? startDate!)} · 尚未邀請旅伴`
      : "尚未設定日期 · 尚未邀請旅伴"

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-v2-line bg-v2-surface p-3 shadow-[0_2px_8px_rgba(27,24,21,.05)]">
      <CoverArt cover={cover} className="h-16 w-16 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`m-0 truncate font-v2-serif text-base font-medium ${name ? "text-v2-ink" : "text-v2-ink-subtle"}`}>{name || "峇里島放鬆之旅"}</h3>
          <span className="shrink-0 rounded-full bg-v2-line px-2.5 py-[3px] text-xs font-bold leading-4 text-v2-ink-muted">
            {dayCount !== null ? `${dayCount} 天` : "— 天"}
          </span>
        </div>
        <p className="mb-2 mt-0.5 truncate text-xs tracking-[.4px] text-v2-ink-subtle">{dateLine}</p>
        <div className="flex items-center justify-between">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-v2-surface bg-v2-lake-tint text-[8px] font-bold text-v2-lake">我</span>
          <p className="m-0 font-v2-serif text-base font-bold text-v2-ink-subtle">尚未記帳</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3b: 改寫 `components/v2/new-project/new-project-v2.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch } from "@/components/auth/liff-provider"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2CurrencyField, currencySymbol } from "@/components/v2/ui/currency-field"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { emptyProjectForm, toCreatePayload, useProjectForm } from "@/lib/hooks/use-project-form"
import { TripPreviewCard } from "./trip-preview-card"

const cardClass = "flex flex-col gap-4 rounded-2xl border border-v2-line bg-v2-surface p-4"
const titleClass = "m-0 text-[13px] font-bold text-v2-lake"
const labelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"

export function NewProjectV2() {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { preferences } = usePreferences()
  const { values, set, error: formError } = useProjectForm(emptyProjectForm(preferences.defaultCurrency))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (formError) {
      setError(formError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreatePayload(values)),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/projects/${data.id}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "建立失敗，請重試")
      }
    } catch {
      setError("建立失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <V2TopBar title="建立旅程" backHref="/projects" />
        <div className="flex flex-col gap-4 px-4 pb-32 pt-4">
          <div className={cardClass}>
            <p className={titleClass}>卡片預覽</p>
            <TripPreviewCard cover={values.cover} name={values.name} startDate={values.startDate} endDate={values.endDate} />
          </div>

          <div className={cardClass}>
            <p className={titleClass}>封面</p>
            <CoverPickerV2 value={values.cover} onChange={(cover) => set("cover", cover)} disabled={submitting} />
          </div>

          <div className={cardClass}>
            <p className={titleClass}>基本資訊</p>
            <div>
              <label htmlFor="v2-trip-name" className={labelClass}>
                旅程名稱 <span className="text-v2-danger">*</span>
              </label>
              <input
                id="v2-trip-name"
                aria-label="旅程名稱"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={submitting}
                placeholder="例如：日本關西 5 天、歐洲自由行"
                className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px] outline-none"
              />
            </div>

            <DateRangeField
              label="出發日與結束日"
              startDate={values.startDate}
              endDate={values.endDate}
              onChange={(start, end) => {
                set("startDate", start)
                set("endDate", end)
              }}
              disabled={submitting}
              triggerClassName="py-[13px]"
            />

            <div className="flex gap-2.5">
              <div className="flex-1">
                <label className={labelClass}>結算幣別</label>
                <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} disabled={submitting} short />
              </div>
              <div className="flex-1">
                <label htmlFor="v2-budget" className={labelClass}>
                  預算（選填）
                </label>
                <div className="flex items-center gap-1.5 rounded-xl border border-v2-line bg-v2-paper px-3.5 py-[13px]">
                  <span className="text-[13px] text-v2-ink-subtle">{currencySymbol(values.currency)}</span>
                  <input
                    id="v2-budget"
                    aria-label="預算"
                    inputMode="decimal"
                    value={values.budget}
                    onChange={(e) => set("budget", e.target.value)}
                    disabled={submitting}
                    placeholder="10000"
                    className="w-full bg-transparent text-[13px] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <p className="m-0 text-[13px] font-bold text-v2-lake">描述（選填）</p>
            <textarea
              id="v2-desc"
              aria-label="描述"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={submitting}
              placeholder="記錄這次旅行的目的地、日期等資訊……"
              rows={4}
              className="min-h-16 w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-[13px] text-xs outline-none"
            />
          </div>

          <div className={cardClass}>
            <JoinModePicker value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={submitting} />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
          <div className="mx-auto max-w-md">
            {error && (
              <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="w-full rounded-[14px] bg-v2-lake py-[15px] text-base font-bold text-v2-on-lake disabled:opacity-40"
            >
              {submitting ? "建立中…" : "建立旅程"}
            </button>
          </div>
        </div>
      </div>
    </UiV2Scope>
  )
}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/new-project-v2.test.tsx tests/components/v2/cover.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS（`submits the create payload` 的 payload 不變：`cover: "icon:car;color:lake"`、`currency: "JPY"`）。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/new-project/new-project-v2.tsx components/v2/new-project/trip-preview-card.tsx tests/components/v2/new-project-v2.test.tsx
git commit -m "feat: Rebuild A9b new trip form as cards with v2 fields"
```

---

## Task 4.8：A13 專案設定（封面磚抽屜、描述計數、幣別前綴、危險區塊）

**Files:**
- Create: `components/v2/cover/cover-tile-button.tsx`
- Modify: `components/v2/project-settings/project-settings-v2-view.tsx`
- Modify: `components/v2/project-settings/exchange-rate-row.tsx`
- Modify: `tests/components/v2/project-settings-v2.test.tsx`

- [ ] **Step 1: 改寫失敗的測試**

在 `tests/components/v2/project-settings-v2.test.tsx` 內追加下列測試（保留既有測試；`mockRoutes` 不變）：

```tsx
  it("shows the full currency label and the budget symbol", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
    expect(screen.getByText("NT$")).toBeInTheDocument()
  })

  it("shows a danger counter for long descriptions but still saves them (RC3)", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    const desc = await screen.findByLabelText("描述")
    expect(screen.getByText("6/50")).toBeInTheDocument()
    const long = "x".repeat(51)
    fireEvent.change(desc, { target: { value: long } })
    expect(screen.getByText("51/50")).toHaveClass("text-v2-danger")
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const putCall = mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
    expect(JSON.parse(putCall![1].body).description).toBe(long)
  })

  it("picks a cover through the tile sheet and saves it", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    fireEvent.click(screen.getByRole("button", { name: "更換封面" }))
    fireEvent.click(screen.getByRole("button", { name: "相機" }))
    fireEvent.click(screen.getByRole("button", { name: "顏色 ink" }))
    fireEvent.click(screen.getByRole("button", { name: "完成" }))
    fireEvent.click(screen.getByRole("button", { name: "儲存變更" }))
    await waitFor(() =>
      expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "PUT" }))
    )
    const putCall = mockAuthFetch.mock.calls.find(([url, opts]) => url === "/api/projects/p1" && opts?.method === "PUT")
    expect(JSON.parse(putCall![1].body).cover).toBe("icon:camera;color:ink")
  })

  it("uses the danger tokens for the danger zone", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByText("危險區域")
    const card = screen.getByText("危險區域").closest("div")!
    expect(card.className).toContain("bg-v2-danger-tint")
    expect(card.className).toContain("border-v2-danger-border")
  })

  it("renders the join-mode title only once in the settings variant", async () => {
    mockRoutes()
    render(<ProjectSettingsV2 projectId="p1" />)
    await screen.findByLabelText("專案名稱")
    expect(screen.getAllByText("成員加入方式")).toHaveLength(1)
  })
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/project-settings-v2.test.tsx`
Expected: FAIL（找不到「TWD 新台幣」／「NT$」／計數器／「更換封面」；危險區塊 class 仍是 `bg-v2-danger-soft`）。

- [ ] **Step 3a: 建立 `components/v2/cover/cover-tile-button.tsx`**

```tsx
"use client"

import { useState } from "react"
import { CoverArt } from "./cover-art"
import { CoverPickerV2 } from "./cover-picker-v2"

// A13 48px cover tile; opens a bottom sheet with the shared cover picker (D7).
export function CoverTileButton({ cover, onChange, disabled }: { cover: string | null; onChange: (cover: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-label="更換封面" disabled={disabled} onClick={() => setOpen(true)} className="shrink-0 disabled:opacity-40">
        <CoverArt cover={cover} variant="solid" className="h-12 w-12 rounded-[14px]" iconClassName="h-[22px] w-[22px]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-v2-overlay sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-v2-surface p-5 sm:rounded-2xl">
            <h2 className="m-0 mb-3 font-v2-serif text-base font-semibold">更換封面</h2>
            <CoverPickerV2 value={cover} onChange={onChange} disabled={disabled} />
            <button type="button" onClick={() => setOpen(false)} className="mt-4 w-full rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake">
              完成
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3b: 改寫 `components/v2/project-settings/project-settings-v2-view.tsx`**

```tsx
import { Trash2 } from "lucide-react"
import { CoverTileButton } from "@/components/v2/cover/cover-tile-button"
import { DateRangeField } from "@/components/v2/project/date-range-field"
import { JoinModePicker } from "@/components/v2/project/join-mode-picker"
import { V2CurrencyField, currencySymbol } from "@/components/v2/ui/currency-field"
import type { ProjectFormValues } from "@/lib/hooks/use-project-form"
import { ExchangeRateRow } from "./exchange-rate-row"

const cardClass = "flex flex-col gap-3.5 rounded-[18px] border border-v2-line bg-v2-surface p-4"
const cardTitleClass = "m-0 text-[13px] font-bold text-v2-lake"
const fieldLabelClass = "mb-2 block text-xs font-semibold text-v2-ink-muted"

export interface ProjectSettingsV2ViewProps {
  values: ProjectFormValues
  set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void
  expenseCurrencies: string[]
  rates: Record<string, number>
  isCreator: boolean
  saving: boolean
  submitError: string | null
  onCancel: () => void
  onSave: () => void
  onRequestDelete: () => void
}

function liveRate(rates: Record<string, number>, from: string, to: string, precision: number): number | null {
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!fromRate || !toRate) return null
  return Number((toRate / fromRate).toFixed(precision))
}

export function ProjectSettingsV2View(props: ProjectSettingsV2ViewProps) {
  const { values, set } = props
  const descriptionCount = values.description.length

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-32 pt-4">
      <div className={cardClass}>
        <p className={cardTitleClass}>基本資訊</p>
        <div>
          <label htmlFor="v2-project-name" className={fieldLabelClass}>
            專案名稱
          </label>
          <input
            id="v2-project-name"
            aria-label="專案名稱"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={props.saving}
            className="w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] font-semibold outline-none"
          />
        </div>
        <div>
          <p className={fieldLabelClass}>封面圖示與顏色</p>
          <div className="flex items-center gap-2.5">
            <CoverTileButton cover={values.cover} onChange={(cover) => set("cover", cover)} disabled={props.saving} />
            <span className="text-xs text-v2-ink-muted">點擊更換圖示與底色</span>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="v2-project-desc" className="block text-xs font-semibold text-v2-ink-muted">
              描述（選填）
            </label>
            <span className={`text-xs ${descriptionCount > 50 ? "text-v2-danger" : "text-v2-ink-subtle"}`}>{descriptionCount}/50</span>
          </div>
          <textarea
            id="v2-project-desc"
            aria-label="描述"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={props.saving}
            rows={4}
            className="min-h-16 w-full rounded-xl border border-v2-line bg-v2-paper px-3.5 py-3 text-[13px] outline-none"
          />
        </div>
      </div>

      <div className={cardClass}>
        <p className={cardTitleClass}>日期與預算</p>
        <DateRangeField
          label="出發日與結束日"
          startDate={values.startDate}
          endDate={values.endDate}
          onChange={(start, end) => {
            set("startDate", start)
            set("endDate", end)
          }}
          disabled={props.saving}
        />
        <div>
          <label htmlFor="v2-project-budget" className={fieldLabelClass}>
            旅程預算（選填）
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-v2-ink-muted">{currencySymbol(values.currency)}</span>
            <input
              id="v2-project-budget"
              aria-label="旅程預算"
              inputMode="decimal"
              value={values.budget}
              onChange={(e) => set("budget", e.target.value)}
              disabled={props.saving}
              className="w-full rounded-xl border border-v2-line bg-v2-paper py-3 pl-[26px] pr-3.5 text-[13px] outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-v2-ink-subtle">設定預算後，可在旅程總覽查看花費進度</p>
        </div>
      </div>

      <div className={cardClass}>
        <p className={cardTitleClass}>幣別與匯率</p>
        <div>
          <label className={fieldLabelClass}>結算幣別</label>
          <V2CurrencyField value={values.currency} onChange={(c) => set("currency", c)} disabled={props.saving} />
          <p className="mt-1.5 text-xs text-v2-ink-subtle">所有費用將以此幣別進行結算計算</p>
        </div>

        {props.expenseCurrencies.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-v2-ink-muted">自訂匯率（選填）</label>
            <p className="mb-2 text-xs text-v2-ink-subtle">不設定則使用即時匯率</p>
            <div className="flex flex-col gap-3">
              {props.expenseCurrencies.map((curr) => (
                <ExchangeRateRow
                  key={curr}
                  currency={curr}
                  settlementCurrency={values.currency}
                  value={values.customRates[curr] ?? ""}
                  liveRate={liveRate(props.rates, curr, values.currency, values.exchangeRatePrecision)}
                  onChange={(rate) => set("customRates", { ...values.customRates, [curr]: rate })}
                  disabled={props.saving}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="v2-rate-precision" className={fieldLabelClass}>
            匯率計算精度
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="v2-rate-precision"
              aria-label="匯率計算精度"
              type="number"
              min={0}
              max={8}
              step={1}
              value={values.exchangeRatePrecision}
              onChange={(e) => set("exchangeRatePrecision", Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
              disabled={props.saving}
              className="w-14 rounded-xl border border-v2-line bg-v2-paper px-3 py-2.5 text-center text-[13px] font-semibold outline-none"
            />
            <span className="text-xs text-v2-ink-muted">位小數，影響匯率顯示與結算四捨五入</span>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div>
          <p className={cardTitleClass}>成員加入方式</p>
          <p className="mt-1 text-xs text-v2-ink-subtle">設定新成員透過分享連結加入時的方式</p>
        </div>
        <JoinModePicker variant="settings" value={values.joinMode} onChange={(v) => set("joinMode", v)} disabled={props.saving} />
      </div>

      {props.isCreator && (
        <div className="rounded-[18px] border border-v2-danger-border bg-v2-danger-tint p-4">
          <p className="m-0 mb-1 text-[13px] font-bold text-v2-danger-strong">危險區域</p>
          <p className="m-0 mb-3 text-xs text-v2-danger-strong">刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。</p>
          <button
            type="button"
            onClick={props.onRequestDelete}
            disabled={props.saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-v2-danger-strong px-4 py-[9px] text-xs font-bold text-v2-on-lake disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            刪除專案
          </button>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-v2-line bg-v2-surface px-4 py-3.5">
        <div className="mx-auto max-w-md">
          {props.submitError && (
            <p role="alert" className="mb-2 text-center text-xs font-semibold text-v2-danger">
              {props.submitError}
            </p>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={props.onCancel}
              disabled={props.saving}
              className="flex-1 rounded-[14px] border border-v2-line bg-v2-surface py-3.5 text-sm font-bold disabled:opacity-40"
            >
              取消
            </button>
            <button
              type="button"
              onClick={props.onSave}
              disabled={props.saving}
              className="flex-1 rounded-[14px] bg-v2-lake py-3.5 text-sm font-bold text-v2-on-lake disabled:opacity-40"
            >
              {props.saving ? "儲存中…" : "儲存變更"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3c: 修改 `components/v2/project-settings/exchange-rate-row.tsx`**

把 label 寬度、input、suffix、hint 改成：

```tsx
      <div className="flex items-center gap-2.5">
        <span className="w-[52px] shrink-0 text-[13px] font-bold text-v2-lake">{currency}</span>
        <span className="text-v2-ink-subtle">=</span>
        <div className="relative flex-1">
          <input
            aria-label={`${currency} 匯率`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            inputMode="decimal"
            className="w-full rounded-xl border border-v2-line bg-v2-paper py-[10px] pl-3 pr-11 text-[13px]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-v2-ink-muted">{settlementCurrency}</span>
        </div>
      </div>
      {liveRate !== null && (
        <p className="mt-2 text-xs text-v2-ink-muted">
          目前使用即時匯率：1 {currency} = {liveRate} {settlementCurrency}
        </p>
      )}
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/project-settings-v2.test.tsx tests/components/v2/v2-currency-field.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。特別是舊測試 `saves the edited values via PUT` 仍須 `cover: "icon:leaf;color:lake"`；`shows the loaded custom rate for JPY` 仍找到 `JPY 匯率`。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/cover/cover-tile-button.tsx components/v2/project-settings/project-settings-v2-view.tsx components/v2/project-settings/exchange-rate-row.tsx tests/components/v2/project-settings-v2.test.tsx
git commit -m "feat: Add A13 cover tile sheet, description counter and danger tokens"
```

---

## Task 4.9：A14 通用設定（外觀卡片、幣別欄、移除分帳方式）

**Files:**
- Modify: `components/v2/settings/general-settings-v2.tsx`
- Modify: `tests/components/v2/general-settings-v2.test.tsx`

- [ ] **Step 1: 改寫失敗的測試**

在 `tests/components/v2/general-settings-v2.test.tsx`：
(a) **刪除** `switches the default split mode to custom` 測試（原檔案第 107–111 行）。
(b) 在 `switches appearance to dark and marks the active option` 測試內，於斷言後追加：

```tsx
    expect(screen.getByRole("button", { name: "淺色" }).querySelector("svg")).not.toBeNull()
```

(c) 新增兩個測試：

```tsx
  it("no longer shows the default split mode control", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.queryByText("預設分帳方式")).not.toBeInTheDocument()
  })

  it("shows the full default currency label", () => {
    render(<GeneralSettingsV2 />)
    expect(screen.getByText("TWD 新台幣")).toBeInTheDocument()
  })
```

- [ ] **Step 2: 執行測試，確認失敗**

Run: `npx vitest run tests/components/v2/general-settings-v2.test.tsx`
Expected: FAIL（仍找得到「預設分帳方式」；找不到「TWD 新台幣」；外觀卡片內沒有 svg）。

- [ ] **Step 3: 改寫 `components/v2/settings/general-settings-v2.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, ChevronRight, ExternalLink, HelpCircle, Loader2, MessageCircle, Monitor, Moon, Sun, Wallet } from "lucide-react"
import { useLiff } from "@/components/auth/liff-provider"
import { useTheme } from "@/components/system/theme-provider"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2CurrencyField } from "@/components/v2/ui/currency-field"
import type { CurrencyCode } from "@/lib/constants/currencies"
import { useOnboarding } from "@/lib/hooks"
import { useBetaToggle } from "@/lib/hooks/use-beta-toggle"
import { usePreferences } from "@/lib/hooks/use-preferences"
import type { NotificationPreferences } from "@/types/user-preferences"

const FEEDBACK_URL = "https://line.me/R/ti/p/@386mbqva"

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "expenseCreated", label: "新增支出時通知" },
  { key: "expenseUpdated", label: "更新支出時通知" },
  { key: "expenseDeleted", label: "刪除支出時通知" },
]

const APPEARANCE_OPTIONS = [
  { value: "light", label: "淺色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "系統" },
] as const

const APPEARANCE_ICONS = { light: Sun, dark: Moon, system: Monitor } as const

const cardClass = "rounded-[18px] border border-v2-line bg-v2-surface p-4"
const cardTitleClass = "m-0 text-[13px] font-bold text-v2-lake"

export function GeneralSettingsV2() {
  const router = useRouter()
  const { user } = useLiff()
  const { preferences, save, error } = usePreferences()
  const { theme, setTheme } = useTheme()
  const { enabled: betaEnabled, toggle: betaToggle, saving: betaSaving, error: betaError } = useBetaToggle()
  const { resetOnboarding } = useOnboarding()
  const [resettingTour, setResettingTour] = useState(false)

  const displayName = user?.name || "使用者"

  async function handleResetTour() {
    setResettingTour(true)
    await resetOnboarding()
    setResettingTour(false)
    router.push("/projects")
  }

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <V2TopBar title="通用設定" backHref="/projects" />
        <div className="flex flex-col gap-3.5 p-4">
          {error && (
            <p role="alert" className="text-center text-xs font-semibold text-v2-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            aria-label="編輯個人資料"
            onClick={() => router.push("/settings/profile")}
            className="flex items-center gap-3.5 rounded-[18px] bg-v2-lake p-4 text-left text-v2-paper"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-v2-paper/15 text-base font-bold">
              {displayName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <p className="m-0 font-v2-serif text-[15px] font-semibold">{displayName}</p>
              <p className="mt-0.5 text-xs opacity-75">LINE 用戶 · 點擊編輯個人資料</p>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
          </button>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <p className={cardTitleClass}>新版介面</p>
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[13px] font-bold">試用新版介面（Beta）</span>
                <span className="mt-0.5 block text-xs text-v2-ink-subtle">關閉後回到舊版介面</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={betaEnabled}
                aria-label="試用新版介面（Beta）"
                disabled={betaSaving}
                onClick={() => betaToggle(!betaEnabled)}
                className={`relative inline-block h-[19px] w-8 shrink-0 rounded-full disabled:opacity-60 ${
                  betaEnabled ? "bg-v2-lake" : "bg-v2-check"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-v2-knob transition-[left] ${
                    betaEnabled ? "left-[15px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            {betaError && (
              <p role="alert" className="text-xs font-semibold text-v2-danger">
                {betaError}
              </p>
            )}
          </div>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <p className={cardTitleClass}>外觀</p>
            <div className="flex gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const active = theme === option.value
                const Icon = APPEARANCE_ICONS[option.value]
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 ${
                      active ? "border-[1.5px] border-v2-lake bg-v2-lake-soft" : "border-v2-line bg-v2-paper"
                    }`}
                  >
                    <Icon aria-hidden="true" className={`h-4 w-4 ${active ? "text-v2-lake" : "text-v2-ink-muted"}`} />
                    <span className={`text-xs ${active ? "font-bold text-v2-lake" : "font-semibold text-v2-ink-muted"}`}>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={`${cardClass} flex flex-col gap-3.5`}>
            <div className="flex items-center gap-2">
              <Wallet className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <p className={cardTitleClass}>記帳偏好</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-v2-ink-muted">預設幣別</label>
              <V2CurrencyField
                value={preferences.defaultCurrency}
                onChange={(currency) => save({ defaultCurrency: currency as CurrencyCode })}
              />
              <p className="mt-1.5 text-xs text-v2-ink-subtle">新增支出時優先使用此幣別</p>
            </div>
          </div>

          <div className={`${cardClass} flex flex-col gap-3`}>
            <div className="flex items-center gap-2">
              <Bell className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <p className={cardTitleClass}>LINE 通知</p>
            </div>
            <p className="m-0 text-xs text-v2-ink-subtle">控制支出操作時是否發送 LINE 群組通知</p>
            {NOTIFICATION_ITEMS.map((item) => {
              const checked = preferences.notifications[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={item.label}
                  onClick={() => save({ notifications: { [item.key]: !checked } })}
                  className="flex w-full items-center justify-between"
                >
                  <span className="text-[13px]">{item.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                      checked ? "bg-v2-lake" : "border-[1.5px] border-v2-check"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-v2-on-lake" aria-hidden="true">
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleResetTour}
            disabled={resettingTour}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span>
              <span className="flex items-center gap-2">
                <HelpCircle className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
                <span className="text-[13px] font-bold">重看導覽</span>
              </span>
              <span className="mt-1 block text-xs text-v2-ink-subtle">進入任一旅程時會重新顯示導覽</span>
            </span>
            {resettingTour ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-v2-ink-muted" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-v2-ink-subtle" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => window.open("/", "_blank")}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <span className="text-[13px] font-bold">功能介紹</span>
            </span>
            <ExternalLink className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => window.open(FEEDBACK_URL, "_blank")}
            className={`${cardClass} flex items-center justify-between text-left`}
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-[15px] w-[15px] text-v2-lake" aria-hidden="true" />
              <span className="text-[13px] font-bold">意見回饋</span>
            </span>
            <ExternalLink className="h-[13px] w-[13px] shrink-0 text-v2-ink-subtle" aria-hidden="true" />
          </button>
        </div>
      </div>
    </UiV2Scope>
  )
}
```

（`preferences.defaultSplitMode` 資料／API **保留不動**（v1 與 A3 使用）；只移除 UI 控制項。D11：Beta 卡保留。）

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run tests/components/v2/general-settings-v2.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Lint 並 commit**

```bash
npm run lint
git add components/v2/settings/general-settings-v2.tsx tests/components/v2/general-settings-v2.test.tsx
git commit -m "feat: Redesign A14 appearance cards and drop split mode control"
```

---

## Task 4.10：Part 4 驗證（測試、覆蓋率、v1 保護、lint、build）

**Files:** 無（只驗證）

- [ ] **Step 1: 跑本 Part 觸及的所有測試**

Run:
```bash
npx vitest run tests/lib/covers-icon.test.ts tests/lib/covers.test.ts tests/components/v2/cover.test.tsx tests/components/v2/new-project-v2.test.tsx tests/components/v2/project-settings-v2.test.tsx tests/components/v2/general-settings-v2.test.tsx tests/components/v2/join-mode-picker.test.tsx tests/components/v2/v2-currency-field.test.tsx tests/components/v2/v2-tokens.test.ts tests/components/v2/no-hardcoded-colors.test.ts
```
Expected: 全部 PASS。

- [ ] **Step 2: 完整測試**

Run: `npm run test:run`
Expected: 全部 PASS（含 v1 測試）。

- [ ] **Step 3: 覆蓋率比對**

Run: `npx vitest run --coverage > /tmp/cov-m6p4.txt 2>&1`
然後：
```bash
sed 's/\x1b\[[0-9;]*m//g' /tmp/cov-m6p4.txt | grep -E "components/v2/(new-project|project-settings|settings|cover|ui)|lib/covers.ts"
```
Expected：
- `components/v2/new-project` Lines ≥ 84.37。
- `components/v2/project-settings` Lines ≥ 81.81。
- `components/v2/settings` Lines ≥ 90.00。
- `components/v2/cover` Lines ≥ 95.45。
- `lib/covers.ts` Lines ≥ 97.14。
- 新檔案 Lines ≥ 90：`components/v2/cover/cover-icons.ts`、`components/v2/cover/cover-tile-button.tsx`、`components/v2/ui/currency-field.tsx`。

不符合 → 用輸出的 `Uncovered Line #s` 補測試，重跑本 Step。

- [ ] **Step 4: v1 保護驗證（輸出必須為空）**

Run:
```bash
git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts
```
Expected: 沒有輸出。若有輸出 → `git checkout 36633e1 -- <檔案>` 還原並回報原因。

- [ ] **Step 5: 確認只動了允許的檔案**

Run: `git diff --name-only 36633e1`
Expected: 每行都以 `components/v2/`、`tests/`、`docs/` 開頭，或剛好是 `lib/covers.ts`。出現其他路徑 → 停止並回報。

- [ ] **Step 6: Lint 與 build**

Run: `npm run lint && npm run build`
Expected: 兩者成功。

- [ ] **Step 7: Review Focus grep**

Run:
```bash
grep -n "red" tests/lib/covers-icon.test.ts
grep -n "toLegacyCover" tests/lib/covers-icon.test.ts
grep -n "50" tests/components/v2/project-settings-v2.test.tsx
```
Expected: 每條都有結果（RC1 與 RC3 都有測試）。

- [ ] **Step 8: 最終 commit（若 Step 3/4/6 有補測試或修正）**

```bash
git add -A components/v2 tests lib/covers.ts
git commit -m "test: Verify milestone 6 part 4 forms"
```
若沒有任何修改則跳過。

---

## 已知偏差 / 執行後回報

1. A13 封面抽屜（`CoverTileButton` 底部彈層）為自行補上，設計稿未畫（D7）。
2. `V2CurrencyField` 以透明覆蓋既有的 `CurrencySelect`（`components/ui/currency-select.tsx` 為保護檔，只 import 不修改）。
3. A13 描述 `n/50` 只顯示計數，舊的長描述仍可儲存、不截斷（D9，RC3）。
4. A13 預算前綴依結算幣別（`TWD→NT$`、`JPY→¥`、`USD→$`、其他→幣別代碼），無千分位（D10）。
5. 預覽卡 64px 縮圖仍使用動態 `CoverArt`（跟隨所選封面顏色），非設計稿的固定 lake 漸層。
6. `red` 仍保留在 `COVER_COLORS` 資料中（舊資料相容），只從 `COVER_PICKER_COLORS` 隱藏（D5）。
7. 新增的封面 icon id 與 `ink` 深色值為提案（D3/D4）。
8. A9b/A13 card 圓角分別為 16px / 18px；A13 頁尾維持固定、圓角 14px（D8）。
