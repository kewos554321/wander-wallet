# UI v2 Milestone 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beta toggle (users opt into v2 via `preferences.uiVersion`) and v2 dark mode via tokens.

**Architecture:** API validates `uiVersion`; `useBetaToggle` saves the preference and clears overrides; both settings pages render the toggle; v2 gets dark token overrides under `.dark [data-ui="v2"]`, new tokens replace every hard-coded color in `components/v2`, enforced by a scan test.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 `@theme inline`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-ui-v2-milestone-5-design.md`

## Global Constraints

- v2 components must not use `dark:`; dark mode comes only from tokens.
- Light appearance must be pixel-identical: every new token's light value equals the hex it replaces (spec §3.2 table).
- Copy in Traditional Chinese exactly as in the spec; comments in English. No schema changes, no prisma commands.
- Commit via heredoc with a blank line before the trailers:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01SW7eVRL4tBM9rNRS7u3WZx
  ```

## Review Focus

1. Turning Beta off while `?ui=v2` or sessionStorage override exists must still land on v1 (Task 2 test).
2. v1 saving currency/notifications must keep `uiVersion` (Task 3 test).
3. `text-white` on a lake/coral/danger solid background must become `text-v2-on-lake`, not `text-v2-ink` (Task 5 review).
4. Covers in dark mode use darkBg/darkFg (Task 4 test).
5. No `-[#`, `bg-white`, `text-white`, `bg-black`, `dark:` left in `components/v2` except `camera-step.tsx` (Task 5 guard).

---

### Task 1: API validates uiVersion

**Files:** Modify `app/api/users/profile/route.ts`; Test `tests/api/users-profile.test.ts`

- [ ] **Step 1: Test** — following the file's existing PUT helpers, add: `preferences: { uiVersion: "v2" }` → 200 and `prisma.user.update` called with preferences containing `uiVersion: "v2"`; `preferences: { uiVersion: "v3" }` and `{ uiVersion: 1 }` → 400 `{ error: "無效的介面版本" }`, no update.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** — after the `defaultSplitMode` check inside `if (preferences !== undefined)`:
```ts
      // uiVersion opt-in (stage 1): only "v1" | "v2"
      if (preferences.uiVersion !== undefined && !["v1", "v2"].includes(preferences.uiVersion)) {
        return NextResponse.json({ error: "無效的介面版本" }, { status: 400 })
      }
```
- [ ] **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Validate uiVersion preference in profile API`.

---

### Task 2: useBetaToggle

**Files:** Create `lib/hooks/use-beta-toggle.ts`; Test `tests/lib/hooks/use-beta-toggle.test.ts`

**Interfaces — Consumes:** `useUiVersion` (`@/lib/hooks/useUiVersion`, returns `{ version: "v1"|"v2"|null }`), `usePreferences` (`@/lib/hooks/use-preferences`, `save(patch) => Promise<boolean>`, `error`), `UI_VERSION_STORAGE_KEY`, `UI_VERSION_CHANGE_EVENT` (`@/lib/ui-version`).
**Produces:** `export function useBetaToggle(): { enabled: boolean; toggle: (next: boolean) => Promise<void>; saving: boolean; error: string | null }`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

const save = vi.fn()
const ui = { version: "v2" as "v1" | "v2" | null }
vi.mock("@/lib/hooks/useUiVersion", () => ({ useUiVersion: () => ui }))
vi.mock("@/lib/hooks/use-preferences", () => ({ usePreferences: () => ({ save, saving: false, error: null }) }))
import { useBetaToggle } from "@/lib/hooks/use-beta-toggle"
import { UI_VERSION_CHANGE_EVENT, UI_VERSION_STORAGE_KEY } from "@/lib/ui-version"

beforeEach(() => {
  save.mockReset()
  window.sessionStorage.setItem(UI_VERSION_STORAGE_KEY, "v2")
  window.history.replaceState(null, "", "/settings?ui=v2&x=1")
})

describe("useBetaToggle", () => {
  it("reflects the active version", () => {
    ui.version = "v2"
    expect(renderHook(() => useBetaToggle()).result.current.enabled).toBe(true)
    ui.version = "v1"
    expect(renderHook(() => useBetaToggle()).result.current.enabled).toBe(false)
  })
  it("saves and clears overrides on success", async () => {
    save.mockResolvedValue(true)
    const onChange = vi.fn()
    window.addEventListener(UI_VERSION_CHANGE_EVENT, onChange)
    const h = renderHook(() => useBetaToggle())
    await act(() => h.result.current.toggle(false))
    expect(save).toHaveBeenCalledWith({ uiVersion: "v1" })
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBeNull()
    expect(window.location.search).toBe("?x=1")
    expect(onChange).toHaveBeenCalled()
    window.removeEventListener(UI_VERSION_CHANGE_EVENT, onChange)
  })
  it("keeps overrides when saving fails", async () => {
    save.mockResolvedValue(false)
    const h = renderHook(() => useBetaToggle())
    await act(() => h.result.current.toggle(true))
    expect(save).toHaveBeenCalledWith({ uiVersion: "v2" })
    expect(window.sessionStorage.getItem(UI_VERSION_STORAGE_KEY)).toBe("v2")
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**

```ts
"use client"

import { useCallback } from "react"
import { usePreferences } from "@/lib/hooks/use-preferences"
import { useUiVersion } from "@/lib/hooks/useUiVersion"
import { UI_VERSION_CHANGE_EVENT, UI_VERSION_STORAGE_KEY } from "@/lib/ui-version"

// Saves the Beta opt-in and drops the comparison overrides (url param and
// session storage) so the saved preference takes effect immediately.
export function useBetaToggle() {
  const { version } = useUiVersion()
  const { save, saving, error } = usePreferences()

  const toggle = useCallback(
    async (next: boolean) => {
      const ok = await save({ uiVersion: next ? "v2" : "v1" })
      if (!ok) return
      try {
        window.sessionStorage.removeItem(UI_VERSION_STORAGE_KEY)
      } catch {
        // Storage may be unavailable (LINE in-app browser / private mode).
      }
      const url = new URL(window.location.href)
      url.searchParams.delete("ui")
      window.history.replaceState(window.history.state, "", url)
      window.dispatchEvent(new Event(UI_VERSION_CHANGE_EVENT))
    },
    [save]
  )

  return { enabled: version === "v2", toggle, saving, error }
}
```
(If `usePreferences().save`'s patch type rejects `uiVersion`, widen its `PreferencesPatch` to include `uiVersion?: "v1" | "v2"` — `UserPreferences` already declares it, so no change should be needed.)

- [ ] **Step 4:** Run → PASS. **Step 5: Commit** — `feat: Add beta toggle hook for UI version opt-in`.

---

### Task 3: Settings pages — Beta row, v1 save fix, v2 appearance

**Files:** Modify `components/v2/settings/general-settings-v2.tsx`, `components/v1/settings/general-settings-v1.tsx`; Tests `tests/components/v2/general-settings-v2.test.tsx` (extend), `tests/components/v1/general-settings-v1.test.tsx` (create)

**Consumes:** `useBetaToggle` (Task 2), `useTheme` from `@/components/system/theme-provider` (`{ theme, setTheme }`, theme `"light"|"dark"|"system"`), `usePreferences`.

**Behavior:**
- v2: new card section titled「新版介面」with a `role="switch"` row labelled「試用新版介面（Beta）」, sub「關閉後回到舊版介面」, `aria-checked={enabled}`, disabled while `saving`, click → `toggle(!enabled)`; show `error` in `role="alert"`. New section「外觀」above 記帳偏好 with three pill buttons「淺色」「深色」「系統」(`aria-pressed={theme === value}`) → `setTheme(value)`. Styles use v2 tokens only.
- v1: add a row in its existing settings card list, matching the surrounding v1 row markup: label「試用新版介面（Beta）」, sub「搶先體驗全新設計，可隨時關閉」, a `Switch`/toggle consistent with v1's notification toggles, checked = `enabled`, click → `toggle(!enabled)`. Replace v1's `savePreferences` internals with `usePreferences().save(...)` (keep its call sites/props unchanged; the currency/split/notification handlers pass patches). No other v1 change.
- Tests: v2 — switch `aria-checked="true"` when mocked `enabled` true, click calls `toggle(false)`; 外觀 buttons call `setTheme("dark")` etc. and the active one has `aria-pressed="true"`. v1 — mock `useLiff` with `user.preferences = { uiVersion: "v2", defaultCurrency: "TWD" }` and `authFetch` ok; changing default currency sends a PUT whose `preferences.uiVersion === "v2"`; Beta switch click calls `toggle(true)` (mock `useBetaToggle` with `enabled:false` in that test file only if the real hook is awkward — prefer mocking `@/lib/hooks/use-beta-toggle`). Remove the M4 test assertion that 外觀/深色 is absent in v2.
- [ ] Steps: test → fail → implement → pass → `npm run test:run` → commit `feat: Add beta toggle and appearance setting to settings pages`.

---

### Task 4: Dark tokens and cover colors

**Files:** Modify `app/globals.css`, `lib/covers.ts`, `components/v2/cover/cover-art.tsx`; Tests `tests/lib/covers-icon.test.ts` (extend), `tests/components/v2/cover.test.tsx` (extend)

- [ ] **Step 1: CSS.** In the second `@theme inline` block (v2 tokens) add `--color-v2-<name>: var(--v2-<name>);` for: `line-soft, lake-tint, lake-border, lake-mid, on-lake, coral-strong, danger-soft, danger-strong, overlay, knob`. In `[data-ui="v2"] { … }` add the light values from spec §3.2 (`--v2-overlay: rgb(0 0 0 / 0.4)`, `--v2-knob: #FFFFFF`). Then add a new block with every token's dark value from spec §3.1 and §3.2 (`--v2-overlay: rgb(0 0 0 / 0.6)`, `--v2-knob: #F2EDE4`):
```css
.dark [data-ui="v2"] {
  color-scheme: dark;
  --v2-paper: #161412;
  /* …all tokens… */
}
```
Add cover rules:
```css
[data-cover-art] { background-color: var(--cover-bg); color: var(--cover-fg); }
.dark [data-ui="v2"] [data-cover-art] { background-color: var(--cover-bg-dark); color: var(--cover-fg-dark); }
```
- [ ] **Step 2: covers.** Add `darkFg`/`darkBg` to each `COVER_COLORS` entry per spec §3.3 (lake `#4FB394`/`#17302A`, coral `#F09A76`/`#3A2519`, red `#E8735A`/`#3A1E18`, rose `#D77E9C`/`#37212A`, gold `#D4AE55`/`#332A16`, plum `#A897D6`/`#2A2438`). Test: each entry has both fields matching those values.
- [ ] **Step 3: CoverArt.** For icon/default covers render `data-cover-art=""` and `style={{ "--cover-fg": c.fg, "--cover-bg": c.bg, "--cover-fg-dark": c.darkFg, "--cover-bg-dark": c.darkBg } as React.CSSProperties}` instead of `backgroundColor`/`color`. Update the existing CoverArt test to assert the four CSS variables (`box.style.getPropertyValue("--cover-bg")` etc.) instead of computed `backgroundColor`.
- [ ] **Step 4:** `npx vitest run tests/lib/covers-icon.test.ts tests/components/v2/cover.test.tsx` → PASS. **Commit** — `feat: Add v2 dark tokens and dark-aware cover colors`.

---

### Task 5: Replace hard-coded colors in components/v2 + guard test

**Files:** Modify files under `components/v2/**` (not `camera-step.tsx`); Create `tests/components/v2/no-hardcoded-colors.test.ts`

- [ ] **Step 1: Guard test**

```ts
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(process.cwd(), "components/v2")
const EXEMPT = new Set(["quick-expense/camera-step.tsx"])
const BANNED = [/-\[#[0-9a-fA-F]{3,8}\]/, /\bbg-white\b/, /\btext-white\b/, /\bbg-black\b/, /\bdark:/]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : []
  })
}

describe("components/v2 uses tokens only", () => {
  it("has no hard-coded colors or dark: variants", () => {
    const hits: string[] = []
    for (const f of files(ROOT)) {
      const rel = f.slice(ROOT.length + 1)
      if (EXEMPT.has(rel)) continue
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (BANNED.some((re) => re.test(line))) hits.push(`${rel}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(hits).toEqual([])
  })
})
```

- [ ] **Step 2:** Run → FAIL listing every hit.
- [ ] **Step 3: Replace** using spec §3.2 mapping exactly:
  - `border-[#F0EAE0]`/`bg-[#F0EAE0]` → `-v2-line-soft`; `bg-[#D2EAE1]` → `bg-v2-lake-tint`; `border-[#DDEDE6]`/`border-[#DCEAE3]`/`border-[#B7D9CB]` → `border-v2-lake-border`; `#2F8F74` → `v2-lake-mid`; `text-[#C4602F]` → `text-v2-coral-strong`; `bg-[#F6DCD3]`/`bg-[#FDF1EC]`/`border-[#F3D3C4]` → `-v2-danger-soft`; `text-[#C4432A]` → `text-v2-danger-strong`; `bg-[#FBE3D2]`/`bg-[#F6DCCB]` → `bg-v2-coral-soft`; `bg-[#E4DCF2]` → `bg-v2-plum-soft`; `#DCD3C2` → `v2-check`; `accent-[#1B5847]` → `accent-v2-lake`; `bg-black/40` (and other black overlays) → `bg-v2-overlay`.
  - `text-white` on a solid lake/coral/danger/plum/gold background → `text-v2-on-lake`; `text-white` elsewhere → decide by background and report each such case.
  - switch knobs `bg-white` → `bg-v2-knob`; other `bg-white` → `bg-v2-surface`.
  - Any hex not in the mapping (e.g. `#10201B` outside camera-step, avatar tones in `payer-picker.tsx` `AVATAR_TONES` like `bg-[#FBE3D2] text-[#C4602F]`): map to the nearest existing token pair (`coral-soft`/`coral-strong`, `lake-tint`/`lake`) and list it in the report.
  - Inline `style` hex used for charts/presets stays (not matched by the guard).
- [ ] **Step 4:** Guard test → PASS; `npm run test:run` → all pass (update any test asserting old class names); `npm run lint` → no new errors.
- [ ] **Step 5: Commit** — `refactor: Replace hard-coded colors in v2 components with tokens`.
