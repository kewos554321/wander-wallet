# UI v2 Milestone 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2 versions of `/projects/new` (A9), `/projects/[id]/settings` (A13), `/settings` (A14), writing the new `icon:` cover format.

**Architecture:** Cover helpers in `lib/covers.ts`; API validates covers; shared form/preference hooks in `lib/hooks/`; v1 page bodies moved verbatim to `components/v1/`; pages become `UiVersionSwitch`; v2 screens in `components/v2/`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (v2 tokens under `[data-ui="v2"]`), Vitest + Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-29-ui-v2-milestone-4-design.md`

## Global Constraints

- Do not modify `prisma/schema.prisma`; never run `prisma db push`; never connect to a database.
- v2 components must not use the `dark:` variant. UI copy is Traditional Chinese exactly as written here; code comments in English.
- Code moved to `components/v1/` changes only: the default export becomes a named export, `params` handling (see Task 6), and nothing else.
- v2 pages wrap content as `<UiV2Scope><div className="mx-auto max-w-md">…</div></UiV2Scope>` with `V2TopBar` (see `components/v2/members/members-v2.tsx`).
- Tests: `npx vitest run <path>`; full `npm run test:run`; lint `npm run lint`.
- Commit messages end with a blank line then:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
  ```
- Ruling (deviates spec §2.2/§4): custom cover upload stores a compressed base64 data URL via `compressImage` (same as v1), not R2 — a new trip has no project id for R2. `isValidCover` therefore accepts `data:image/…;base64,` too.
- Ruling (deviates spec §3.2): custom-rate rows follow v1 — one row per non-settlement currency used by the project's expenses (no free add/delete).
- Ruling: delete confirmation follows v1 — type `delete` to enable the button; only the creator sees the danger zone.

## Review Focus

1. Legacy custom covers (base64 `data:image/webp;base64,…`) must still pass PUT validation, or v1 settings saves break (Task 2 test).
2. `javascript:`/`http:` junk covers rejected with 400 (Task 1, 2 tests).
3. Saving preferences in v2 must keep `uiVersion` (Task 5 test).
4. Budget `""` means null, `"-1"`/`"abc"` rejected (Task 4 test).
5. Unknown icon/color ids render the default leaf, not a crash (Task 1, 3 tests).

---

### Task 1: Cover helpers

**Files:** Modify `lib/covers.ts`; Test `tests/lib/covers-icon.test.ts`

**Interfaces — Produces:**
```ts
export const COVER_ICONS: readonly { id: string; label: string }[]
export const COVER_COLORS: readonly { id: string; fg: string; bg: string }[]
export const DEFAULT_ICON_COVER = "icon:leaf;color:lake"
export function buildIconCover(iconId: string, colorId: string): string
export function isValidCover(cover: unknown): boolean
// parseCover: unknown icon/color ids → { type: "none" }
```

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest"
import { COVER_ICONS, COVER_COLORS, DEFAULT_ICON_COVER, buildIconCover, isValidCover, parseCover } from "@/lib/covers"

describe("icon covers", () => {
  it("lists icons and colors", () => {
    expect(COVER_ICONS.map((i) => i.id)).toEqual(["compass", "leaf", "utensils", "globe", "car", "bed", "star"])
    expect(COVER_COLORS.map((c) => c.id)).toEqual(["lake", "coral", "red", "rose", "gold", "plum"])
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
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** — add below `ICON_COVER_PATTERN` in `lib/covers.ts`, and change the `icon:` branch of `parseCover`:

```ts
export const COVER_ICONS = [
  { id: "compass", label: "指南針" },
  { id: "leaf", label: "葉子" },
  { id: "utensils", label: "餐具" },
  { id: "globe", label: "地球" },
  { id: "car", label: "汽車" },
  { id: "bed", label: "住宿" },
  { id: "star", label: "星星" },
] as const

export const COVER_COLORS = [
  { id: "lake", fg: "#1B5847", bg: "#EAF5F1" },
  { id: "coral", fg: "#C4602F", bg: "#FBE3D2" },
  { id: "red", fg: "#C4472F", bg: "#F6DCD3" },
  { id: "rose", fg: "#A14A68", bg: "#F5DDE6" },
  { id: "gold", fg: "#9C7A28", bg: "#F6ECCF" },
  { id: "plum", fg: "#6B5B95", bg: "#E7E2F2" },
] as const

export const DEFAULT_ICON_COVER = "icon:leaf;color:lake"

const isIconId = (id: string) => COVER_ICONS.some((i) => i.id === id)
const isColorId = (id: string) => COVER_COLORS.some((c) => c.id === id)

export function buildIconCover(iconId: string, colorId: string): string {
  return `icon:${iconId};color:${colorId}`
}

// Accepts every cover format the app writes: presets, v2 icon covers,
// https image URLs, and v1's compressed base64 data URLs.
const DATA_IMAGE_PREFIX = /^data:image\/[a-z0-9.+-]+;base64,/i

export function isValidCover(cover: unknown): boolean {
  if (cover === null || cover === undefined || cover === "") return true
  if (typeof cover !== "string") return false
  if (cover.startsWith("preset:")) return PRESET_COVERS.some((p) => `preset:${p.id}` === cover)
  if (cover.startsWith("icon:")) return parseCover(cover).type === "icon"
  if (cover.startsWith("https://")) {
    try {
      new URL(cover)
      return true
    } catch {
      return false
    }
  }
  return DATA_IMAGE_PREFIX.test(cover)
}
```

In `parseCover`'s icon branch replace the return with:
```ts
    if (!match || !isIconId(match[1]) || !isColorId(match[2])) return { type: "none" }
    return { type: "icon", iconId: match[1], colorId: match[2] }
```
(`COVER_ICONS`/`COVER_COLORS` must be declared above `parseCover`, or use function hoisting via the `isIconId`/`isColorId` consts declared above it.)

- [ ] **Step 4:** Run `npx vitest run tests/lib/covers-icon.test.ts tests/lib/covers.test.ts` → PASS (existing covers tests must still pass; if an existing test expects an unknown-id icon cover to parse as icon, update that one expectation and note it).
- [ ] **Step 5: Commit** — `feat: Add icon cover catalog and cover validation`.

---

### Task 2: API cover validation

**Files:** Modify `app/api/projects/route.ts` (POST), `app/api/projects/[id]/route.ts` (PUT); Test: add cases to `tests/api/projects.test.ts` and `tests/api/project-detail.test.ts`

**Interfaces — Consumes:** `isValidCover` (Task 1).

- [ ] **Step 1: Tests** — follow each file's existing mock/request helpers. Add:
  - POST with `cover: "javascript:alert(1)"` → status 400, body `{ error: "封面格式不正確" }`, `prisma.project.create` not called.
  - POST with `cover: "icon:leaf;color:lake"` → proceeds (not 400; `create` called with `cover: "icon:leaf;color:lake"`).
  - PUT with `cover: "icon:rocket;color:lake"` → 400 `封面格式不正確`, no update call.
  - PUT with `cover: "data:image/webp;base64,AAAA"` → not 400 (legacy covers keep saving).
- [ ] **Step 2:** Run → new cases FAIL.
- [ ] **Step 3: Implement** — in POST right after the name check, and in PUT right after destructuring `body`:
```ts
    if (cover !== undefined && !isValidCover(cover)) {
      return NextResponse.json({ error: "封面格式不正確" }, { status: 400 })
    }
```
with `import { isValidCover } from "@/lib/covers"`.
- [ ] **Step 4:** Run both test files → PASS.
- [ ] **Step 5: Commit** — `feat: Validate project cover format in project APIs`.

---

### Task 3: CoverArt and CoverPickerV2

**Files:** Create `components/v2/cover/cover-art.tsx`, `components/v2/cover/cover-picker-v2.tsx`; Modify `components/v2/projects/cover-thumb.tsx`; Test `tests/components/v2/cover.test.tsx`

**Interfaces — Produces:**
```ts
export function CoverArt(props: { cover: string | null; className?: string; iconClassName?: string }): JSX.Element
export function CoverPickerV2(props: { value: string | null; onChange: (cover: string | null) => void; disabled?: boolean }): JSX.Element
```

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
vi.mock("next/image", () => ({ default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} /> }))
vi.mock("@/lib/image-utils", () => ({ compressImage: vi.fn().mockResolvedValue("data:image/webp;base64,AAAA") }))
import { CoverArt } from "@/components/v2/cover/cover-art"
import { CoverPickerV2 } from "@/components/v2/cover/cover-picker-v2"

describe("CoverArt", () => {
  it("renders icon covers with their color", () => {
    render(<CoverArt cover="icon:car;color:gold" />)
    const box = screen.getByTestId("cover-art")
    expect(box).toHaveAttribute("data-cover", "icon:car")
    expect(box).toHaveStyle({ backgroundColor: "#F6ECCF", color: "#9C7A28" })
  })
  it("falls back to the default leaf", () => {
    render(<CoverArt cover="icon:rocket;color:lake" />)
    expect(screen.getByTestId("cover-art")).toHaveAttribute("data-cover", "icon:leaf")
  })
  it("renders custom images and presets", () => {
    const { rerender } = render(<CoverArt cover="https://x.com/a.jpg" />)
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://x.com/a.jpg")
    rerender(<CoverArt cover="preset:1" />)
    expect(screen.getByTestId("cover-art")).toHaveAttribute("data-cover", "preset:1")
  })
})

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
  it("uploads a custom image as base64 and can remove it", async () => {
    const onChange = vi.fn()
    const { container, rerender } = render(<CoverPickerV2 value={null} onChange={onChange} />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } })
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("data:image/webp;base64,AAAA"))
    rerender(<CoverPickerV2 value="data:image/webp;base64,AAAA" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "移除自訂圖片" }))
    expect(onChange).toHaveBeenLastCalledWith("icon:leaf;color:lake")
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement `cover-art.tsx`**

```tsx
import Image from "next/image"
import { BedDouble, Car, Compass, Globe, Leaf, Star, Utensils, type LucideIcon } from "lucide-react"
import { COVER_COLORS, getPresetCover, parseCover } from "@/lib/covers"

const ICONS: Record<string, LucideIcon> = { compass: Compass, leaf: Leaf, utensils: Utensils, globe: Globe, car: Car, bed: BedDouble, star: Star }

export function CoverArt({ cover, className = "h-16 w-16 rounded-xl", iconClassName = "h-[26px] w-[26px]" }: { cover: string | null; className?: string; iconClassName?: string }) {
  const parsed = parseCover(cover)
  const box = `relative flex shrink-0 items-center justify-center overflow-hidden ${className}`

  if (parsed.type === "custom" && parsed.customUrl) {
    return (
      <div data-testid="cover-art" data-cover="custom" className={box}>
        <Image src={parsed.customUrl} alt="" fill className="object-cover" unoptimized />
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
  const Icon = ICONS[iconId] ?? Leaf
  return (
    <div data-testid="cover-art" data-cover={`icon:${iconId}`} className={box} style={{ backgroundColor: color.bg, color: color.fg }}>
      <Icon className={iconClassName} strokeWidth={1.5} aria-hidden="true" />
    </div>
  )
}
```

Replace `cover-thumb.tsx` body with `return <CoverArt cover={cover} />` (keep the export name `CoverThumb`, remove the stale milestone comment and unused imports).

- [ ] **Step 4: Implement `cover-picker-v2.tsx`** — sections「封面圖示」(7 square buttons, `aria-label` = icon `label`, `aria-pressed` when selected, render with `CoverArt` of `buildIconCover(icon.id, currentColor)` at `h-11 w-11 rounded-xl`), 「封面顏色」(6 round swatches `h-7 w-7 rounded-full` with `style={{ backgroundColor: c.fg }}`, `aria-label={\`顏色 ${c.id}\`}`, `aria-pressed`), and a dashed button「或上傳自訂圖片」opening a hidden `<input type="file" accept="image/*">`. Current icon/color come from `parseCover(value)` when it is an icon cover, else `leaf`/`lake`. Selecting an icon or color calls `onChange(buildIconCover(icon, color))`. Upload: `compressImage(file, 1200, 800, 0.8)` from `@/lib/image-utils` then `onChange(base64)`; show 「上傳中…」 while pending and 「圖片上傳失敗」 on error. When `parseCover(value).type === "custom"`, show a small preview (`CoverArt` `h-11 w-16 rounded-lg`) and a button「移除自訂圖片」 that calls `onChange(DEFAULT_ICON_COVER)`. Use v2 tokens (`border-v2-line`, `bg-v2-surface`, selected ring `ring-2 ring-v2-lake`).
- [ ] **Step 5:** Run `npx vitest run tests/components/v2/cover.test.tsx tests/components/v2` → PASS.
- [ ] **Step 6: Commit** — `feat: Add v2 cover art and cover picker`.

---

### Task 4: Project form model

**Files:** Create `lib/hooks/use-project-form.ts`; Test `tests/lib/hooks/use-project-form.test.ts`

**Interfaces — Produces:**
```ts
export type JoinMode = "both" | "create_only" | "claim_only"
export const JOIN_MODE_OPTIONS: { value: JoinMode; label: string; description: string }[]
export interface ProjectFormValues { name: string; description: string; cover: string | null; startDate: string | null; endDate: string | null; currency: string; budget: string; joinMode: JoinMode; exchangeRatePrecision: number; customRates: Record<string, string> }
export function emptyProjectForm(currency: string): ProjectFormValues
export function validateProjectForm(v: ProjectFormValues): string | null
export function toCreatePayload(v: ProjectFormValues): Record<string, unknown>
export function toUpdatePayload(v: ProjectFormValues): Record<string, unknown>
export function useProjectForm(initial: ProjectFormValues): { values: ProjectFormValues; set: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void; reset: (v: ProjectFormValues) => void; error: string | null }
```
Dates are local `yyyy-MM-dd` strings (same as v1).

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { emptyProjectForm, validateProjectForm, toCreatePayload, toUpdatePayload, useProjectForm, JOIN_MODE_OPTIONS } from "@/lib/hooks/use-project-form"

const v = (o = {}) => ({ ...emptyProjectForm("TWD"), name: "京都", ...o })

describe("project form", () => {
  it("defaults", () => {
    expect(emptyProjectForm("JPY")).toEqual({ name: "", description: "", cover: "icon:leaf;color:lake", startDate: null, endDate: null, currency: "JPY", budget: "", joinMode: "both", exchangeRatePrecision: 2, customRates: {} })
    expect(JOIN_MODE_OPTIONS.map((o) => o.value)).toEqual(["both", "create_only", "claim_only"])
  })
  it("validates in order", () => {
    expect(validateProjectForm(v({ name: "  " }))).toBe("請輸入旅程名稱")
    expect(validateProjectForm(v({ startDate: "2026-11-16", endDate: "2026-11-12" }))).toBe("結束日需晚於出發日")
    for (const budget of ["-1", "abc"]) expect(validateProjectForm(v({ budget }))).toBe("預算需為 0 以上的數字")
    for (const exchangeRatePrecision of [-1, 9, 1.5]) expect(validateProjectForm(v({ exchangeRatePrecision }))).toBe("匯率精度需為 0 到 8 的整數")
    expect(validateProjectForm(v({ customRates: { JPY: "0" } }))).toBe("自訂匯率需大於 0")
    expect(validateProjectForm(v({ budget: "", startDate: "2026-11-12", endDate: "2026-11-12", customRates: { JPY: "" } }))).toBeNull()
  })
  it("builds payloads", () => {
    const f = v({ name: " 京都 ", description: " ", budget: "50000", startDate: "2026-11-12", endDate: "2026-11-16", customRates: { JPY: "0.21", USD: "" } })
    expect(toCreatePayload(f)).toEqual({ name: "京都", description: null, cover: "icon:leaf;color:lake", startDate: "2026-11-12", endDate: "2026-11-16", budget: 50000, currency: "TWD", joinMode: "both" })
    expect(toUpdatePayload(f)).toEqual({ ...toCreatePayload(f), exchangeRatePrecision: 2, customRates: { JPY: 0.21 } })
    expect(toUpdatePayload(v()).customRates).toBeNull()
    expect(toCreatePayload(v()).budget).toBeNull()
  })
  it("hook sets values and exposes the error", () => {
    const h = renderHook(() => useProjectForm(v({ name: "" })))
    expect(h.result.current.error).toBe("請輸入旅程名稱")
    act(() => h.result.current.set("name", "東京"))
    expect(h.result.current.values.name).toBe("東京")
    expect(h.result.current.error).toBeNull()
    act(() => h.result.current.reset(v({ name: "大阪" })))
    expect(h.result.current.values.name).toBe("大阪")
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**

```ts
"use client"

import { useCallback, useMemo, useState } from "react"
import { DEFAULT_ICON_COVER } from "@/lib/covers"

export type JoinMode = "both" | "create_only" | "claim_only"

export const JOIN_MODE_OPTIONS: { value: JoinMode; label: string; description: string }[] = [
  { value: "both", label: "兩者皆可", description: "新成員可選擇建立新身份或取代佔位成員" },
  { value: "create_only", label: "僅建立新成員", description: "新成員只能建立自己的身份" },
  { value: "claim_only", label: "僅取代佔位成員", description: "新成員只能取代現有的佔位成員" },
]

export interface ProjectFormValues {
  name: string
  description: string
  cover: string | null
  startDate: string | null
  endDate: string | null
  currency: string
  budget: string
  joinMode: JoinMode
  exchangeRatePrecision: number
  customRates: Record<string, string>
}

export function emptyProjectForm(currency: string): ProjectFormValues {
  return { name: "", description: "", cover: DEFAULT_ICON_COVER, startDate: null, endDate: null, currency, budget: "", joinMode: "both", exchangeRatePrecision: 2, customRates: {} }
}

export function validateProjectForm(v: ProjectFormValues): string | null {
  if (!v.name.trim()) return "請輸入旅程名稱"
  // yyyy-MM-dd strings compare correctly as text.
  if (v.startDate && v.endDate && v.endDate < v.startDate) return "結束日需晚於出發日"
  if (v.budget.trim() !== "") {
    const n = Number(v.budget)
    if (!Number.isFinite(n) || n < 0) return "預算需為 0 以上的數字"
  }
  if (!Number.isInteger(v.exchangeRatePrecision) || v.exchangeRatePrecision < 0 || v.exchangeRatePrecision > 8) return "匯率精度需為 0 到 8 的整數"
  for (const rate of Object.values(v.customRates)) {
    if (rate.trim() === "") continue
    const n = Number(rate)
    if (!Number.isFinite(n) || n <= 0) return "自訂匯率需大於 0"
  }
  return null
}

export function toCreatePayload(v: ProjectFormValues): Record<string, unknown> {
  return {
    name: v.name.trim(),
    description: v.description.trim() || null,
    cover: v.cover,
    startDate: v.startDate,
    endDate: v.endDate,
    budget: v.budget.trim() === "" ? null : Number(v.budget),
    currency: v.currency,
    joinMode: v.joinMode,
  }
}

export function toUpdatePayload(v: ProjectFormValues): Record<string, unknown> {
  const rates = Object.entries(v.customRates).filter(([, r]) => r.trim() !== "")
  return {
    ...toCreatePayload(v),
    exchangeRatePrecision: v.exchangeRatePrecision,
    customRates: rates.length > 0 ? Object.fromEntries(rates.map(([k, r]) => [k, Number(r)])) : null,
  }
}

export function useProjectForm(initial: ProjectFormValues) {
  const [values, setValues] = useState(initial)
  const set = useCallback(<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setValues((s) => ({ ...s, [key]: value })), [])
  const error = useMemo(() => validateProjectForm(values), [values])
  return { values, set, reset: setValues, error }
}
```

- [ ] **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Add shared project form model`.

---

### Task 5: Preferences hook

**Files:** Create `lib/hooks/use-preferences.ts`; Test `tests/lib/hooks/use-preferences.test.ts`

**Interfaces — Produces:** `export function usePreferences(): { preferences: UserPreferences; save: (patch: Partial<Omit<UserPreferences, "notifications">> & { notifications?: Partial<NotificationPreferences> }) => Promise<boolean>; saving: boolean; error: string | null }`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const authFetch = vi.fn()
const updatePreferences = vi.fn()
const liff = { user: { preferences: { defaultCurrency: "JPY", uiVersion: "v2" } as Record<string, unknown> }, updatePreferences }
vi.mock("@/components/auth/liff-provider", () => ({ useAuthFetch: () => authFetch, useLiff: () => liff }))
import { usePreferences } from "@/lib/hooks/use-preferences"

beforeEach(() => { authFetch.mockReset(); updatePreferences.mockReset() })

describe("usePreferences", () => {
  it("merges defaults for reading", () => {
    const h = renderHook(() => usePreferences())
    expect(h.result.current.preferences.defaultCurrency).toBe("JPY")
    expect(h.result.current.preferences.notifications.expenseCreated).toBe(true)
  })
  it("saves a patch and keeps uiVersion", async () => {
    authFetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    const h = renderHook(() => usePreferences())
    let ok
    await act(async () => { ok = await h.result.current.save({ notifications: { expenseDeleted: false } }) })
    expect(ok).toBe(true)
    const body = JSON.parse(authFetch.mock.calls[0][1].body)
    expect(authFetch.mock.calls[0][0]).toBe("/api/users/profile")
    expect(body.preferences).toMatchObject({ uiVersion: "v2", defaultCurrency: "JPY", notifications: { expenseCreated: true, expenseUpdated: true, expenseDeleted: false } })
    expect(updatePreferences).toHaveBeenCalledWith(body.preferences)
  })
  it("reports failure without updating local state", async () => {
    authFetch.mockResolvedValue({ ok: false, json: async () => ({ error: "x" }) })
    const h = renderHook(() => usePreferences())
    let ok
    await act(async () => { ok = await h.result.current.save({ defaultSplitMode: "custom" }) })
    expect(ok).toBe(false)
    expect(h.result.current.error).toBe("儲存失敗，請重試")
    expect(updatePreferences).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**

```ts
"use client"

import { useCallback, useState } from "react"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { mergePreferences, type NotificationPreferences, type UserPreferences } from "@/types/user-preferences"

type PreferencesPatch = Partial<Omit<UserPreferences, "notifications">> & { notifications?: Partial<NotificationPreferences> }

// Saves on top of the raw stored preferences so fields mergePreferences
// drops (e.g. uiVersion) survive a save from the settings page.
export function usePreferences() {
  const { user, updatePreferences } = useLiff()
  const authFetch = useAuthFetch()
  const preferences = mergePreferences(user?.preferences)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (patch: PreferencesPatch) => {
      const raw = (user?.preferences ?? {}) as Partial<UserPreferences>
      const next = {
        ...raw,
        ...preferences,
        ...patch,
        notifications: { ...preferences.notifications, ...(patch.notifications ?? {}) },
      } as UserPreferences
      setSaving(true)
      setError(null)
      try {
        const res = await authFetch("/api/users/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: next }),
        })
        if (!res.ok) throw new Error("save failed")
        updatePreferences(next)
        return true
      } catch {
        setError("儲存失敗，請重試")
        return false
      } finally {
        setSaving(false)
      }
    },
    [authFetch, preferences, updatePreferences, user?.preferences]
  )

  return { preferences, save, saving, error }
}
```
Note: `raw` spreads first; `preferences` (merged) has no `uiVersion` key, so the raw value survives.

- [ ] **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Add preferences hook that keeps unknown fields`.

---

### Task 6: Move v1 pages and add UI version switches

**Files:**
- Move (git mv, then edit only as stated): `app/projects/new/page.tsx` → `components/v1/new-project/new-project-v1.tsx`; `app/projects/[id]/settings/page.tsx` → `components/v1/project-settings/project-settings-v1.tsx`; `app/settings/page.tsx` → `components/v1/settings/general-settings-v1.tsx`
- Create the three page files anew; Create placeholder v2 components (replaced in Tasks 7–9): `components/v2/new-project/new-project-v2.tsx` (`export function NewProjectV2()`), `components/v2/project-settings/project-settings-v2.tsx` (`export function ProjectSettingsV2({ projectId }: { projectId: string })`), `components/v2/settings/general-settings-v2.tsx` (`export function GeneralSettingsV2()`), each returning `<UiV2Scope><div className="mx-auto max-w-md" /></UiV2Scope>`.
- Test `tests/components/v2/m4-pages.test.tsx`

Edits to moved files: `export default function NewProjectPage()` → `export function NewProjectV1()`; `export default function SettingsPage()` (general) → `export function GeneralSettingsV1()`; project settings `export default function SettingsPage({ params }: { params: Promise<{ id: string }> })` + `const { id } = use(params)` → `export function ProjectSettingsV1({ projectId: id }: { projectId: string })` and remove the `use(params)` line (drop `use` from the react import if now unused). Nothing else changes.

New page files (all `"use client"`):
```tsx
// app/projects/new/page.tsx
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { NewProjectV1 } from "@/components/v1/new-project/new-project-v1"
import { NewProjectV2 } from "@/components/v2/new-project/new-project-v2"
export default function NewProjectPage() {
  return <UiVersionSwitch v1={<NewProjectV1 />} v2={<NewProjectV2 />} />
}
```
```tsx
// app/projects/[id]/settings/page.tsx
import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectSettingsV1 } from "@/components/v1/project-settings/project-settings-v1"
import { ProjectSettingsV2 } from "@/components/v2/project-settings/project-settings-v2"
export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ProjectSettingsV1 projectId={id} />} v2={<ProjectSettingsV2 projectId={id} />} />
}
```
```tsx
// app/settings/page.tsx
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { GeneralSettingsV1 } from "@/components/v1/settings/general-settings-v1"
import { GeneralSettingsV2 } from "@/components/v2/settings/general-settings-v2"
export default function SettingsPage() {
  return <UiVersionSwitch v1={<GeneralSettingsV1 />} v2={<GeneralSettingsV2 />} />
}
```

- [ ] **Step 1: Test** — `tests/components/v2/m4-pages.test.tsx`: mock `@/components/ui-version/ui-version-switch` as `({ v1, v2 }) => <div><div data-testid="v1">{v1}</div><div data-testid="v2">{v2}</div></div>` and mock the six components to render their names (e.g. `NewProjectV1: () => <span>NewProjectV1</span>`, `ProjectSettingsV1: ({ projectId }) => <span>{\`ProjectSettingsV1:${projectId}\`}</span>`). Assert each page renders both variants; for the settings page render `<ProjectSettingsPage params={Promise.resolve({ id: "p1" })} />` inside `<Suspense>` and `await screen.findByText("ProjectSettingsV1:p1")`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Do the moves/edits above. If existing tests import the old page modules (`grep -rln "app/projects/new/page\|app/settings/page\|settings/page" tests`), point them at the moved v1 components and their named exports.
- [ ] **Step 4:** Run `npx vitest run tests/components/v2/m4-pages.test.tsx` and `npm run test:run` → PASS; `npx tsc --noEmit -p .` clean for touched files.
- [ ] **Step 5: Commit** — `refactor: Move v1 new-project and settings pages behind UI version switch`.

---

### Task 7: A9 NewProjectV2

**Files:** Replace `components/v2/new-project/new-project-v2.tsx`; Test `tests/components/v2/new-project-v2.test.tsx`

**Interfaces — Consumes:** `useProjectForm`, `emptyProjectForm`, `toCreatePayload`, `JOIN_MODE_OPTIONS` (Task 4); `CoverArt`, `CoverPickerV2` (Task 3); `usePreferences` (Task 5, for default currency); `useAuthFetch`; `useRouter`; `CurrencySelect` (`@/components/ui/currency-select`, props `value`, `onChange`); `Calendar` with `mode="range"` + `Popover` (see v1 `components/v1/project-settings/project-settings-v1.tsx` for the range usage and `yyyy-MM-dd` local formatting).

**Behavior (exact copy):**
- `V2TopBar title="建立旅程" backHref="/projects"`.
- 「卡片預覽」card: `CoverArt` (`h-14 w-14 rounded-2xl`), name or grey placeholder「峇里島放鬆之旅」, day count (`N 天` inclusive when both dates set, else「— 天」), line「尚未設定日期 · 尚未邀請旅伴」when no dates, else `yyyy/MM/dd – yyyy/MM/dd · 尚未邀請旅伴`, and「尚未記帳」.
- Fields in order with these labels: `CoverPickerV2`; 「旅程名稱 *」text input (`aria-label="旅程名稱"`); 「出發日與結束日」date-range button showing「選擇日期」or the range; 「結算幣別」`CurrencySelect`; 「預算（選填）」numeric input (`aria-label="預算"`, `inputMode="decimal"`); 「描述（選填）」textarea (`aria-label="描述"`, placeholder「記錄這次旅行的目的地、日期等資訊……」); 「成員加入方式」with sub-text「設定新成員透過分享連結加入時的方式」and three radio cards from `JOIN_MODE_OPTIONS` (label + description).
- Initial values: `emptyProjectForm(preferences.defaultCurrency)`.
- Fixed bottom button「建立旅程」: disabled while submitting; on click, if `error` show it in `role="alert"` above the button and stop; else `POST /api/projects` with `toCreatePayload(values)`; on ok read `{ id }` and `router.push(\`/projects/${id}\`)`; on failure show the server `error` or「建立失敗，請重試」.

- [ ] **Step 1: Test** (mock `next/navigation` `useRouter` push, `@/components/auth/liff-provider` `useAuthFetch`/`useLiff` with `user.preferences = { defaultCurrency: "JPY" }`, `@/components/ui/currency-select` as a simple `<select aria-label="結算幣別">` with TWD/JPY options, and `next/image`):
  - preview shows「峇里島放鬆之旅」and「— 天」, then after typing 旅程名稱 = 「京都」 the preview shows「京都」;
  - clicking「建立旅程」with an empty name shows alert「請輸入旅程名稱」and does not call fetch;
  - with name「京都」, budget「10000」, join mode「僅建立新成員」, clicking the「汽車」icon: fetch called with `/api/projects` POST body `{ name: "京都", description: null, cover: "icon:car;color:lake", startDate: null, endDate: null, budget: 10000, currency: "JPY", joinMode: "create_only" }`, then `push("/projects/new-id")` (mock response `{ id: "new-id" }`);
  - server error `{ error: "專案名稱必填" }` is shown in the alert.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement per Behavior. **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Add v2 new trip page`.

---

### Task 8: A13 ProjectSettingsV2

**Files:** Replace `components/v2/project-settings/project-settings-v2.tsx`; Test `tests/components/v2/project-settings-v2.test.tsx`

**Interfaces — Consumes:** `useProjectForm`, `toUpdatePayload`, `JOIN_MODE_OPTIONS`, `ProjectFormValues` (Task 4); `CoverPickerV2` (Task 3); `useAuthFetch`, `useRouter`, `CurrencySelect`, `Calendar`/`Popover` as in Task 7.

**Behavior (exact copy):**
- Load: `GET /api/projects/${projectId}` and `GET /api/users/profile` (current user id, as v1 `fetchCurrentUser`); while loading show `V2TopBar title="專案設定" backHref={\`/projects/${projectId}\`}` plus a skeleton; on 404/failure「專案不存在」.
- Map project → form values exactly like v1 `fetchProject` (budget → `String(Number(budget))` or `""`; dates via ISO → local `yyyy-MM-dd`; `customRates` numbers → strings; `exchangeRatePrecision ?? 2`; `joinMode || "both"`; `cover` unchanged). Expense currencies = distinct `expenses[].currency` ≠ project currency. If any, `GET /api/exchange-rates` → `rates`.
- Sections (each a card with a small heading):「基本資訊」(「專案名稱」input `aria-label="專案名稱"`,「封面圖示與顏色」+ sub「點擊更換圖示與底色」+ `CoverPickerV2`,「描述（選填）」textarea `aria-label="描述"`);「日期與預算」(「出發日與結束日」range,「旅程預算（選填）」input `aria-label="旅程預算"` + help「設定預算後，可在旅程總覽查看花費進度」);「幣別與匯率」(「結算幣別」`CurrencySelect` + help「所有費用將以此幣別進行結算計算」; only when expense currencies exist:「自訂匯率（選填）」+ help「不設定則使用即時匯率」, one row per currency `X = [input aria-label={\`${X} 匯率\`}] 結算幣別` with hint「目前使用即時匯率：1 X = Y 結算幣別」when live rate known (Y = `rates[to]/rates[X]` rounded to precision); 「匯率計算精度」number input `aria-label="匯率計算精度"` min 0 max 8 + 「位小數，影響匯率顯示與結算四捨五入」);「成員加入方式」radio cards as Task 7.
- Fixed bottom:「取消」→ `router.push(\`/projects/${projectId}\`)`;「儲存變更」→ if `error` show `role="alert"`; else `PUT /api/projects/${projectId}` with `toUpdatePayload(values)`; ok → `router.push(\`/projects/${projectId}\`)`; failure → server error or「更新失敗」.
- 「危險區域」only when current user is creator (`project.createdBy === userId || project.creator?.id === userId`): text「刪除專案後，所有成員、支出紀錄都會永久移除，此操作無法復原。」, button「刪除專案」opens a dialog (use `components/v2/ui/confirm-sheet` if it exists in `components/v2`, else a simple fixed overlay) with title「確認刪除專案」, an input `aria-label="輸入 delete 確認"`, and a confirm button「永久刪除」enabled only when the input equals `delete`; confirm → `DELETE /api/projects/${projectId}` → ok `router.push("/projects")`, failure show「刪除失敗」.

- [ ] **Step 1: Test** (mocks as Task 7; `authFetch` routes by URL): loads and shows 專案名稱「京都紅葉五日遊」; editing name then「儲存變更」sends PUT body equal to `toUpdatePayload` of the edited values (assert `name`, `cover`, `customRates`, `exchangeRatePrecision`) and pushes `/projects/p1`; empty name shows alert「請輸入旅程名稱」without PUT; with an expense in JPY and `customRates: { JPY: 0.21 }` the「JPY 匯率」input shows「0.21」; danger zone hidden when `createdBy` ≠ current user; for the creator,「永久刪除」is disabled until typing `delete`, then DELETE is called and pushes `/projects`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Add v2 project settings page`.

---

### Task 9: A14 GeneralSettingsV2

**Files:** Replace `components/v2/settings/general-settings-v2.tsx`; Test `tests/components/v2/general-settings-v2.test.tsx`

**Interfaces — Consumes:** `usePreferences` (Task 5); `useLiff` (`user.name`, `user.image`); `useOnboarding` from the same module v1 uses (see `components/v1/settings/general-settings-v1.tsx` imports) for `resetOnboarding`; `CurrencySelect`; `useRouter`.

**Behavior (exact copy):**
- `V2TopBar title="通用設定" backHref="/projects"`.
- Profile card button (`aria-label="編輯個人資料"`): initial letter avatar, user name, sub「LINE 用戶 · 點擊編輯個人資料」→ `router.push("/settings/profile")`.
- 「記帳偏好」: 「預設幣別」`CurrencySelect` + help「新增支出時優先使用此幣別」→ `save({ defaultCurrency })`; 「預設分帳方式」two pills「均分」/「自訂金額」(`aria-pressed`) → `save({ defaultSplitMode: "equal" | "custom" })`.
- 「LINE 通知」+ help「控制支出操作時是否發送 LINE 群組通知」: three `role="switch"` toggles labelled「新增支出時通知」「更新支出時通知」「刪除支出時通知」with `aria-checked` → `save({ notifications: { expenseCreated|expenseUpdated|expenseDeleted: next } })`.
- Rows:「重看導覽」+ sub「進入任一旅程時會重新顯示導覽」→ same handler as v1 (call `resetOnboarding()`, show the same success feedback v1 shows);「功能介紹」→ `window.open("/", "_blank")`;「意見回饋」→ `window.open("https://line.me/R/ti/p/@386mbqva", "_blank")`.
- No 外觀 section. If `usePreferences().error`, show it in `role="alert"`.

- [ ] **Step 1: Test** (mock `@/lib/hooks/use-preferences` with a controllable `save` spy and preferences; mock liff-provider `useLiff` user `{ name: "Emma" }`; mock the onboarding hook; mock `next/navigation`): shows「Emma」and no「外觀」/「深色」text; toggling「刪除支出時通知」calls `save({ notifications: { expenseDeleted: false } })`; clicking「自訂金額」calls `save({ defaultSplitMode: "custom" })`; profile card pushes `/settings/profile`;「意見回饋」calls `window.open` with the LINE URL; error from the hook is shown in an alert.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5: Full verification** — `npm run test:run`, `npm run lint` (0 new errors), `npx tsc --noEmit -p .`.
- [ ] **Step 6: Commit** — `feat: Add v2 general settings page`.
