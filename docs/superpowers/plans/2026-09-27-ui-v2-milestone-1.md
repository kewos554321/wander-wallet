# UI v2 里程碑 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 v1／v2 並存的切換基礎架構，並完成 A1 旅程列表與 A2 旅程總覽的 v2 畫面，v1 行為完全不變。

**Architecture:** 路由檔只負責依 `useUiVersion()` 分流到 `components/v1/...` 或 `components/v2/...`。版本由 `?ui=` 參數 → sessionStorage → `preferences.uiVersion` → 預設 v1 決定。v2 tokens 與字體只在 `data-ui="v2"` 範圍內生效。資料抓取與計算抽成 hooks／純函式，v1 與 v2 共用。

**Tech Stack:** Next.js 16（App Router、client components）、React 19、TypeScript 5、Tailwind v4（`@theme inline`）、next/font/google、Vitest + Testing Library（jsdom）、lucide-react。

**Spec:** `docs/superpowers/specs/2026-09-27-ui-v2-migration-design.md`

## Global Constraints

- 網址不變；不新增 `/v2` 路由。
- `?ui=` 只接受小寫 `v1`、`v2`，不設白名單。
- sessionStorage key：`ww-ui-version`；版本變更事件名稱：`ww-ui-version-change`。
- `globals.css` 既有 `:root`、`.dark`、既有 `@theme inline` 內容不可修改；v2 只能新增。
- v2 只有淺色；v2 元件不得使用 `dark:` variant。
- v2 視覺數值以 `design/project/MainCard3-njus.dc.html`（A1）、`design/project/Trip-m0lh.dc.html`（A2）為準。
- 不新增 API、不改資料庫。
- 程式碼註解用英文；UI 文案用繁體中文。
- 每個 task 結束時 `npm run test:run` 全部通過、`npm run lint` 無新錯誤。

## Review Focus

1. **sessionStorage 無法存取**（LINE 內建瀏覽器、無痕模式會丟例外）→ 不可 crash，退回 `preferences`／v1；`?ui=` 參數當下仍有效。→ Task 1 測試。
2. **`?ui=` 值不合法**（`?ui=v3`、`?ui=V2`、`?ui=`）→ 忽略參數，照後續優先順序決定。→ Task 1 測試。
3. **非成員從分享連結進入 v2 的 A2** → 仍要看到加入／認領對話框，不能顯示空白或「專案不存在」。→ Task 10 測試。
4. **超出預算** → 進度條上限 100%，文字顯示「超支」而不是負的剩餘金額。→ Task 8、Task 10 測試。
5. **沒有支出或沒有成員的旅程** → 平均每人為 0、餘額為 0，不出現 `NaN`；最近支出顯示空狀態。→ Task 8、Task 10 測試。

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `lib/ui-version.ts` | 版本解析純函式、sessionStorage 讀寫（try/catch） |
| `lib/hooks/useUiVersion.ts` | 讀取網址參數／storage／preferences，監聽切換事件 |
| `components/ui-version/ui-version-switch.tsx` | 依版本渲染 v1 或 v2 元素 |
| `components/ui-version/ui-version-toggle.tsx` | 比對用浮動切換按鈕 |
| `components/v2/fonts.ts` | Noto Serif TC／Noto Sans TC（next/font） |
| `components/v2/ui-v2-scope.tsx` | `data-ui="v2"` 範圍包裝 |
| `components/v2/layout/v2-top-bar.tsx` | v2 次頁頂列（返回、標題、右側動作） |
| `app/globals.css` | 新增 v2 tokens（只新增） |
| `lib/covers.ts` | 新增 `icon:` 格式解析與 `toLegacyCover()` |
| `lib/trip.ts` | 旅程狀態、天數、日期範圍、問候語 |
| `lib/hooks/useProjects.ts` | 旅程列表資料抓取（v1、v2 共用） |
| `components/v1/projects/projects-v1.tsx` | 原 A1 頁面內容 |
| `components/v2/projects/cover-thumb.tsx` | v2 封面縮圖 |
| `components/v2/projects/projects-v2-view.tsx` | A1 v2 畫面（純 props） |
| `components/v2/projects/projects-v2.tsx` | A1 v2 容器（資料＋廣告） |
| `lib/project-overview.ts` | A2 型別與 `computeProjectSummary()` |
| `lib/hooks/useProjectOverview.ts` | A2 資料抓取、加入／認領、摘要計算 |
| `components/project/join-project-dialog.tsx` | 加入／認領對話框（v1、v2 共用） |
| `components/project/invite-dialog.tsx` | 邀請對話框（v1、v2 共用） |
| `components/v1/project/project-overview-v1.tsx` | 原 A2 頁面內容 |
| `components/v2/project/*.tsx` | A2 v2 各區塊與容器 |
| `app/projects/page.tsx`、`app/projects/[id]/page.tsx` | 只做分流 |

---

### Task 1: 版本解析純函式

**Files:**
- Create: `lib/ui-version.ts`
- Modify: `types/user-preferences.ts`
- Test: `tests/lib/ui-version.test.ts`

**Interfaces:**
- Produces:
  - `type UiVersion = "v1" | "v2"`
  - `UI_VERSION_STORAGE_KEY = "ww-ui-version"`、`UI_VERSION_CHANGE_EVENT = "ww-ui-version-change"`
  - `parseUiVersion(value: unknown): UiVersion | null`
  - `resolveUiVersion(input: { param: string | null; stored: string | null; preference: unknown }): { version: UiVersion; overridden: boolean }`
  - `readStoredUiVersion(): string | null`、`writeStoredUiVersion(version: UiVersion): void`
  - `UserPreferences.uiVersion?: "v1" | "v2"`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/ui-version.test.ts
import { describe, it, expect, vi, afterEach } from "vitest"
import {
  parseUiVersion,
  resolveUiVersion,
  readStoredUiVersion,
  writeStoredUiVersion,
  UI_VERSION_STORAGE_KEY,
} from "@/lib/ui-version"

describe("parseUiVersion", () => {
  it("accepts v1 and v2", () => {
    expect(parseUiVersion("v1")).toBe("v1")
    expect(parseUiVersion("v2")).toBe("v2")
  })

  it("rejects anything else", () => {
    expect(parseUiVersion("v3")).toBeNull()
    expect(parseUiVersion("V2")).toBeNull()
    expect(parseUiVersion("")).toBeNull()
    expect(parseUiVersion(null)).toBeNull()
    expect(parseUiVersion(undefined)).toBeNull()
    expect(parseUiVersion(2)).toBeNull()
  })
})

describe("resolveUiVersion", () => {
  it("prefers a valid url param and marks it overridden", () => {
    expect(resolveUiVersion({ param: "v2", stored: "v1", preference: "v1" })).toEqual({
      version: "v2",
      overridden: true,
    })
  })

  it("ignores an invalid param and falls back to stored", () => {
    expect(resolveUiVersion({ param: "v3", stored: "v2", preference: "v1" })).toEqual({
      version: "v2",
      overridden: true,
    })
  })

  it("uses preference when there is no param or stored value", () => {
    expect(resolveUiVersion({ param: null, stored: null, preference: "v2" })).toEqual({
      version: "v2",
      overridden: false,
    })
  })

  it("defaults to v1", () => {
    expect(resolveUiVersion({ param: null, stored: "garbage", preference: undefined })).toEqual({
      version: "v1",
      overridden: false,
    })
  })
})

describe("stored ui version", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it("round-trips through sessionStorage", () => {
    writeStoredUiVersion("v2")
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2")
    expect(readStoredUiVersion()).toBe("v2")
  })

  it("returns null when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    expect(readStoredUiVersion()).toBeNull()
  })

  it("does not throw when writing fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => writeStoredUiVersion("v2")).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ui-version.test.ts`
Expected: FAIL，錯誤為 `Failed to resolve import "@/lib/ui-version"`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/ui-version.ts
export type UiVersion = "v1" | "v2"

export const UI_VERSION_STORAGE_KEY = "ww-ui-version"
export const UI_VERSION_CHANGE_EVENT = "ww-ui-version-change"

export function parseUiVersion(value: unknown): UiVersion | null {
  return value === "v1" || value === "v2" ? value : null
}

// Priority: url param > session storage > user preference > v1.
// `overridden` is true when the choice came from the comparison override
// (param or storage), which is what makes the floating toggle visible.
export function resolveUiVersion(input: {
  param: string | null
  stored: string | null
  preference: unknown
}): { version: UiVersion; overridden: boolean } {
  const fromParam = parseUiVersion(input.param)
  if (fromParam) return { version: fromParam, overridden: true }

  const fromStored = parseUiVersion(input.stored)
  if (fromStored) return { version: fromStored, overridden: true }

  const fromPreference = parseUiVersion(input.preference)
  if (fromPreference) return { version: fromPreference, overridden: false }

  return { version: "v1", overridden: false }
}

// sessionStorage can throw in LINE in-app browsers and private mode.
export function readStoredUiVersion(): string | null {
  try {
    return window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeStoredUiVersion(version: UiVersion): void {
  try {
    window.sessionStorage.setItem(UI_VERSION_STORAGE_KEY, version)
  } catch {
    // Ignore: the url param still carries the choice for this page.
  }
}
```

在 `types/user-preferences.ts` 的 `UserPreferences` 介面最後加一行（`mergePreferences` 不需要改，里程碑 1 只從 `user.preferences` 原始物件讀取）：

```ts
  uiVersion?: "v1" | "v2"                   // UI version opt-in (stage 1+)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/ui-version.test.ts`
Expected: PASS（9 tests）

- [ ] **Step 5: Commit**

```bash
git add lib/ui-version.ts types/user-preferences.ts tests/lib/ui-version.test.ts
git commit -m "feat: Add UI version resolution helpers"
```

---

### Task 2: `useUiVersion` hook、分流元件、浮動切換按鈕

**Files:**
- Create: `lib/hooks/useUiVersion.ts`
- Create: `components/ui-version/ui-version-switch.tsx`
- Create: `components/ui-version/ui-version-toggle.tsx`
- Modify: `lib/hooks/index.ts`
- Modify: `app/layout.tsx`
- Test: `tests/lib/hooks/useUiVersion.test.tsx`、`tests/components/ui-version.test.tsx`

**Interfaces:**
- Consumes: Task 1 全部匯出；`useLiff()` from `@/components/auth/liff-provider`（`user?.preferences?.uiVersion`）
- Produces:
  - `useUiVersion(): { version: UiVersion | null; overridden: boolean; setVersion: (v: UiVersion) => void }`（`null` 表示尚未解析，第一次 effect 前）
  - `<UiVersionSwitch v1={ReactNode} v2={ReactNode} fallback?={ReactNode} />`
  - `<UiVersionToggle />`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/lib/hooks/useUiVersion.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

const mockUseLiff = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
}))

import { useUiVersion } from "@/lib/hooks/useUiVersion"

function setUrl(search: string) {
  window.history.replaceState(null, "", `/projects${search}`)
}

describe("useUiVersion", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    setUrl("")
    mockUseLiff.mockReturnValue({ user: { preferences: null } })
  })

  it("defaults to v1 without override", async () => {
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v1"))
    expect(result.current.overridden).toBe(false)
  })

  it("reads ?ui=v2 and persists it for later pages", async () => {
    setUrl("?ui=v2")
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    expect(result.current.overridden).toBe(true)
    expect(window.sessionStorage.getItem("ww-ui-version")).toBe("v2")
  })

  it("uses the user preference", async () => {
    mockUseLiff.mockReturnValue({ user: { preferences: { uiVersion: "v2" } } })
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    expect(result.current.overridden).toBe(false)
  })

  it("setVersion switches every mounted consumer", async () => {
    setUrl("?ui=v2")
    const a = renderHook(() => useUiVersion())
    const b = renderHook(() => useUiVersion())
    await waitFor(() => expect(a.result.current.version).toBe("v2"))

    act(() => a.result.current.setVersion("v1"))

    await waitFor(() => expect(b.result.current.version).toBe("v1"))
    expect(window.location.search).toBe("?ui=v1")
  })

  it("still honours ?ui when sessionStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    setUrl("?ui=v2")
    const { result } = renderHook(() => useUiVersion())
    await waitFor(() => expect(result.current.version).toBe("v2"))
    vi.restoreAllMocks()
  })
})
```

```tsx
// tests/components/ui-version.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"

vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { preferences: null } }),
}))

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { UiVersionToggle } from "@/components/ui-version/ui-version-toggle"

describe("UiVersionSwitch / UiVersionToggle", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, "", "/projects")
  })

  it("renders v1 by default and hides the toggle", async () => {
    render(
      <>
        <UiVersionSwitch v1={<p>old</p>} v2={<p>new</p>} />
        <UiVersionToggle />
      </>
    )
    expect(await screen.findByText("old")).toBeInTheDocument()
    expect(screen.queryByText("new")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /切換到/ })).not.toBeInTheDocument()
  })

  it("renders v2 with ?ui=v2 and the toggle switches back", async () => {
    window.history.replaceState(null, "", "/projects?ui=v2")
    render(
      <>
        <UiVersionSwitch v1={<p>old</p>} v2={<p>new</p>} />
        <UiVersionToggle />
      </>
    )
    expect(await screen.findByText("new")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "切換到 V1" }))

    await waitFor(() => expect(screen.getByText("old")).toBeInTheDocument())
    expect(screen.getByRole("button", { name: "切換到 V2" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/hooks/useUiVersion.test.tsx tests/components/ui-version.test.tsx`
Expected: FAIL，錯誤為無法解析 `@/lib/hooks/useUiVersion`

- [ ] **Step 3: Write implementation**

```ts
// lib/hooks/useUiVersion.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { useLiff } from "@/components/auth/liff-provider"
import {
  type UiVersion,
  UI_VERSION_CHANGE_EVENT,
  parseUiVersion,
  readStoredUiVersion,
  resolveUiVersion,
  writeStoredUiVersion,
} from "@/lib/ui-version"

interface UiVersionState {
  version: UiVersion | null
  overridden: boolean
}

export function useUiVersion() {
  const { user } = useLiff()
  const preference = user?.preferences?.uiVersion
  const [state, setState] = useState<UiVersionState>({ version: null, overridden: false })

  useEffect(() => {
    // Read window.location directly: useSearchParams would force a
    // Suspense boundary on every page that renders this hook.
    const sync = () => {
      const param = new URLSearchParams(window.location.search).get("ui")
      const resolved = resolveUiVersion({ param, stored: readStoredUiVersion(), preference })
      if (parseUiVersion(param)) writeStoredUiVersion(resolved.version)
      setState(resolved)
    }
    sync()
    window.addEventListener(UI_VERSION_CHANGE_EVENT, sync)
    return () => window.removeEventListener(UI_VERSION_CHANGE_EVENT, sync)
  }, [preference])

  const setVersion = useCallback((version: UiVersion) => {
    writeStoredUiVersion(version)
    // Keep the param in the url so the choice survives even without storage.
    const url = new URL(window.location.href)
    url.searchParams.set("ui", version)
    window.history.replaceState(window.history.state, "", url)
    window.dispatchEvent(new Event(UI_VERSION_CHANGE_EVENT))
  }, [])

  return { ...state, setVersion }
}
```

```tsx
// components/ui-version/ui-version-switch.tsx
"use client"

import type { ReactNode } from "react"
import { useUiVersion } from "@/lib/hooks/useUiVersion"

interface UiVersionSwitchProps {
  v1: ReactNode
  v2: ReactNode
  fallback?: ReactNode
}

export function UiVersionSwitch({ v1, v2, fallback = null }: UiVersionSwitchProps) {
  const { version } = useUiVersion()
  if (version === null) return <>{fallback}</>
  return <>{version === "v2" ? v2 : v1}</>
}
```

```tsx
// components/ui-version/ui-version-toggle.tsx
"use client"

import { useUiVersion } from "@/lib/hooks/useUiVersion"

// Only visible after ?ui= was used in this session (comparison mode).
export function UiVersionToggle() {
  const { version, overridden, setVersion } = useUiVersion()
  if (!overridden || version === null) return null

  const next = version === "v2" ? "v1" : "v2"
  return (
    <button
      type="button"
      onClick={() => setVersion(next)}
      aria-label={`切換到 ${next.toUpperCase()}`}
      className="fixed left-3 bottom-24 z-[60] rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      UI {version.toUpperCase()} → {next.toUpperCase()}
    </button>
  )
}
```

在 `lib/hooks/index.ts` 最後加上：

```ts
export { useUiVersion } from "./useUiVersion"
```

在 `app/layout.tsx`：
- 加 import：`import { UiVersionToggle } from "@/components/ui-version/ui-version-toggle"`
- 在 `</AuthGate>` 之後、`</ThemeProvider>` 之前加入 `<UiVersionToggle />`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/hooks/useUiVersion.test.tsx tests/components/ui-version.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full suite and lint**

Run: `npm run test:run && npm run lint`
Expected: 全部 PASS、lint 無新錯誤

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useUiVersion.ts lib/hooks/index.ts components/ui-version app/layout.tsx tests/lib/hooks/useUiVersion.test.tsx tests/components/ui-version.test.tsx
git commit -m "feat: Add useUiVersion hook, version switch and comparison toggle"
```

---

### Task 3: v2 tokens、字體、`UiV2Scope`、v2 頂列

**Files:**
- Create: `components/v2/fonts.ts`
- Create: `components/v2/ui-v2-scope.tsx`
- Create: `components/v2/layout/v2-top-bar.tsx`
- Modify: `app/globals.css`（只在檔案**最後**新增）
- Test: `tests/components/v2/ui-v2-scope.test.tsx`

**Interfaces:**
- Produces:
  - `<UiV2Scope className?>{children}</UiV2Scope>`：根元素 `data-ui="v2"`
  - `<V2TopBar title: string; backHref: string; actions?: ReactNode />`
  - Tailwind 類別：`bg-v2-paper`、`bg-v2-surface`、`text-v2-ink`、`text-v2-ink-muted`、`text-v2-ink-subtle`、`border-v2-line`、`bg-v2-sand`、`bg-v2-lake`、`text-v2-lake`、`bg-v2-lake-soft`、`text-v2-link`、`bg-v2-coral`、`text-v2-coral`、`bg-v2-coral-soft`、`text-v2-plum`、`bg-v2-plum-soft`、`bg-v2-gold`、`text-v2-gold`、`bg-v2-gold-soft`、`text-v2-rose`、`bg-v2-rose-soft`、`text-v2-danger`、`border-v2-check`、`font-v2-serif`、`font-v2-sans`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/ui-v2-scope.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { V2TopBar } from "@/components/v2/layout/v2-top-bar"

describe("UiV2Scope", () => {
  it("marks its subtree as v2 and applies font variables", () => {
    render(
      <UiV2Scope>
        <p>content</p>
      </UiV2Scope>
    )
    const scope = screen.getByText("content").parentElement!
    expect(scope).toHaveAttribute("data-ui", "v2")
    expect(scope.className).toContain("font-var-serif")
    expect(scope.className).toContain("font-var-sans")
  })
})

describe("V2TopBar", () => {
  it("renders title, back link and actions", () => {
    render(<V2TopBar title="旅程總覽" backHref="/projects" actions={<button>分享</button>} />)
    expect(screen.getByRole("heading", { name: "旅程總覽" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/projects")
    expect(screen.getByRole("button", { name: "分享" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/v2/ui-v2-scope.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/ui-v2-scope`

- [ ] **Step 3: Write implementation**

```ts
// components/v2/fonts.ts
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google"

// CJK fonts are large; preload is off and glyphs load by unicode-range.
export const notoSerifTC = Noto_Serif_TC({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-tc",
  display: "swap",
  preload: false,
})

export const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
})
```

```tsx
// components/v2/ui-v2-scope.tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { notoSansTC, notoSerifTC } from "./fonts"

export function UiV2Scope({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-ui="v2"
      className={cn(
        notoSerifTC.variable,
        notoSansTC.variable,
        "min-h-screen bg-v2-paper font-v2-sans text-v2-ink",
        className
      )}
    >
      {children}
    </div>
  )
}
```

```tsx
// components/v2/layout/v2-top-bar.tsx
import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface V2TopBarProps {
  title: string
  backHref: string
  actions?: ReactNode
}

export function V2TopBar({ title, backHref, actions }: V2TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-v2-line px-3.5 py-4">
      <Link
        href={backHref}
        aria-label="返回"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"
      >
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </Link>
      <h1 className="m-0 font-v2-serif text-base font-medium leading-6 tracking-[.15px]">{title}</h1>
      <div className="flex min-w-[34px] justify-end gap-1.5">{actions}</div>
    </div>
  )
}
```

在 `app/globals.css` **檔案最後**新增（不要改動既有內容）：

```css
/* ============================================
   UI v2 tokens — only active under [data-ui="v2"]
   Values from design/project/*.dc.html
   ============================================ */
@theme inline {
  --color-v2-paper: var(--v2-paper);
  --color-v2-surface: var(--v2-surface);
  --color-v2-ink: var(--v2-ink);
  --color-v2-ink-muted: var(--v2-ink-muted);
  --color-v2-ink-subtle: var(--v2-ink-subtle);
  --color-v2-line: var(--v2-line);
  --color-v2-sand: var(--v2-sand);
  --color-v2-check: var(--v2-check);
  --color-v2-lake: var(--v2-lake);
  --color-v2-lake-soft: var(--v2-lake-soft);
  --color-v2-link: var(--v2-link);
  --color-v2-coral: var(--v2-coral);
  --color-v2-coral-soft: var(--v2-coral-soft);
  --color-v2-plum: var(--v2-plum);
  --color-v2-plum-soft: var(--v2-plum-soft);
  --color-v2-gold: var(--v2-gold);
  --color-v2-gold-soft: var(--v2-gold-soft);
  --color-v2-rose: var(--v2-rose);
  --color-v2-rose-soft: var(--v2-rose-soft);
  --color-v2-danger: var(--v2-danger);
  --font-v2-serif: var(--font-noto-serif-tc), serif;
  --font-v2-sans: var(--font-noto-sans-tc), sans-serif;
}

[data-ui="v2"] {
  color-scheme: light;
  --v2-paper: #FAF7F2;
  --v2-surface: #FFFFFF;
  --v2-ink: #1B1815;
  --v2-ink-muted: #6E6860;
  --v2-ink-subtle: #B7AE9D;
  --v2-line: #E7DFD2;
  --v2-sand: #F1EBE0;
  --v2-check: #C9BFAC;
  --v2-lake: #1B5847;
  --v2-lake-soft: #EAF5F1;
  --v2-link: #24735D;
  --v2-coral: #E8825A;
  --v2-coral-soft: #FBEAE0;
  --v2-plum: #6B5B95;
  --v2-plum-soft: #EFEAF7;
  --v2-gold: #9C7A28;
  --v2-gold-soft: #F7EFDD;
  --v2-rose: #A14A68;
  --v2-rose-soft: #F6E9EE;
  --v2-danger: #C4472F;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/v2/ui-v2-scope.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify Tailwind generates the utilities**

Run: `npm run build`
Expected: build 成功（next/font 會下載 Noto 字體；需要網路）。若 build 失敗且錯誤指向 `Noto_Serif_TC` 的 `subsets`，把兩個字體的 `subsets` 改為 `[]` 後重試。

- [ ] **Step 6: Commit**

```bash
git add components/v2 app/globals.css tests/components/v2/ui-v2-scope.test.tsx
git commit -m "feat: Add v2 design tokens, fonts and scope wrapper"
```

---

### Task 4: 封面 `icon:` 格式（只讀）與 v1 相容

**Files:**
- Modify: `lib/covers.ts`
- Modify: `app/projects/page.tsx`（呼叫 `parseCover` 處）
- Test: `tests/lib/covers.test.ts`（在最後新增 describe）

**Interfaces:**
- Produces:
  - `parseCover()` 回傳型別擴充：`{ type: "preset" | "custom" | "icon" | "none"; presetId?; customUrl?; iconId?: string; colorId?: string }`
  - `toLegacyCover(parsed: ReturnType<typeof parseCover>): ReturnType<typeof parseCover>`：`icon` 轉成 `{ type: "preset", presetId: PRESET_COVERS[0].id }`，其他原樣回傳

- [ ] **Step 1: Write the failing test**

在 `tests/lib/covers.test.ts` 最後、最外層 `describe` 之外新增（import 補上 `toLegacyCover`、`PRESET_COVERS`）：

```ts
describe("icon covers", () => {
  it("parses icon:<id>;color:<id>", () => {
    expect(parseCover("icon:leaf;color:teal")).toEqual({
      type: "icon",
      iconId: "leaf",
      colorId: "teal",
    })
  })

  it("treats malformed icon strings as none", () => {
    expect(parseCover("icon:")).toEqual({ type: "none" })
    expect(parseCover("icon:leaf")).toEqual({ type: "none" })
    expect(parseCover("icon:Leaf!;color:teal")).toEqual({ type: "none" })
  })

  it("keeps existing formats unchanged", () => {
    expect(parseCover("preset:1")).toEqual({ type: "preset", presetId: "1" })
    expect(parseCover("data:image/png;base64,AAA")).toEqual({
      type: "custom",
      customUrl: "data:image/png;base64,AAA",
    })
  })

  it("toLegacyCover maps icon covers to the first preset for v1", () => {
    expect(toLegacyCover(parseCover("icon:leaf;color:teal"))).toEqual({
      type: "preset",
      presetId: PRESET_COVERS[0].id,
    })
    expect(toLegacyCover({ type: "none" })).toEqual({ type: "none" })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/covers.test.ts`
Expected: FAIL（`toLegacyCover` 不存在；`icon:` 被解析成 custom）

- [ ] **Step 3: Write implementation**

`lib/covers.ts` 中把 `parseCover` 整段替換為：

```ts
export type ParsedCover = {
  type: "preset" | "custom" | "icon" | "none"
  presetId?: string
  customUrl?: string
  iconId?: string
  colorId?: string
}

const ICON_COVER_PATTERN = /^icon:([a-z0-9-]+);color:([a-z0-9-]+)$/

// 解析 cover 字串，判斷是預設、圖示、還是自訂
export function parseCover(cover: string | null | undefined): ParsedCover {
  if (!cover) {
    return { type: "none" }
  }

  if (cover.startsWith("preset:")) {
    return {
      type: "preset",
      presetId: cover.replace("preset:", ""),
    }
  }

  // v2 icon cover: icon:<iconId>;color:<colorId>
  if (cover.startsWith("icon:")) {
    const match = ICON_COVER_PATTERN.exec(cover)
    if (!match) return { type: "none" }
    return { type: "icon", iconId: match[1], colorId: match[2] }
  }

  // 自訂圖片（base64 或 URL）
  return {
    type: "custom",
    customUrl: cover,
  }
}

// v1 screens do not know icon covers; show the first preset instead of a broken image.
export function toLegacyCover(parsed: ParsedCover): ParsedCover {
  if (parsed.type === "icon") {
    return { type: "preset", presetId: PRESET_COVERS[0].id }
  }
  return parsed
}
```

`app/projects/page.tsx`：
- import 改為 `import { parseCover, getPresetCover, toLegacyCover } from "@/lib/covers"`
- 把 `const coverData = parseCover(project.cover)` 改為 `const coverData = toLegacyCover(parseCover(project.cover))`

`components/cover-picker.tsx` 也有呼叫 `parseCover`：執行 `npx tsc --noEmit -p .`，若該檔對 `type` 做窮舉判斷而報錯，同樣改成 `toLegacyCover(parseCover(...))`；沒報錯就不動。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/covers.test.ts tests/unit/covers.test.ts && npx tsc --noEmit -p .`
Expected: PASS、無型別錯誤

- [ ] **Step 5: Commit**

```bash
git add lib/covers.ts app/projects/page.tsx components/cover-picker.tsx tests/lib/covers.test.ts
git commit -m "feat: Parse v2 icon covers and fall back to preset in v1"
```

---

### Task 5: A1 v1 搬移與 `useProjects` hook

**Files:**
- Create: `lib/hooks/useProjects.ts`
- Create: `components/v1/projects/projects-v1.tsx`（由 `app/projects/page.tsx` 搬移）
- Modify: `app/projects/page.tsx`
- Modify: `lib/hooks/index.ts`
- Test: `tests/lib/hooks/useProjects.test.tsx`

**Interfaces:**
- Consumes: `useAuthFetch()`
- Produces:
  - `interface ProjectListItem`（與原 `app/projects/page.tsx` 內 `Project` 介面相同欄位：`id, name, description, cover, startDate, endDate, currency, createdAt, updatedAt, creator, members: ProjectListMember[], totalAmount, _count: { expenses, members }`）
  - `interface ProjectListMember`（原 `ProjectMember` 介面）
  - `useProjects(): { projects: ProjectListItem[]; loading: boolean }`
  - `ProjectsV1(): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/lib/hooks/useProjects.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

const mockAuthFetch = vi.fn()
vi.mock("@/components/auth/liff-provider", () => ({
  useAuthFetch: () => mockAuthFetch,
}))

import { useProjects } from "@/lib/hooks/useProjects"

describe("useProjects", () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it("loads projects", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => [{ id: "p1" }] })
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toEqual([{ id: "p1" }])
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/projects")
  })

  it("stops loading with an empty list on error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mockAuthFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    const { result } = renderHook(() => useProjects())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/hooks/useProjects.test.tsx`
Expected: FAIL，無法解析 `@/lib/hooks/useProjects`

- [ ] **Step 3: Write the hook**

```ts
// lib/hooks/useProjects.ts
"use client"

import { useEffect, useState } from "react"
import { useAuthFetch } from "@/components/auth/liff-provider"

export interface ProjectListMember {
  id: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  role: string
}

export interface ProjectListItem {
  id: string
  name: string
  description: string | null
  cover: string | null
  startDate: string | null
  endDate: string | null
  currency: string
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: ProjectListMember[]
  totalAmount: number
  _count: {
    expenses: number
    members: number
  }
}

export function useProjects() {
  const authFetch = useAuthFetch()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await authFetch("/api/projects")
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("獲取專案失敗:", res.status, errorData)
          return
        }
        setProjects(await res.json())
      } catch (error) {
        console.error("獲取專案錯誤:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { projects, loading }
}
```

在 `lib/hooks/index.ts` 加上：

```ts
export { useProjects, type ProjectListItem, type ProjectListMember } from "./useProjects"
```

- [ ] **Step 4: Move the v1 page**

```bash
mkdir -p components/v1/projects
git mv app/projects/page.tsx components/v1/projects/projects-v1.tsx
```

在 `components/v1/projects/projects-v1.tsx`：
1. 刪除檔內的 `interface ProjectMember {...}` 與 `interface Project {...}` 兩段。
2. 刪除 `import { useAuthFetch } from "@/components/auth/liff-provider"`，加入 `import { useProjects } from "@/lib/hooks/useProjects"`。
3. `import React, { useEffect, useState } from "react"` 改為 `import React from "react"`。
4. `export default function ProjectsPage() {` 改為 `export function ProjectsV1() {`。
5. 把函式開頭從 `const [projects, setProjects] = ...` 到 `fetchProjects` 函式結束的整段（`useState` ×2、`authFetch`、`useEffect`、`async function fetchProjects() {...}`）替換為：

```tsx
  const { projects, loading } = useProjects()
```

建立新的 `app/projects/page.tsx`：

```tsx
"use client"

import { ProjectsV1 } from "@/components/v1/projects/projects-v1"

export default function ProjectsPage() {
  return <ProjectsV1 />
}
```

- [ ] **Step 5: Run tests, types and lint**

Run: `npx vitest run tests/lib/hooks/useProjects.test.tsx && npx tsc --noEmit -p . && npm run lint`
Expected: PASS、無型別錯誤、lint 無新錯誤

- [ ] **Step 6: Manual check — v1 unchanged**

Run: `npm run dev`，開 `http://localhost:3000/projects`
Expected: 畫面與改動前完全相同（列表、封面、廣告、新增專案按鈕）

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useProjects.ts lib/hooks/index.ts components/v1/projects app/projects/page.tsx tests/lib/hooks/useProjects.test.tsx
git commit -m "refactor: Move projects list to ProjectsV1 and extract useProjects"
```

---

### Task 6: 旅程日期工具函式

**Files:**
- Create: `lib/trip.ts`
- Test: `tests/lib/trip.test.ts`

**Interfaces:**
- Produces:
  - `type TripStatus = "active" | "completed"`
  - `getTripStatus(endDate: string | null, now: Date): TripStatus`（無結束日＝進行中；結束日當天 23:59:59.999 之後＝已完成）
  - `getTripDays(startDate: string | null, endDate: string | null): number | null`（含頭尾；缺任一日期回傳 `null`）
  - `formatTripDateRange(startDate: string | null, endDate: string | null): string`（`"11/12 – 11/16"`、`"11/12 出發"`、`"尚未設定日期"`）
  - `getGreeting(now: Date): string`（0–4 時「晚安」、5–10「早安」、11–17「午安」、18–23「晚安」）

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/trip.test.ts
import { describe, it, expect } from "vitest"
import { getTripStatus, getTripDays, formatTripDateRange, getGreeting } from "@/lib/trip"

// Local-time dates keep the assertions timezone independent.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

describe("getTripStatus", () => {
  const now = new Date(2026, 10, 16, 12) // 2026-11-16 12:00 local

  it("is active without an end date", () => {
    expect(getTripStatus(null, now)).toBe("active")
  })

  it("is active on the last day", () => {
    expect(getTripStatus(local(2026, 11, 16, 0), now)).toBe("active")
  })

  it("is completed after the last day", () => {
    expect(getTripStatus(local(2026, 11, 15), now)).toBe("completed")
  })
})

describe("getTripDays", () => {
  it("counts both ends", () => {
    expect(getTripDays(local(2026, 11, 12), local(2026, 11, 16))).toBe(5)
  })

  it("is 1 for a same-day trip", () => {
    expect(getTripDays(local(2026, 11, 12), local(2026, 11, 12))).toBe(1)
  })

  it("is null when a date is missing", () => {
    expect(getTripDays(null, local(2026, 11, 16))).toBeNull()
    expect(getTripDays(local(2026, 11, 12), null)).toBeNull()
  })
})

describe("formatTripDateRange", () => {
  it("formats a full range", () => {
    expect(formatTripDateRange(local(2026, 11, 12), local(2026, 11, 16))).toBe("11/12 – 11/16")
  })

  it("formats a start date only", () => {
    expect(formatTripDateRange(local(2026, 9, 20), null)).toBe("9/20 出發")
  })

  it("handles no dates", () => {
    expect(formatTripDateRange(null, null)).toBe("尚未設定日期")
    expect(formatTripDateRange(null, local(2026, 9, 25))).toBe("尚未設定日期")
  })
})

describe("getGreeting", () => {
  it.each([
    [3, "晚安"],
    [5, "早安"],
    [10, "早安"],
    [11, "午安"],
    [17, "午安"],
    [18, "晚安"],
  ])("hour %i → %s", (hour, expected) => {
    expect(getGreeting(new Date(2026, 0, 1, hour))).toBe(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/trip.test.ts`
Expected: FAIL，無法解析 `@/lib/trip`

- [ ] **Step 3: Write implementation**

```ts
// lib/trip.ts
export type TripStatus = "active" | "completed"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// A trip without an end date is treated as active.
export function getTripStatus(endDate: string | null, now: Date): TripStatus {
  if (!endDate) return "active"
  const endOfLastDay = startOfLocalDay(new Date(endDate)) + DAY_MS - 1
  return now.getTime() > endOfLastDay ? "completed" : "active"
}

export function getTripDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null
  const diff = startOfLocalDay(new Date(endDate)) - startOfLocalDay(new Date(startDate))
  return Math.round(diff / DAY_MS) + 1
}

export function formatTripDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "尚未設定日期"
  const start = monthDay(new Date(startDate))
  if (!endDate) return `${start} 出發`
  return `${start} – ${monthDay(new Date(endDate))}`
}

export function getGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour >= 5 && hour < 11) return "早安"
  if (hour >= 11 && hour < 18) return "午安"
  return "晚安"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/trip.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/trip.ts tests/lib/trip.test.ts
git commit -m "feat: Add trip date helpers for v2 list"
```

---

### Task 7: A1 旅程列表 v2

**Files:**
- Create: `components/v2/projects/cover-thumb.tsx`
- Create: `components/v2/projects/projects-v2-view.tsx`
- Create: `components/v2/projects/projects-v2.tsx`
- Modify: `app/projects/page.tsx`
- Test: `tests/components/v2/projects-v2-view.test.tsx`

**Interfaces:**
- Consumes: `ProjectListItem`（Task 5）、`useProjects()`（Task 5）、`parseCover`／`getPresetCover`（Task 4）、`getTripStatus`／`getTripDays`／`formatTripDateRange`／`getGreeting`（Task 6）、`UiV2Scope`（Task 3）、`UiVersionSwitch`（Task 2）、`formatCurrency`、`DEFAULT_CURRENCY`、`AdContainer`、`useLiff`
- Produces:
  - `<CoverThumb cover: string | null />`（64×64 圓角縮圖）
  - `<ProjectsV2View projects: ProjectListItem[]; loading: boolean; userName: string | null; now: Date; adSlot?: ReactNode />`
  - `ProjectsV2(): JSX.Element`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/projects-v2-view.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { ProjectsV2View } from "@/components/v2/projects/projects-v2-view"
import type { ProjectListItem } from "@/lib/hooks/useProjects"

const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()
const now = new Date(2026, 10, 14, 9) // 2026-11-14 09:00

function project(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: "p",
    name: "旅程",
    description: null,
    cover: null,
    startDate: null,
    endDate: null,
    currency: "TWD",
    createdAt: local(2026, 1, 1),
    updatedAt: local(2026, 1, 1),
    creator: { id: "u1", name: "Emma", email: "e@x.com" },
    members: [],
    totalAmount: 0,
    _count: { expenses: 0, members: 0 },
    ...overrides,
  }
}

const member = (id: string, displayName: string) => ({ id, displayName, user: null, role: "member" })

const projects: ProjectListItem[] = [
  project({
    id: "tokyo",
    name: "東京賞楓 5 日",
    startDate: local(2026, 11, 12),
    endDate: local(2026, 11, 16),
    totalAmount: 48600,
    members: [member("m1", "小美"), member("m2", "志明"), member("m3", "阿凱"), member("m4", "我"), member("m5", "婷")],
    _count: { expenses: 12, members: 5 },
  }),
  project({
    id: "seoul",
    name: "首爾血拼週末",
    startDate: local(2026, 8, 1),
    endDate: local(2026, 8, 3),
    totalAmount: 15900,
    members: [member("m6", "婷")],
    _count: { expenses: 3, members: 1 },
  }),
  project({ id: "chiangmai", name: "清邁數位遊牧", totalAmount: 2300 }),
]

describe("ProjectsV2View", () => {
  it("renders greeting, title and cards", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    expect(screen.getByText("早安，Emma")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "你的旅程" })).toBeInTheDocument()

    const tokyo = screen.getByRole("link", { name: /東京賞楓 5 日/ })
    expect(tokyo).toHaveAttribute("href", "/projects/tokyo")
    expect(within(tokyo).getByText("5 天")).toBeInTheDocument()
    expect(within(tokyo).getByText("11/12 – 11/16 · 5 位旅伴")).toBeInTheDocument()
    expect(within(tokyo).getByText("TWD 48,600")).toBeInTheDocument()
    expect(within(tokyo).getByText("+2")).toBeInTheDocument()
  })

  it("shows placeholder date text and no day badge without dates", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    const card = screen.getByRole("link", { name: /清邁數位遊牧/ })
    expect(within(card).getByText("尚未設定日期")).toBeInTheDocument()
    expect(within(card).queryByText(/天$/)).not.toBeInTheDocument()
  })

  it("filters by status", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)

    fireEvent.click(screen.getByRole("button", { name: "已完成" }))
    expect(screen.getByText("首爾血拼週末")).toBeInTheDocument()
    expect(screen.queryByText("東京賞楓 5 日")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "進行中" }))
    expect(screen.getByText("東京賞楓 5 日")).toBeInTheDocument()
    expect(screen.getByText("清邁數位遊牧")).toBeInTheDocument()
    expect(screen.queryByText("首爾血拼週末")).not.toBeInTheDocument()
  })

  it("links to settings and new trip", () => {
    render(<ProjectsV2View projects={projects} loading={false} userName="Emma" now={now} />)
    expect(screen.getByRole("link", { name: "通用設定" })).toHaveAttribute("href", "/settings")
    expect(screen.getByRole("link", { name: "建立新旅程" })).toHaveAttribute("href", "/projects/new")
  })

  it("shows an empty state", () => {
    render(<ProjectsV2View projects={[]} loading={false} userName={null} now={now} />)
    expect(screen.getByText("還沒有旅程")).toBeInTheDocument()
    expect(screen.getByText("你好")).toBeInTheDocument()
  })

  it("shows an empty-filter message", () => {
    render(<ProjectsV2View projects={[projects[0]]} loading={false} userName="Emma" now={now} />)
    fireEvent.click(screen.getByRole("button", { name: "已完成" }))
    expect(screen.getByText("沒有符合的旅程")).toBeInTheDocument()
  })

  it("renders skeletons while loading", () => {
    render(<ProjectsV2View projects={[]} loading={true} userName="Emma" now={now} />)
    expect(screen.getAllByTestId("v2-project-skeleton")).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/projects/projects-v2-view`

- [ ] **Step 3: Write `CoverThumb`**

```tsx
// components/v2/projects/cover-thumb.tsx
import Image from "next/image"
import { Leaf } from "lucide-react"
import { parseCover, getPresetCover } from "@/lib/covers"

// Icon/color ids are written from milestone 4; until then any icon cover
// renders the default leaf on the lake gradient.
export function CoverThumb({ cover }: { cover: string | null }) {
  const parsed = parseCover(cover)
  const box = "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"

  if (parsed.type === "custom" && parsed.customUrl) {
    return (
      <div className={box}>
        <Image src={parsed.customUrl} alt="" fill className="object-cover" />
      </div>
    )
  }

  if (parsed.type === "preset") {
    const preset = getPresetCover(parsed.presetId!)
    if (preset) {
      return (
        <div className={`${box} flex items-center justify-center text-2xl`} style={{ background: preset.gradient }}>
          <span aria-hidden="true">{preset.emoji}</span>
        </div>
      )
    }
  }

  return (
    <div className={`${box} flex items-center justify-center bg-gradient-to-br from-v2-lake-soft to-[#CFE8DC]`}>
      <Leaf className="h-[26px] w-[26px] text-v2-lake" strokeWidth={1.5} />
    </div>
  )
}
```

- [ ] **Step 4: Write `ProjectsV2View`**

```tsx
// components/v2/projects/projects-v2-view.tsx
"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Compass, Plus } from "lucide-react"
import type { ProjectListItem, ProjectListMember } from "@/lib/hooks/useProjects"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { formatTripDateRange, getGreeting, getTripDays, getTripStatus, type TripStatus } from "@/lib/trip"
import { CoverThumb } from "./cover-thumb"

type Filter = "all" | TripStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "進行中" },
  { value: "completed", label: "已完成" },
]

// Avatar tones cycle through the v2 palette.
const AVATAR_TONES = [
  "bg-v2-lake-soft text-v2-lake",
  "bg-v2-coral-soft text-v2-coral",
  "bg-v2-plum-soft text-v2-plum",
  "bg-v2-rose-soft text-v2-rose",
  "bg-v2-gold-soft text-v2-gold",
]

interface ProjectsV2ViewProps {
  projects: ProjectListItem[]
  loading: boolean
  userName: string | null
  now: Date
  adSlot?: ReactNode
}

export function ProjectsV2View({ projects, loading, userName, now, adSlot }: ProjectsV2ViewProps) {
  const [filter, setFilter] = useState<Filter>("all")
  const visible = projects.filter((p) => filter === "all" || getTripStatus(p.endDate, now) === filter)
  const initial = userName?.trim().charAt(0).toUpperCase() || "?"

  return (
    <div className="pb-5">
      <div className="flex items-center justify-between px-5 pb-1 pt-[22px]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-v2-lake text-v2-paper">
            <Compass className="h-[17px] w-[17px]" strokeWidth={1.6} />
          </div>
          <span className="text-[15px] font-bold tracking-[.1px]">Wander Wallet</span>
        </div>
        <Link
          href="/settings"
          aria-label="通用設定"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-v2-lake text-sm font-bold text-v2-paper"
        >
          {initial}
        </Link>
      </div>

      <div className="flex items-end justify-between gap-3 px-5 pb-4 pt-3.5">
        <div>
          <p className="mb-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
            {userName ? `${getGreeting(now)}，${userName}` : "你好"}
          </p>
          <h1 className="m-0 font-v2-serif text-[32px] font-bold leading-10">你的旅程</h1>
        </div>
        <Link
          href="/projects/new"
          aria-label="建立新旅程"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-v2-lake text-white shadow-[0_4px_10px_rgba(27,88,71,.25)]"
        >
          <Plus className="h-[19px] w-[19px]" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 px-5 pb-4">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-full bg-v2-lake px-[18px] py-2 text-sm font-medium leading-5 tracking-[.1px] text-white"
                : "rounded-full px-3.5 py-2 text-sm font-medium leading-5 tracking-[.1px] text-v2-ink-muted"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {adSlot && <div className="px-5 pb-4">{adSlot}</div>}

      <div className="flex flex-col gap-2.5 px-5">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              data-testid="v2-project-skeleton"
              className="h-[90px] animate-pulse rounded-2xl border border-v2-line bg-v2-surface"
            />
          ))
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-v2-line bg-v2-surface px-5 py-12 text-center">
            <p className="font-v2-serif text-[17px] font-semibold">還沒有旅程</p>
            <p className="mt-1 text-xs text-v2-ink-muted">建立旅程來記錄旅行中的共同開銷</p>
            <Link
              href="/projects/new"
              className="mt-5 inline-flex rounded-full bg-v2-lake px-6 py-3 text-[15px] font-bold text-white"
            >
              建立旅程
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-v2-ink-muted">沒有符合的旅程</p>
        ) : (
          visible.map((p) => <ProjectCard key={p.id} project={p} />)
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: ProjectListItem }) {
  const days = getTripDays(project.startDate, project.endDate)
  const memberCount = project._count.members || project.members.length
  const dateLine = project.startDate
    ? `${formatTripDateRange(project.startDate, project.endDate)} · ${memberCount} 位旅伴`
    : formatTripDateRange(project.startDate, project.endDate)

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-start gap-3 rounded-2xl border border-v2-line bg-v2-surface p-3 shadow-[0_2px_8px_rgba(27,24,21,.05)]"
    >
      <CoverThumb cover={project.cover} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="m-0 truncate font-v2-serif text-base font-medium leading-6 tracking-[.15px]">{project.name}</h3>
          {days !== null && (
            <span className="shrink-0 rounded-full bg-v2-lake px-2.5 py-[3px] text-xs font-bold leading-4 tracking-[.5px] text-white">
              {days} 天
            </span>
          )}
        </div>
        <p className="mb-2 mt-0.5 truncate text-xs leading-4 tracking-[.4px] text-v2-ink-muted">{dateLine}</p>
        <div className="flex items-center justify-between">
          <AvatarStack members={project.members} total={memberCount} />
          <p className="m-0 font-v2-serif text-base font-bold leading-6 tracking-[.15px] tabular-nums text-v2-lake">
            {formatCurrency(project.totalAmount, project.currency || DEFAULT_CURRENCY)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function AvatarStack({ members, total }: { members: ProjectListMember[]; total: number }) {
  const shown = members.slice(0, 3)
  const extra = total - shown.length
  const bubble = "flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold"

  return (
    <div className="flex">
      {shown.map((m, i) => (
        <div key={m.id} className={`${bubble} ${AVATAR_TONES[i % AVATAR_TONES.length]} ${i > 0 ? "-ml-1.5" : ""}`}>
          {m.displayName.charAt(0)}
        </div>
      ))}
      {extra > 0 && <div className={`${bubble} -ml-1.5 bg-v2-line text-[7px] text-v2-ink-muted`}>+{extra}</div>}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: PASS

- [ ] **Step 6: Write the container and wire the page**

```tsx
// components/v2/projects/projects-v2.tsx
"use client"

import { useLiff } from "@/components/auth/liff-provider"
import { AdContainer } from "@/components/ads/ad-container"
import { useProjects } from "@/lib/hooks/useProjects"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { ProjectsV2View } from "./projects-v2-view"

export function ProjectsV2() {
  const { user } = useLiff()
  const { projects, loading } = useProjects()

  return (
    <UiV2Scope>
      <div className="mx-auto max-w-md">
        <ProjectsV2View
          projects={projects}
          loading={loading}
          userName={user?.name ?? null}
          now={new Date()}
          adSlot={<AdContainer placement="project-list" variant="banner" />}
        />
      </div>
    </UiV2Scope>
  )
}
```

`app/projects/page.tsx` 改為：

```tsx
"use client"

import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectsV1 } from "@/components/v1/projects/projects-v1"
import { ProjectsV2 } from "@/components/v2/projects/projects-v2"

export default function ProjectsPage() {
  return <UiVersionSwitch v1={<ProjectsV1 />} v2={<ProjectsV2 />} />
}
```

- [ ] **Step 7: Full suite, lint, manual compare**

Run: `npm run test:run && npm run lint`
Expected: PASS

Run: `npm run dev`，分別開 `/projects?ui=v1` 與 `/projects?ui=v2`
Expected: v1 與改動前相同；v2 與 `design/project/MainCard3-njus.dc.html` 一致；左下角出現切換按鈕，按下後兩版互換。

- [ ] **Step 8: Commit**

```bash
git add components/v2/projects app/projects/page.tsx tests/components/v2/projects-v2-view.test.tsx
git commit -m "feat: Add v2 trip list (A1) behind ui version switch"
```

---

### Task 8: A2 摘要計算純函式

**Files:**
- Create: `lib/project-overview.ts`
- Test: `tests/lib/project-overview.test.ts`

**Interfaces:**
- Produces:
  - `OverviewMember`、`OverviewExpense`、`OverviewProject` 介面（欄位與原 `app/projects/[id]/page.tsx` 內 `ProjectMember`、`Expense`、`Project` 相同，另 `OverviewProject` 多 `cover?: string | null`）
  - `interface ProjectSummary { totalAmount: number; perPerson: number; budget: number | null; budgetProgress: number; budgetRemaining: number | null; userBalance: number; hasMixedCurrencies: boolean; currentMemberId: string | null }`
  - `computeProjectSummary(project: OverviewProject, convert: (amount: number, currency: string) => number, currentUserId: string | null): ProjectSummary`
  - `getRecentExpenses(expenses: OverviewExpense[], limit = 5): OverviewExpense[]`（依 `createdAt` 新到舊）

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/project-overview.test.ts
import { describe, it, expect } from "vitest"
import {
  computeProjectSummary,
  getRecentExpenses,
  type OverviewExpense,
  type OverviewProject,
} from "@/lib/project-overview"

const identity = (amount: number) => amount

const member = (id: string, userId: string | null) => ({
  id,
  role: "member",
  displayName: id,
  user: userId ? { id: userId, name: id, email: `${id}@x.com`, image: null } : null,
})

function expense(id: string, payerId: string, amount: number, shares: Record<string, number>, extra: Partial<OverviewExpense> = {}): OverviewExpense {
  return {
    id,
    amount,
    currency: "TWD",
    description: id,
    category: "food",
    createdAt: "2026-11-12T10:00:00.000Z",
    payer: { id: payerId, displayName: payerId, user: null },
    participants: Object.entries(shares).map(([memberId, shareAmount]) => ({ id: `${id}-${memberId}`, memberId, shareAmount })),
    ...extra,
  }
}

function project(overrides: Partial<OverviewProject> = {}): OverviewProject {
  return {
    id: "p1",
    name: "東京",
    description: null,
    budget: null,
    currency: "TWD",
    exchangeRatePrecision: 2,
    startDate: null,
    endDate: null,
    customRates: null,
    creator: { id: "u1", name: "Emma", email: "e@x.com" },
    members: [member("me", "u1"), member("chi", "u2")],
    expenses: [],
    ...overrides,
  }
}

describe("computeProjectSummary", () => {
  it("sums totals and per-person amounts", () => {
    const p = project({ expenses: [expense("a", "me", 300, { me: 150, chi: 150 }), expense("b", "chi", 100, { me: 50, chi: 50 })] })
    const s = computeProjectSummary(p, identity, "u1")
    expect(s.totalAmount).toBe(400)
    expect(s.perPerson).toBe(200)
    expect(s.currentMemberId).toBe("me")
    // paid 300, owes 150 + 50
    expect(s.userBalance).toBe(100)
  })

  it("returns zeros for an empty project without NaN", () => {
    const s = computeProjectSummary(project({ members: [], expenses: [] }), identity, "u1")
    expect(s.totalAmount).toBe(0)
    expect(s.perPerson).toBe(0)
    expect(s.userBalance).toBe(0)
    expect(s.currentMemberId).toBeNull()
  })

  it("ignores zero-amount expenses in the balance", () => {
    const p = project({ expenses: [expense("z", "me", 0, { me: 0, chi: 0 })] })
    expect(computeProjectSummary(p, identity, "u1").userBalance).toBe(0)
  })

  it("caps budget progress at 100 and keeps the negative remainder", () => {
    const p = project({ budget: "300", expenses: [expense("a", "me", 400, { me: 200, chi: 200 })] })
    const s = computeProjectSummary(p, identity, "u1")
    expect(s.budget).toBe(300)
    expect(s.budgetProgress).toBe(100)
    expect(s.budgetRemaining).toBe(-100)
  })

  it("has no budget fields when budget is unset", () => {
    const s = computeProjectSummary(project(), identity, "u1")
    expect(s.budget).toBeNull()
    expect(s.budgetProgress).toBe(0)
    expect(s.budgetRemaining).toBeNull()
  })

  it("converts foreign currency and flags mixed currencies", () => {
    const toTwd = (amount: number, currency: string) => (currency === "JPY" ? amount * 0.2 : amount)
    const p = project({
      expenses: [expense("a", "me", 1000, { me: 500, chi: 500 }, { currency: "JPY" }), expense("b", "chi", 100, { me: 50, chi: 50 })],
    })
    const s = computeProjectSummary(p, toTwd, "u1")
    expect(s.totalAmount).toBe(300)
    expect(s.hasMixedCurrencies).toBe(true)
    // paid 200 (converted); owes 100 (half of 200) + 50
    expect(s.userBalance).toBe(50)
  })

  it("gives 0 balance to a non-member viewer", () => {
    const p = project({ expenses: [expense("a", "me", 300, { me: 150, chi: 150 })] })
    expect(computeProjectSummary(p, identity, "stranger").userBalance).toBe(0)
  })
})

describe("getRecentExpenses", () => {
  it("returns the newest first, limited", () => {
    const list = [1, 2, 3, 4, 5, 6].map((d) =>
      expense(`e${d}`, "me", 10, { me: 10 }, { createdAt: `2026-11-0${d}T00:00:00.000Z` })
    )
    expect(getRecentExpenses(list).map((e) => e.id)).toEqual(["e6", "e5", "e4", "e3", "e2"])
    expect(getRecentExpenses(list, 2).map((e) => e.id)).toEqual(["e6", "e5"])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/project-overview.test.ts`
Expected: FAIL，無法解析 `@/lib/project-overview`

- [ ] **Step 3: Write implementation**

```ts
// lib/project-overview.ts
export interface OverviewMember {
  id: string
  role: string
  displayName: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface OverviewParticipant {
  id: string
  memberId: string
  shareAmount: number
}

export interface OverviewExpense {
  id: string
  amount: number
  currency: string
  description: string | null
  category: string | null
  createdAt: string
  payer: {
    id: string
    displayName: string
    user: {
      name: string | null
      email: string
    } | null
  }
  participants: OverviewParticipant[]
}

export interface OverviewProject {
  id: string
  name: string
  description: string | null
  cover?: string | null
  budget: string | null
  currency: string
  exchangeRatePrecision: number
  startDate: string | null
  endDate: string | null
  customRates: Record<string, number> | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  members: OverviewMember[]
  expenses: OverviewExpense[]
}

export interface ProjectSummary {
  totalAmount: number
  perPerson: number
  budget: number | null
  budgetProgress: number
  budgetRemaining: number | null
  userBalance: number
  hasMixedCurrencies: boolean
  currentMemberId: string | null
}

type Convert = (amount: number, currency: string) => number

export function computeProjectSummary(
  project: OverviewProject,
  convert: Convert,
  currentUserId: string | null
): ProjectSummary {
  const totalAmount = project.expenses.reduce((sum, e) => sum + convert(Number(e.amount), e.currency), 0)
  const perPerson = project.members.length > 0 ? totalAmount / project.members.length : 0
  const budget = project.budget ? Number(project.budget) : null
  const budgetProgress = budget ? Math.min((totalAmount / budget) * 100, 100) : 0
  const budgetRemaining = budget ? budget - totalAmount : null

  const membership = currentUserId ? project.members.find((m) => m.user?.id === currentUserId) : undefined

  // Balance = what the user paid - what the user owes, in project currency.
  let userBalance = 0
  if (membership) {
    let paid = 0
    let owed = 0
    for (const expense of project.expenses) {
      const amount = Number(expense.amount)
      const converted = convert(amount, expense.currency)
      if (expense.payer.id === membership.id) paid += converted
      const participant = expense.participants.find((p) => p.memberId === membership.id)
      if (participant && amount !== 0) {
        owed += converted * (Number(participant.shareAmount) / amount)
      }
    }
    userBalance = paid - owed
  }

  return {
    totalAmount,
    perPerson,
    budget,
    budgetProgress,
    budgetRemaining,
    userBalance: Number.isFinite(userBalance) ? userBalance : 0,
    hasMixedCurrencies: new Set(project.expenses.map((e) => e.currency)).size > 1,
    currentMemberId: membership?.id ?? null,
  }
}

export function getRecentExpenses(expenses: OverviewExpense[], limit = 5): OverviewExpense[] {
  return [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/project-overview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/project-overview.ts tests/lib/project-overview.test.ts
git commit -m "feat: Extract project overview summary calculation"
```

---

### Task 9: A2 v1 搬移，抽出 `useProjectOverview` 與共用對話框

**Files:**
- Create: `lib/hooks/useProjectOverview.ts`
- Create: `components/project/join-project-dialog.tsx`
- Create: `components/project/invite-dialog.tsx`
- Create: `components/v1/project/project-overview-v1.tsx`（由 `app/projects/[id]/page.tsx` 搬移）
- Modify: `app/projects/[id]/page.tsx`
- Test: `tests/components/join-project-dialog.test.tsx`

**Interfaces:**
- Consumes: Task 8 全部匯出；`useAuthFetch`、`useLiff`；`useCurrencyConversion`；`getProjectShareUrl`
- Produces:
  - `interface JoinInfo { name: string; description: string | null; joinMode: string; unclaimedMembers: { id: string; displayName: string }[] }`
  - `useProjectOverview(projectId: string): { project: OverviewProject | null; loading: boolean; joinInfo: JoinInfo | null; joining: boolean; joinProject: () => Promise<void>; claimMember: (memberId: string) => Promise<void>; refetch: () => Promise<void>; summary: ProjectSummary | null }`
  - `<JoinProjectDialog info: JoinInfo; joining: boolean; onJoin: () => void; onClaim: (memberId: string) => void; onCancel: () => void />`
  - `<InviteDialog open: boolean; onOpenChange: (open: boolean) => void; projectId: string; projectName: string />`
  - `ProjectOverviewV1({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/join-project-dialog.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"

const base = { name: "東京", description: null, unclaimedMembers: [{ id: "m1", displayName: "阿凱" }] }

describe("JoinProjectDialog", () => {
  it("offers both claim and create when joinMode is both", () => {
    const onJoin = vi.fn()
    const onClaim = vi.fn()
    render(<JoinProjectDialog info={{ ...base, joinMode: "both" }} joining={false} onJoin={onJoin} onClaim={onClaim} onCancel={vi.fn()} />)

    expect(screen.getByText("加入「東京」")).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("阿凱"))
    fireEvent.click(screen.getByRole("button", { name: "確認認領" }))
    expect(onClaim).toHaveBeenCalledWith("m1")

    fireEvent.click(screen.getByRole("button", { name: "以新成員加入" }))
    expect(onJoin).toHaveBeenCalled()
  })

  it("explains when nothing can be joined", () => {
    render(
      <JoinProjectDialog
        info={{ ...base, joinMode: "claim_only", unclaimedMembers: [] }}
        joining={false}
        onJoin={vi.fn()}
        onClaim={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText("此專案目前沒有可認領的佔位成員，請聯繫專案創建者")).toBeInTheDocument()
  })

  it("calls onCancel from the cancel button", () => {
    const onCancel = vi.fn()
    render(<JoinProjectDialog info={{ ...base, joinMode: "create_only" }} joining={false} onJoin={vi.fn()} onClaim={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/join-project-dialog.test.tsx`
Expected: FAIL，無法解析 `@/components/project/join-project-dialog`

- [ ] **Step 3: Write `JoinProjectDialog`**

JSX 與原 `app/projects/[id]/page.tsx` 中「顯示加入 Dialog（非成員）」區塊的 `<Dialog>` 相同，只把狀態改為 props／內部 state：

```tsx
// components/project/join-project-dialog.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface JoinInfo {
  name: string
  description: string | null
  joinMode: string
  unclaimedMembers: { id: string; displayName: string }[]
}

interface JoinProjectDialogProps {
  info: JoinInfo
  joining: boolean
  onJoin: () => void
  onClaim: (memberId: string) => void
  onCancel: () => void
}

export function JoinProjectDialog({ info, joining, onJoin, onClaim, onCancel }: JoinProjectDialogProps) {
  const [selectedMemberToClaim, setSelectedMemberToClaim] = useState<string | null>(null)
  const { joinMode, unclaimedMembers } = info
  const canCreate = joinMode === "both" || joinMode === "create_only"
  const canClaim = (joinMode === "both" || joinMode === "claim_only") && unclaimedMembers.length > 0

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>加入「{info.name}」</DialogTitle>
          <DialogDescription>
            {joinMode === "claim_only"
              ? "請選擇你要認領的佔位成員"
              : joinMode === "create_only"
              ? "你將以新成員身份加入此專案"
              : "選擇加入方式"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {canClaim && (
            <div>
              <p className="text-sm font-medium mb-2">認領現有成員</p>
              <p className="text-xs text-muted-foreground mb-3">
                如果專案創建者已經幫你新增了佔位成員，請選擇你的名字
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {unclaimedMembers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedMemberToClaim === member.id
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="claimMember"
                      value={member.id}
                      checked={selectedMemberToClaim === member.id}
                      onChange={() => setSelectedMemberToClaim(member.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{member.displayName}</span>
                  </label>
                ))}
              </div>
              {selectedMemberToClaim && (
                <Button onClick={() => onClaim(selectedMemberToClaim)} disabled={joining} className="w-full mt-3">
                  {joining ? "認領中..." : "確認認領"}
                </Button>
              )}
            </div>
          )}

          {canCreate && canClaim && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">或</span>
              </div>
            </div>
          )}

          {canCreate && (
            <div>
              {canClaim && <p className="text-sm font-medium mb-2">建立新成員</p>}
              <p className="text-xs text-muted-foreground mb-3">
                以新成員身份加入，可查看支出記錄、新增支出並參與分帳
              </p>
              <Button
                onClick={onJoin}
                disabled={joining}
                variant={canClaim ? "outline" : "default"}
                className="w-full"
              >
                {joining ? "加入中..." : "以新成員加入"}
              </Button>
            </div>
          )}

          {!canCreate && !canClaim && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                此專案目前沒有可認領的佔位成員，請聯繫專案創建者
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={joining} className="w-full">
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/join-project-dialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Write `InviteDialog`**

內容與原檔「邀請對話框」區塊相同，分享處理函式搬入元件：

```tsx
// components/project/invite-dialog.tsx
"use client"

import { useEffect, useState } from "react"
import { Check, Link2, MessageCircle, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getProjectShareUrl } from "@/lib/utils"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

export function InviteDialog({ open, onOpenChange, projectId, projectName }: InviteDialogProps) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const shareUrl = getProjectShareUrl(projectId)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share)
  }, [])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareToLine() {
    const text = `一起來分帳吧！加入「${projectName}」\n${shareUrl}`
    window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank")
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      handleCopyLink()
      return
    }
    try {
      await navigator.share({ title: `加入「${projectName}」`, text: "點擊連結加入旅行專案", url: shareUrl })
    } catch {
      // cancelled
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀請成員加入</DialogTitle>
          <DialogDescription>選擇分享方式邀請朋友加入專案</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`grid gap-3 ${canNativeShare ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              onClick={handleShareToLine}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-[#06C755] flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">LINE</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-slate-500 flex items-center justify-center">
                {copied ? <Check className="h-6 w-6 text-white" /> : <Link2 className="h-6 w-6 text-white" />}
              </div>
              <span className="text-sm font-medium">{copied ? "已複製" : "複製連結"}</span>
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <MoreHorizontal className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-medium">更多</span>
              </button>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">分享連結</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{shareUrl}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: Write `useProjectOverview`**

邏輯與原檔 `fetchProject`、`handleJoinProject`、`handleClaimMember` 相同（包括 404 導回 `/projects` 與 `alert` 行為）：

```ts
// lib/hooks/useProjectOverview.ts
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthFetch, useLiff } from "@/components/auth/liff-provider"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useCurrencyConversion } from "@/lib/hooks/useCurrencyConversion"
import { computeProjectSummary, type OverviewProject } from "@/lib/project-overview"
import type { JoinInfo } from "@/components/project/join-project-dialog"

export function useProjectOverview(projectId: string) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { user } = useLiff()
  const [project, setProject] = useState<OverviewProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null)
  const [joining, setJoining] = useState(false)

  const { convert } = useCurrencyConversion({
    projectCurrency: project?.currency || DEFAULT_CURRENCY,
    customRates: project?.customRates || null,
    precision: project?.exchangeRatePrecision ?? 2,
  })

  const refetch = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        if (res.status === 404) router.push("/projects")
        return
      }
      const data = await res.json()
      if (data.isMember === false) {
        setJoinInfo({
          name: data.name,
          description: data.description,
          joinMode: data.joinMode || "both",
          unclaimedMembers: data.unclaimedMembers || [],
        })
        return
      }
      setJoinInfo(null)
      setProject(data)
    } catch {
      console.error("獲取專案錯誤")
    } finally {
      setLoading(false)
    }
  }, [authFetch, projectId, router])

  useEffect(() => {
    if (projectId) refetch()
  }, [projectId, refetch])

  const runJoin = useCallback(
    async (url: string, body: object, fallbackError: string) => {
      setJoining(true)
      try {
        const res = await authFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          await refetch()
        } else {
          const data = await res.json()
          alert(data.error || fallbackError)
        }
      } catch {
        alert(fallbackError)
      } finally {
        setJoining(false)
      }
    },
    [authFetch, refetch]
  )

  const joinProject = useCallback(
    () => runJoin("/api/projects/join", { projectId }, "加入失敗"),
    [runJoin, projectId]
  )

  const claimMember = useCallback(
    (memberId: string) => runJoin(`/api/projects/${projectId}/members/claim`, { memberId }, "認領失敗"),
    [runJoin, projectId]
  )

  const summary = useMemo(
    () => (project ? computeProjectSummary(project, convert, user?.id ?? null) : null),
    [project, convert, user?.id]
  )

  return { project, loading, joinInfo, joining, joinProject, claimMember, refetch, summary }
}
```

在 `lib/hooks/index.ts` 加上：

```ts
export { useProjectOverview } from "./useProjectOverview"
```

- [ ] **Step 7: Move the v1 page and switch it to the hook**

```bash
mkdir -p components/v1/project
git mv "app/projects/[id]/page.tsx" components/v1/project/project-overview-v1.tsx
```

在 `components/v1/project/project-overview-v1.tsx` 依序修改：

1. 函式簽名：
   - `export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {` → `export function ProjectOverviewV1({ projectId: id }: { projectId: string }) {`
   - 刪除 `const { id } = use(params)`；import 移除 `use`。
2. 刪除檔內的 `interface ProjectMember`、`interface ExpenseParticipant`、`interface Expense`、`interface Project` 四段，改為：
   ```ts
   import type { OverviewExpense as Expense } from "@/lib/project-overview"
   ```
   （`getCategoryIcon`／`getCategoryColor` 與最近支出區塊使用 `Expense` 型別時仍可編譯。）
3. 刪除下列 state 與函式：`project`／`setProject`、`loading`／`setLoading`、`authFetch`、`showJoinDialog`、`projectBasicInfo`、`joining`、`selectedMemberToClaim`、`copied`、`canNativeShare`、`useCurrencyConversion(...)`、設定 `canNativeShare` 的 `useEffect`、呼叫 `fetchProject()` 的 `useEffect`、`fetchProject`、`handleJoinProject`、`handleClaimMember`、`shareUrl`、`handleCopyLink`、`handleShareToLine`、`handleNativeShare`、`userBalance` 的 `useMemo`。在原位置加入：
   ```tsx
   const { project, loading, joinInfo, joining, joinProject, claimMember, refetch, summary } = useProjectOverview(id)
   ```
   並 import：
   ```ts
   import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
   import { JoinProjectDialog } from "@/components/project/join-project-dialog"
   import { InviteDialog } from "@/components/project/invite-dialog"
   ```
   `useLiff` 仍用於 `VoiceExpenseDialog` 的 `currentUserMemberId`，保留 `const { user } = useLiff()`；`useAuthFetch` import 改為只 import `useLiff`。
4. 「Trigger tour」的 `useEffect` 保留不變（它讀 `project`、`loading`）。
5. 把 `if (showJoinDialog && projectBasicInfo) { ... }` 整個區塊替換為：
   ```tsx
   if (joinInfo) {
     return (
       <AppLayout title="專案" showBack>
         <JoinProjectDialog
           info={joinInfo}
           joining={joining}
           onJoin={joinProject}
           onClaim={claimMember}
           onCancel={() => router.push("/projects")}
         />
       </AppLayout>
     )
   }
   ```
6. 把「檢查是否有多種幣別」到 `const displayBalance = ...` 的整段計算替換為：
   ```tsx
   const { totalAmount, perPerson, budget, budgetProgress, budgetRemaining, hasMixedCurrencies } = summary!
   const displayBalance = summary!.userBalance
   ```
7. `VoiceExpenseDialog` 的 `onSuccess={() => { fetchProject() }}` 改為 `onSuccess={() => { refetch() }}`。
8. 把檔尾 `{/* 邀請對話框 */}` 的整個 `<Dialog open={showInvite} ...>...</Dialog>` 替換為：
   ```tsx
   <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={id} projectName={project.name} />
   ```
9. 移除不再使用的 import（`Dialog*`、`MessageCircle`、`Link2`、`MoreHorizontal`、`Check`、`getProjectShareUrl`、`useCurrencyConversion`、`DEFAULT_CURRENCY` 若已無使用）。以 `npm run lint` 的 unused 警告為準。

建立新的 `app/projects/[id]/page.tsx`：

```tsx
"use client"

import { use } from "react"
import { ProjectOverviewV1 } from "@/components/v1/project/project-overview-v1"

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectOverviewV1 projectId={id} />
}
```

- [ ] **Step 8: Types, lint, tests**

Run: `npx tsc --noEmit -p . && npm run lint && npm run test:run`
Expected: 無型別錯誤、lint 無新錯誤、全部 PASS

- [ ] **Step 9: Manual check — v1 unchanged**

Run: `npm run dev`，開 `http://localhost:3000/projects/<某個專案 id>`
Expected，逐項確認與改動前相同：
- 總支出、平均每人、預算進度、我的餘額數字一致
- 功能格子、邀請對話框（LINE／複製連結）可用
- 語音記帳成功後列表會更新
- 用**非成員帳號**（或開發模式下換一個專案 id）開分享連結 → 出現加入對話框，加入後看到專案

- [ ] **Step 10: Commit**

```bash
git add lib/hooks/useProjectOverview.ts lib/hooks/index.ts components/project components/v1/project "app/projects/[id]/page.tsx" tests/components/join-project-dialog.test.tsx
git commit -m "refactor: Move project overview to ProjectOverviewV1 with shared hook and dialogs"
```

---

### Task 10: A2 旅程總覽 v2

**Files:**
- Create: `components/v2/project/trip-summary-card.tsx`
- Create: `components/v2/project/balance-card.tsx`
- Create: `components/v2/project/feature-grid.tsx`
- Create: `components/v2/project/recent-expenses.tsx`
- Create: `components/v2/project/quick-actions.tsx`
- Create: `components/v2/project/project-overview-v2-view.tsx`
- Create: `components/v2/project/project-overview-v2.tsx`
- Modify: `app/projects/[id]/page.tsx`
- Test: `tests/components/v2/project-overview-v2.test.tsx`

**Interfaces:**
- Consumes: `OverviewProject`、`ProjectSummary`、`getRecentExpenses`（Task 8）；`useProjectOverview`、`JoinProjectDialog`、`InviteDialog`（Task 9）；`UiV2Scope`、`V2TopBar`（Task 3）；`formatTripDateRange`（Task 6）；`UiVersionSwitch`（Task 2）；`CATEGORY_ICONS`、`getCategoryLabel`、`ExpenseCategory`、`formatCurrency`、`VoiceExpenseDialog`
- Produces:
  - `<ProjectOverviewV2View project: OverviewProject; summary: ProjectSummary; onShare: () => void; onVoice: () => void />`
  - `ProjectOverviewV2({ projectId }: { projectId: string })`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/v2/project-overview-v2.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { OverviewProject, ProjectSummary } from "@/lib/project-overview"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => ({ user: { id: "u1" } }),
  useAuthFetch: () => vi.fn(),
}))
vi.mock("@/components/voice/voice-expense-dialog", () => ({ VoiceExpenseDialog: () => null }))

const mockOverview = vi.fn()
vi.mock("@/lib/hooks/useProjectOverview", () => ({ useProjectOverview: () => mockOverview() }))

import { ProjectOverviewV2View } from "@/components/v2/project/project-overview-v2-view"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

const local = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString()

const project: OverviewProject = {
  id: "p1",
  name: "東京賞楓 5 日",
  description: null,
  budget: "76000",
  currency: "TWD",
  exchangeRatePrecision: 2,
  startDate: local(11, 12),
  endDate: local(11, 16),
  customRates: null,
  creator: { id: "u1", name: "Emma", email: "e@x.com" },
  members: [
    { id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
    { id: "chi", role: "member", displayName: "志明", user: null },
  ],
  expenses: [
    {
      id: "e1",
      amount: 1280,
      currency: "TWD",
      description: "一蘭拉麵晚餐",
      category: "food",
      createdAt: local(11, 16),
      payer: { id: "chi", displayName: "志明", user: null },
      participants: [
        { id: "p1", memberId: "me", shareAmount: 640 },
        { id: "p2", memberId: "chi", shareAmount: 640 },
      ],
    },
    {
      id: "e2",
      amount: 320,
      currency: "TWD",
      description: null,
      category: "shopping",
      createdAt: local(11, 15),
      payer: { id: "me", displayName: "Emma", user: null },
      participants: [{ id: "p3", memberId: "me", shareAmount: 320 }],
    },
  ],
}

const summary: ProjectSummary = {
  totalAmount: 48600,
  perPerson: 24300,
  budget: 76000,
  budgetProgress: 63.9,
  budgetRemaining: 27400,
  userBalance: 4820,
  hasMixedCurrencies: false,
  currentMemberId: "me",
}

describe("ProjectOverviewV2View", () => {
  it("renders header, totals, budget and balance", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "東京賞楓 5 日" })).toBeInTheDocument()
    expect(screen.getByText("11/12 – 11/16 · 2 位旅伴")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600")).toBeInTheDocument()
    expect(screen.getByText("平均每人 TWD 24,300")).toBeInTheDocument()
    expect(screen.getByText("64%")).toBeInTheDocument()
    expect(screen.getByText("TWD 48,600 ／ TWD 76,000（剩餘 TWD 27,400）")).toBeInTheDocument()
    expect(screen.getByText("+TWD 4,820")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /查看結算明細/ })).toHaveAttribute("href", "/projects/p1/settle")
  })

  it("shows overspending instead of a negative remainder", () => {
    render(
      <ProjectOverviewV2View
        project={project}
        summary={{ ...summary, totalAmount: 80000, budgetProgress: 100, budgetRemaining: -4000 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("TWD 80,000 ／ TWD 76,000（超支 TWD 4,000）")).toBeInTheDocument()
  })

  it("hides the budget bar without a budget and formats negative balances", () => {
    render(
      <ProjectOverviewV2View
        project={{ ...project, budget: null }}
        summary={{ ...summary, budget: null, budgetProgress: 0, budgetRemaining: null, userBalance: -1200.4 }}
        onShare={vi.fn()}
        onVoice={vi.fn()}
      />
    )
    expect(screen.queryByText(/％|%/)).not.toBeInTheDocument()
    expect(screen.getByText("−TWD 1,200")).toBeInTheDocument()
  })

  it("toggles the balance explanation", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const info = "＝你付的錢－你應付的錢，正數代表有旅伴欠你款項"
    expect(screen.queryByText(info)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "說明餘額計算方式" }))
    expect(screen.getByText(info)).toBeInTheDocument()
  })

  it("links all 11 features", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    const grid = screen.getByRole("navigation", { name: "功能" })
    const expected: [string, string][] = [
      ["結算", "settle"],
      ["成員", "members"],
      ["統計", "stats"],
      ["匯出", "export"],
      ["設定", "settings"],
      ["歷史", "activity-logs"],
      ["里程", "mileage"],
      ["匯率", "currency"],
      ["筆記", "notes"],
      ["地圖", "map"],
      ["照片", "photos"],
    ]
    for (const [label, path] of expected) {
      expect(within(grid).getByRole("link", { name: label })).toHaveAttribute("href", `/projects/p1/${path}`)
    }
  })

  it("lists recent expenses with payer and split count", () => {
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByText("一蘭拉麵晚餐")).toBeInTheDocument()
    expect(screen.getByText("志明 付款 · 2 人分攤")).toBeInTheDocument()
    expect(screen.getByText("我 付款 · 1 人分攤")).toBeInTheDocument()
    expect(screen.getByText("購物")).toBeInTheDocument() // description fallback to category label
    expect(screen.getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/projects/p1/expenses")
  })

  it("shows an empty state without expenses", () => {
    render(<ProjectOverviewV2View project={{ ...project, expenses: [] }} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
    expect(screen.getByText("還沒有支出，點右下角開始記帳")).toBeInTheDocument()
  })

  it("wires share, voice and add actions", () => {
    const onShare = vi.fn()
    const onVoice = vi.fn()
    render(<ProjectOverviewV2View project={project} summary={summary} onShare={onShare} onVoice={onVoice} />)
    fireEvent.click(screen.getByRole("button", { name: "分享" }))
    fireEvent.click(screen.getByRole("button", { name: /AI 快速記帳/ }))
    expect(onShare).toHaveBeenCalled()
    expect(onVoice).toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "手動新增支出" })).toHaveAttribute("href", "/projects/p1/expenses/new")
    expect(screen.getByRole("link", { name: /拍照記帳/ })).toHaveAttribute("href", "/projects/p1/expenses/new")
  })
})

describe("ProjectOverviewV2 container", () => {
  beforeEach(() => mockOverview.mockReset())

  it("shows the join dialog for non-members", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: false,
      joinInfo: { name: "東京", description: null, joinMode: "create_only", unclaimedMembers: [] },
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByText("加入「東京」")).toBeInTheDocument()
  })

  it("shows not-found when there is no project", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: false,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByText("專案不存在")).toBeInTheDocument()
  })

  it("shows a skeleton while loading", () => {
    mockOverview.mockReturnValue({
      project: null,
      loading: true,
      joinInfo: null,
      joining: false,
      joinProject: vi.fn(),
      claimMember: vi.fn(),
      refetch: vi.fn(),
      summary: null,
    })
    render(<ProjectOverviewV2 projectId="p1" />)
    expect(screen.getByTestId("v2-overview-skeleton")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL，無法解析 `@/components/v2/project/project-overview-v2-view`

- [ ] **Step 3: Write the section components**

```tsx
// components/v2/project/trip-summary-card.tsx
import { Compass } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"
import type { ProjectSummary } from "@/lib/project-overview"

export function TripSummaryCard({ summary, currency }: { summary: ProjectSummary; currency: string }) {
  const { totalAmount, perPerson, budget, budgetProgress, budgetRemaining } = summary
  const fmt = (n: number) => formatCurrency(Math.round(n), currency)

  return (
    <div className="relative mx-4 mt-3 overflow-hidden rounded-[20px] bg-v2-lake text-v2-paper">
      <Compass className="absolute -right-6 -top-6 h-[120px] w-[120px] opacity-[.08]" strokeWidth={1.2} aria-hidden="true" />
      <div className="relative px-5 py-4">
        <p className="mb-[3px] text-sm font-medium leading-5 tracking-[.1px] opacity-[.78]">旅程總覽</p>
        <p className="m-0 font-v2-serif text-[32px] font-bold leading-10 tabular-nums">{fmt(totalAmount)}</p>
        <p className="mt-[3px] text-xs leading-4 tracking-[.4px] opacity-[.85]">平均每人 {fmt(perPerson)}</p>
        {budget !== null && budgetRemaining !== null && (
          <>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[rgba(250,247,242,.22)]">
                <div className="h-full rounded-full bg-v2-paper" style={{ width: `${budgetProgress}%` }} />
              </div>
              <span className="shrink-0 text-xs font-medium leading-4 tracking-[.5px]">{Math.round(budgetProgress)}%</span>
            </div>
            <p className="mt-1 text-xs leading-4 tracking-[.4px] opacity-75">
              {fmt(totalAmount)} ／ {fmt(budget)}（{budgetRemaining >= 0 ? `剩餘 ${fmt(budgetRemaining)}` : `超支 ${fmt(-budgetRemaining)}`}）
            </p>
          </>
        )}
      </div>
    </div>
  )
}
```

```tsx
// components/v2/project/balance-card.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"
import { formatCurrency } from "@/lib/constants/currencies"

export function BalanceCard({ balance, currency, projectId }: { balance: number; currency: string; projectId: string }) {
  const [showInfo, setShowInfo] = useState(false)
  const rounded = Math.round(balance)
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : ""
  const tone = rounded < 0 ? "text-v2-danger" : "text-v2-lake"

  return (
    <div className="mx-4 mt-3 rounded-[18px] border border-v2-line bg-v2-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">我的餘額</p>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-label="說明餘額計算方式"
            aria-expanded={showInfo}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-v2-check p-0 text-v2-ink-subtle"
          >
            <Info className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
        </div>
        <Link
          href={`/projects/${projectId}/settle`}
          className="inline-flex items-center gap-1 text-xs font-medium leading-4 tracking-[.5px] text-v2-link"
        >
          查看結算明細
          <ArrowRight className="h-[11px] w-[11px]" strokeWidth={2.2} />
        </Link>
      </div>
      <p className={`mt-0.5 font-v2-serif text-2xl font-bold leading-8 tabular-nums ${tone}`}>
        {sign}
        {formatCurrency(Math.abs(rounded), currency)}
      </p>
      {showInfo && (
        <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-subtle">
          ＝你付的錢－你應付的錢，正數代表有旅伴欠你款項
        </p>
      )}
    </div>
  )
}
```

```tsx
// components/v2/project/feature-grid.tsx
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
  Settings,
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

// Order and tones follow design/project/Trip-m0lh.dc.html.
const FEATURES: Feature[] = [
  { label: "結算", path: "settle", icon: ArrowRightLeft, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "成員", path: "members", icon: Users, tone: "bg-v2-coral-soft text-v2-coral" },
  { label: "統計", path: "stats", icon: BarChart3, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "匯出", path: "export", icon: Download, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "設定", path: "settings", icon: Settings, tone: "bg-v2-sand text-v2-ink-muted" },
  { label: "歷史", path: "activity-logs", icon: History, tone: "bg-v2-rose-soft text-v2-rose" },
  { label: "里程", path: "mileage", icon: Car, tone: "bg-v2-lake-soft text-v2-lake" },
  { label: "匯率", path: "currency", icon: Coins, tone: "bg-v2-coral-soft text-v2-coral" },
  { label: "筆記", path: "notes", icon: StickyNote, tone: "bg-v2-gold-soft text-v2-gold" },
  { label: "地圖", path: "map", icon: MapPin, tone: "bg-v2-plum-soft text-v2-plum" },
  { label: "照片", path: "photos", icon: Images, tone: "bg-v2-rose-soft text-v2-rose" },
]

const PAGE_SIZE = 8

export function FeatureGrid({ projectId }: { projectId: string }) {
  const pages = [FEATURES.slice(0, PAGE_SIZE), FEATURES.slice(PAGE_SIZE)]

  return (
    <nav aria-label="功能" className="px-4 pt-5">
      <p className="mb-3 text-sm font-medium leading-5 tracking-[.1px]">功能</p>
      <div className="rounded-[18px] border border-v2-line bg-v2-surface px-3 pb-3 pt-4">
        <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pages.map((page, i) => (
            <div key={i} className="grid w-full shrink-0 snap-start grid-cols-4 gap-x-1 gap-y-3">
              {page.map(({ label, path, icon: Icon, tone }) => (
                <Link
                  key={path}
                  href={`/projects/${projectId}/${path}`}
                  className="flex flex-col items-center gap-[5px] text-center"
                >
                  <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </span>
                  <span className="text-xs font-medium leading-4 tracking-[.5px]">{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

```tsx
// components/v2/project/recent-expenses.tsx
import Link from "next/link"
import { CATEGORY_ICONS, getCategoryLabel, type ExpenseCategory } from "@/lib/constants/expenses"
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { getRecentExpenses, type OverviewExpense } from "@/lib/project-overview"

const CATEGORY_TONES: Record<ExpenseCategory, string> = {
  food: "bg-v2-coral-soft text-v2-coral",
  transport: "bg-v2-lake-soft text-v2-lake",
  accommodation: "bg-v2-plum-soft text-v2-plum",
  ticket: "bg-v2-gold-soft text-v2-gold",
  shopping: "bg-v2-rose-soft text-v2-rose",
  entertainment: "bg-v2-plum-soft text-v2-plum",
  gift: "bg-v2-rose-soft text-v2-rose",
  other: "bg-v2-sand text-v2-ink-muted",
}

function categoryKey(category: string | null): ExpenseCategory {
  return category && category in CATEGORY_ICONS ? (category as ExpenseCategory) : "other"
}

interface RecentExpensesProps {
  projectId: string
  expenses: OverviewExpense[]
  currentMemberId: string | null
}

export function RecentExpenses({ projectId, expenses, currentMemberId }: RecentExpensesProps) {
  const recent = getRecentExpenses(expenses)

  return (
    <section className="px-4 pb-44 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-medium leading-5 tracking-[.1px]">最近支出</p>
        <Link href={`/projects/${projectId}/expenses`} className="text-xs font-medium tracking-[.5px] text-v2-link">
          查看全部
        </Link>
      </div>
      <div className="overflow-hidden rounded-[18px] border border-v2-line bg-v2-surface">
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
                className={`flex items-center gap-3 px-3.5 py-3 ${i < recent.length - 1 ? "border-b border-[#F0EAE0]" : ""}`}
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
}
```

`getCategoryLabel`、`CATEGORY_ICONS` 與 `type ExpenseCategory` 皆已由 `lib/constants/expenses.ts` 匯出，不需修改該檔。

```tsx
// components/v2/project/quick-actions.tsx
import Link from "next/link"
import { Camera, Plus, Sparkles } from "lucide-react"

const pill =
  "rounded-full border border-v2-line bg-v2-surface px-2.5 py-1.5 text-xs font-medium leading-4 tracking-[.5px] text-v2-ink shadow-[0_2px_6px_rgba(27,24,21,.08)]"

// Camera flow is redesigned in milestone 3; until then it opens the expense form.
export function QuickActions({ projectId, onVoice }: { projectId: string; onVoice: () => void }) {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
      <Link href={`/projects/${projectId}/expenses/new`} className="flex items-center gap-2">
        <span className={pill}>拍照記帳</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-gold text-white shadow-[0_4px_10px_rgba(156,122,40,.35)]">
          <Camera className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </Link>
      <button type="button" onClick={onVoice} className="flex items-center gap-2">
        <span className={pill}>AI 快速記帳</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-v2-coral text-white shadow-[0_4px_10px_rgba(232,130,90,.35)]">
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
      </button>
      <Link
        href={`/projects/${projectId}/expenses/new`}
        aria-label="手動新增支出"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-v2-lake text-white shadow-[0_6px_16px_rgba(27,88,71,.35)]"
      >
        <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Write the view and the container**

```tsx
// components/v2/project/project-overview-v2-view.tsx
import Link from "next/link"
import { Settings, Share2 } from "lucide-react"
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

const iconButton =
  "flex h-[34px] w-[34px] items-center justify-center rounded-full border border-v2-line bg-v2-surface text-v2-ink"

export function ProjectOverviewV2View({ project, summary, onShare, onVoice }: ProjectOverviewV2ViewProps) {
  const currency = project.currency || DEFAULT_CURRENCY

  return (
    <>
      <V2TopBar
        title="旅程總覽"
        backHref="/projects"
        actions={
          <>
            <button type="button" onClick={onShare} aria-label="分享" className={iconButton}>
              <Share2 className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <Link href={`/projects/${project.id}/settings`} aria-label="專案設定" className={iconButton}>
              <Settings className="h-4 w-4" strokeWidth={1.6} />
            </Link>
          </>
        }
      />

      <div className="px-4 pt-4">
        <h2 className="m-0 font-v2-serif text-2xl font-bold leading-8">{project.name}</h2>
        <p className="mt-1 text-xs leading-4 tracking-[.4px] text-v2-ink-muted">
          {formatTripDateRange(project.startDate, project.endDate)} · {project.members.length} 位旅伴
        </p>
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

```tsx
// components/v2/project/project-overview-v2.tsx
"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { VoiceExpenseDialog } from "@/components/voice/voice-expense-dialog"
import { JoinProjectDialog } from "@/components/project/join-project-dialog"
import { InviteDialog } from "@/components/project/invite-dialog"
import { UiV2Scope } from "@/components/v2/ui-v2-scope"
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies"
import { useProjectOverview } from "@/lib/hooks/useProjectOverview"
import { ProjectOverviewV2View } from "./project-overview-v2-view"

// The onboarding tour targets v1 markup (data-tour) and is not shown in v2.
export function ProjectOverviewV2({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { project, loading, joinInfo, joining, joinProject, claimMember, refetch, summary } =
    useProjectOverview(projectId)
  const [showInvite, setShowInvite] = useState(false)
  const [showVoice, setShowVoice] = useState(false)

  let content: ReactNode
  if (loading) {
    content = (
      <div data-testid="v2-overview-skeleton" className="space-y-3 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-v2-sand" />
        <div className="h-36 animate-pulse rounded-[20px] bg-v2-sand" />
        <div className="h-20 animate-pulse rounded-[18px] bg-v2-sand" />
      </div>
    )
  } else if (joinInfo) {
    content = (
      <JoinProjectDialog
        info={joinInfo}
        joining={joining}
        onJoin={joinProject}
        onClaim={claimMember}
        onCancel={() => router.push("/projects")}
      />
    )
  } else if (!project || !summary) {
    content = <p className="py-8 text-center text-v2-ink-muted">專案不存在</p>
  } else {
    content = (
      <>
        <ProjectOverviewV2View
          project={project}
          summary={summary}
          onShare={() => setShowInvite(true)}
          onVoice={() => setShowVoice(true)}
        />
        <InviteDialog open={showInvite} onOpenChange={setShowInvite} projectId={project.id} projectName={project.name} />
        <VoiceExpenseDialog
          open={showVoice}
          onOpenChange={setShowVoice}
          projectId={project.id}
          projectName={project.name}
          members={project.members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            userId: m.user?.id || null,
            user: m.user,
          }))}
          currentUserMemberId={summary.currentMemberId || ""}
          currency={project.currency || DEFAULT_CURRENCY}
          onSuccess={() => {
            refetch()
          }}
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

`app/projects/[id]/page.tsx` 改為：

```tsx
"use client"

import { use } from "react"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectOverviewV1 } from "@/components/v1/project/project-overview-v1"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <UiVersionSwitch v1={<ProjectOverviewV1 projectId={id} />} v2={<ProjectOverviewV2 projectId={id} />} />
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx`
Expected: PASS

- [ ] **Step 6: Full suite and lint**

Run: `npm run test:run && npm run lint && npx tsc --noEmit -p .`
Expected: 全部 PASS、無新錯誤

- [ ] **Step 7: Commit**

```bash
git add components/v2/project "app/projects/[id]/page.tsx" tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat: Add v2 trip overview (A2) behind ui version switch"
```

---

### Task 11: 整體驗證

**Files:** 無新增

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: 成功，沒有 `useSearchParams() should be wrapped in a suspense boundary` 之類錯誤

- [ ] **Step 2: Full suite**

Run: `npm run test:run && npm run lint`
Expected: 全部 PASS

- [ ] **Step 3: Manual comparison（瀏覽器，手機寬度 390px）**

Run: `npm run dev`

| 網址 | 預期 |
|---|---|
| `/projects` | v1，與改動前相同；左下角沒有切換按鈕 |
| `/projects?ui=v2` | A1 v2；左下角出現「UI V2 → V1」 |
| 點 A1 v2 的任一旅程 | 進入 A2 v2（網址不帶 `?ui`，仍是 v2） |
| A2 v2：分享 | 邀請對話框開啟 |
| A2 v2：AI 快速記帳 | 語音記帳對話框開啟，成功後最近支出更新 |
| A2 v2：功能格子左右滑動 | 第二頁有地圖、照片 |
| 點左下角切換按鈕 | 同一頁立即換成 v1 |
| `/projects/<id>?ui=v1` | v1，所有數字與 v2 一致 |
| 非成員開 `/projects/<id>?ui=v2` | 顯示加入對話框 |
| 系統深色模式下開 `?ui=v2` | v2 仍為淺色 |

- [ ] **Step 4: LIFF 實機檢查**

在 LINE 內開啟 LIFF 網址並加上 `?ui=v2`，確認 A1、A2 顯示正確、切換按鈕可用。
