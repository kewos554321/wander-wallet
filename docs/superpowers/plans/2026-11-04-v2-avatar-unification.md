# v2 頭像統一與個人資料頁唯讀化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2 的所有頭像只經過一個 `V2Avatar`，同一人同色同首字；v2 個人資料頁移除頭像編輯，只顯示 LINE 同步的頭像。

**Architecture:** 把照片、首字、佔位成員、深色底 variant 與穩定色 hash 全部收進 `components/v2/ui/v2-avatar.tsx`。各畫面只傳 `image`、`name`、`seed`、`placeholder`、`variant`，不再傳色票。個人資料頁改成唯讀 `V2Avatar`。

**Tech Stack:** Next.js 16、React 19、TypeScript 5、Tailwind v4、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-11-04-v2-avatar-unification-design.md`

## Global Constraints

- 只改 v2。v1 畫面、`components/avatar-picker.tsx`、`/api/users/profile`、Prisma schema 與資料庫都不動。
- `V2Avatar` 是 v2 唯一頭像元件；不得新增第二條頭像渲染路徑。
- 佔位成員一律 `bg-v2-sand text-v2-ink-subtle` + 名字首字，根元素 `data-testid="placeholder-avatar"`。
- 非佔位、無照片的成員使用依 `seed` 固定的 v2 tone；不得使用列表 index 決定顏色。
- 目前使用者的頭像使用真實 `displayName` 首字；文字標籤仍可顯示「我」。
- `fallbackClassName` 只放字級與字重，不放背景色或文字色。
- 深色底使用 `variant="on-lake"`，固定 `bg-v2-paper/15 text-v2-paper`。
- 每個 task 完成後都要跑該 task 指定的測試並 commit。

## Review Focus

- **舊 `avatar:` 字串與非圖片字串**：必須顯示首字，不能產生破圖 `<img>` 或自訂 icon。由 Task 1 的 `legacy avatar:` 測試釘住。
- **沒有名字的佔位成員**：必須顯示 `?`，不能空白。由 Task 1 的 placeholder/no-name 測試釘住。
- **同一人同時以「我」與真實姓名出現**：頭像首字與顏色必須一致。由 Task 3 的 project-overview 測試釘住。
- **深色底頭像對比**：`variant="on-lake"` 必須使用 paper/15 + paper 文字。由 Task 1 的 on-lake 測試與 Task 5 的設定頁測試釘住。
- **`data:image/` 與站內 `/` 路徑**：必須當成照片顯示。由 Task 1 的 data/relative URL 測試釘住。

---

### Task 1: 重寫 `V2Avatar` 與相容 wrapper

**Files:**
- Modify: `components/v2/ui/v2-avatar.tsx`
- Modify: `components/v2/ui/member-avatar.tsx`
- Test: `tests/components/v2/v2-avatar.test.tsx`

**Interfaces:**
- Consumes: 無。
- Produces: `V2Avatar({ image, name, seed, placeholder, variant, className, fallbackClassName })`。
  - `image: string | null | undefined`
  - `name: string | null | undefined`
  - `seed?: string | null`
  - `placeholder?: boolean`（預設 `false`）
  - `variant?: "default" | "on-lake"`（預設 `"default"`）
  - `className?: string`
  - `fallbackClassName?: string`
  - 暫時保留 `iconClassName?: string` 以兼容尚未遷移的呼叫端；Task 6 移除。
- Produces: `MemberAvatar({ image, name, seed, placeholder, className, fallbackClassName, iconClassName })` 作為薄 wrapper，內部只轉呼叫 `V2Avatar`；Task 6 刪除。

- [ ] **Step 1: 用新規則改寫 `tests/components/v2/v2-avatar.test.tsx`**

```tsx
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { V2Avatar } from "@/components/v2/ui/v2-avatar"

function root(container: HTMLElement): HTMLElement {
  const el = container.querySelector('[aria-hidden="true"]')
  if (!el) throw new Error("avatar root not found")
  return el as HTMLElement
}

describe("V2Avatar", () => {
  it("renders an external image URL and hides the whole avatar from AT", () => {
    const { container } = render(<V2Avatar image="https://x/a.png" name="小明" className="h-9 w-9" />)
    expect(container.querySelector("img")).toHaveAttribute("src", "https://x/a.png")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
    expect(root(container).className).toContain("h-9 w-9")
  })

  it("accepts data URLs and root-relative paths as images", () => {
    const data = render(<V2Avatar image="data:image/png;base64,abc" name="小明" />)
    expect(data.container.querySelector("img")).not.toBeNull()
    const relative = render(<V2Avatar image="/avatars/a.png" name="小明" />)
    expect(relative.container.querySelector("img")).not.toBeNull()
  })

  it("treats a legacy avatar: string as no image and shows the initial", () => {
    const { container } = render(<V2Avatar image="avatar:coffee:teal" name="小明" />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).toBeNull()
    expect(container.textContent).toContain("小")
  })

  it("falls back to the first character of the name", () => {
    const { container } = render(<V2Avatar image={null} name="小明" />)
    expect(container.textContent).toContain("小")
    expect(root(container).getAttribute("aria-hidden")).toBe("true")
  })

  it('falls back to "?" when there is no name', () => {
    const { container } = render(<V2Avatar image={null} name={null} />)
    expect(container.textContent).toContain("?")
  })

  it("renders a placeholder as a sand initial with the placeholder test id", () => {
    const { container } = render(<V2Avatar image={null} name="阿凱" placeholder />)
    const el = root(container)
    expect(el).toHaveAttribute("data-testid", "placeholder-avatar")
    expect(el.className).toContain("bg-v2-sand")
    expect(el.textContent).toContain("阿")
  })

  it('shows "?" for a nameless placeholder', () => {
    const { container } = render(<V2Avatar image={null} name={null} placeholder />)
    expect(container.textContent).toContain("?")
  })

  it("uses the seed so the same member keeps the same colour", () => {
    const first = render(<V2Avatar image={null} name="小明" seed="m1" />)
    const second = render(<V2Avatar image={null} name="小美" seed="m1" />)
    expect(root(first.container).className).toBe(root(second.container).className)
  })

  it("uses different tones for different seeds", () => {
    const first = render(<V2Avatar image={null} name="A" seed="m1" />)
    const second = render(<V2Avatar image={null} name="A" seed="m2" />)
    expect(root(first.container).className).not.toBe(root(second.container).className)
  })

  it("uses the on-lake variant on dark surfaces", () => {
    const { container } = render(<V2Avatar image={null} name="小明" variant="on-lake" />)
    expect(root(container).className).toContain("bg-v2-paper/15")
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/v2-avatar.test.tsx`
Expected: FAIL，`avatar:coffee:teal` 仍渲染 svg、`placeholder`/`seed`/`variant` 尚未生效。

- [ ] **Step 3: 實作 `V2Avatar`**

在 `components/v2/ui/v2-avatar.tsx` 實作：

- 內部常數 `TONES`：五個既有 v2 tone 字串（lake-tint、coral-soft、plum-soft、rose-soft、gold-soft）。
- `hashSeed(value: string): number`：`hash = (hash * 31 + charCode) >>> 0`。
- `isImageSource(image)`：只接受 `https://`、`http://`、`data:image/`、`/` 開頭。
- 有圖片：根元素 `aria-hidden="true"`、`inline-flex overflow-hidden`、`<img src={image} alt="" className="h-full w-full object-cover" />`。
- 沒有圖片：根元素 `aria-hidden="true"`、`inline-flex items-center justify-center`，`data-testid` 只在 `placeholder` 時為 `placeholder-avatar`。
- 首字：`name?.trim().charAt(0).toUpperCase() || "?"`。
- tone 優先序：`placeholder` → `bg-v2-sand text-v2-ink-subtle`；`variant === "on-lake"` → `bg-v2-paper/15 text-v2-paper`；否則 `TONES[hashSeed(seed || name?.trim() || "?") % TONES.length]`。
- `className`、`fallbackClassName` 接在根元素 class 後方。
- `iconClassName` 參數存在但忽略，避免尚未遷移的呼叫端編譯失敗。

- [ ] **Step 4: 把 `components/v2/ui/member-avatar.tsx` 改成薄 wrapper**

```tsx
import { V2Avatar } from "./v2-avatar"

export function MemberAvatar({
  image,
  name,
  seed,
  placeholder = false,
  className = "",
  fallbackClassName = "",
  iconClassName: _iconClassName,
}: {
  image: string | null
  name: string | null
  seed?: string | null
  placeholder?: boolean
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}) {
  return (
    <V2Avatar
      image={image}
      name={name}
      seed={seed}
      placeholder={placeholder}
      className={className}
      fallbackClassName={fallbackClassName}
    />
  )
}
```

- [ ] **Step 5: 跑目標測試確認通過**

Run: `npx vitest run tests/components/v2/v2-avatar.test.tsx tests/components/v2/payer-picker.test.tsx`
Expected: PASS，包含既有 `placeholder-avatar` 測試。

- [ ] **Step 6: Commit**

```bash
git add components/v2/ui/v2-avatar.tsx components/v2/ui/member-avatar.tsx tests/components/v2/v2-avatar.test.tsx
git commit -m "feat(v2): unify avatar display rules in V2Avatar"
```

---

### Task 2: 個人資料頁改成唯讀

**Files:**
- Modify: `components/v2/settings/profile-v2.tsx`
- Modify: `components/v2/settings/profile-v2-view.tsx`
- Modify: `app/demo/profile/page.tsx`
- Test: `tests/components/v2/profile-v2.test.tsx`
- Test: `tests/demo/profile-page.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar` from Task 1。
- Produces: `ProfileV2ViewProps`：
  - `name: string`
  - `image: string | null`
  - `userId?: string | null`
  - `logoutOpen: boolean`
  - `onLogoutOpenChange: (open: boolean) => void`
  - `onLogout: () => void`
- `ProfileV2` 不再接受或使用頭像編輯相關 props。

- [ ] **Step 1: 改寫 `tests/components/v2/profile-v2.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"

vi.mock("next/font/google", () => ({
  Noto_Serif_TC: () => ({ variable: "font-var-serif" }),
  Noto_Sans_TC: () => ({ variable: "font-var-sans" }),
}))

const mockUseLiff = vi.hoisted(() => vi.fn())
vi.mock("@/components/auth/liff-provider", () => ({
  useLiff: () => mockUseLiff(),
}))

import { ProfileV2 } from "@/components/v2/settings/profile-v2"

function renderView(overrides: Partial<Parameters<typeof ProfileV2View>[0]> = {}) {
  const props: Parameters<typeof ProfileV2View>[0] = {
    name: "Emma",
    image: null,
    userId: "u1",
    logoutOpen: false,
    onLogoutOpenChange: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  }
  render(<ProfileV2View {...props} />)
  return props
}

describe("ProfileV2View", () => {
  it("renders the profile header and info rows without an edit entry", () => {
    renderView()
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getByText("名稱")).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
    expect(screen.getByText("帳號類型")).toBeInTheDocument()
    expect(screen.getByText("LINE 用戶")).toBeInTheDocument()
    expect(screen.getByText("登入方式")).toBeInTheDocument()
    expect(screen.getByText("LINE 帳號")).toBeInTheDocument()
    expect(screen.queryByText("點擊更換頭像")).not.toBeInTheDocument()
    expect(screen.queryByTestId("profile-avatar")).not.toBeInTheDocument()
  })

  it("renders the LINE image when present", () => {
    renderView({ image: "https://x/e.png" })
    expect(document.querySelector('img[src="https://x/e.png"]')).toBeInTheDocument()
  })

  it("renders the name initial when there is no image", () => {
    renderView()
    expect(screen.getByText("E", { exact: true })).toBeInTheDocument()
  })

  it("asks for logout confirmation then logs out", () => {
    const props = renderView({ logoutOpen: true })
    fireEvent.click(screen.getByTestId("logout-confirm-button"))
    expect(props.onLogout).toHaveBeenCalled()
  })

  it("opens the logout confirmation", () => {
    const props = renderView()
    fireEvent.click(screen.getByTestId("profile-logout"))
    expect(props.onLogoutOpenChange).toHaveBeenCalledWith(true)
  })
})

describe("ProfileV2 container", () => {
  beforeEach(() => {
    mockUseLiff.mockReset().mockReturnValue({
      user: { id: "u1", name: "Emma", image: null },
      logout: vi.fn(),
    })
  })

  it("renders the profile page", () => {
    render(<ProfileV2 />)
    expect(screen.getByRole("heading", { name: "個人資料" })).toBeInTheDocument()
    expect(screen.getAllByText("Emma").length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/profile-v2.test.tsx`
Expected: FAIL，`ProfileV2View` 仍要求 picker props、仍渲染「點擊更換頭像」。

- [ ] **Step 3: 改寫 `profile-v2.tsx`**

- 只 import `useState`、`useLiff`、`UiV2Scope`、`ProfileV2View`。
- 移除 `useAuthFetch`、`generateAvatarString`、`parseAvatarString`。
- 移除 `pickerOpen`、`saving`、`handleAvatarSelect`。
- `useLiff()` 只取 `user`、`logout`。
- 傳給 view：`name={user?.name || ""}`、`image={user?.image ?? null}`、`userId={user?.id ?? null}`、`logoutOpen`、`onLogoutOpenChange`、`onLogout`。

- [ ] **Step 4: 改寫 `profile-v2-view.tsx`**

- 移除 `Image`、`Pencil`、`AvatarDisplay`、`AvatarPicker`。
- 移除 `avatarData`、`hasExternalImage`、`pickerOpen`、`saving`、`onOpenPicker`、`onPickerOpenChange`、`onSelectAvatar`。
- 頭像區塊改成：

```tsx
<div className="flex flex-col items-center gap-3 pt-5">
  <V2Avatar
    image={image}
    name={name}
    seed={userId}
    className="h-[88px] w-[88px] rounded-full"
    fallbackClassName="font-v2-serif text-[30px] font-bold"
  />
  <h2 className="m-0 font-v2-serif text-[22px] font-bold text-v2-ink">{name || "使用者"}</h2>
</div>
```

- 不加任何「頭像由 LINE 同步」或其他說明文字。
- 保留資料列、登出按鈕與登出確認對話框。

- [ ] **Step 5: 更新 `app/demo/profile/page.tsx`**

移除 picker 狀態與回呼，改成：

```tsx
"use client"

import { useState } from "react"
import { ProfileV2View } from "@/components/v2/settings/profile-v2-view"
import { DEMO_USER } from "@/app/demo/_data/fixtures"

export default function ProfileDemoPage() {
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="mx-auto max-w-md">
      <ProfileV2View
        name={DEMO_USER.name}
        image={DEMO_USER.image}
        userId="u-demo"
        logoutOpen={logoutOpen}
        onLogoutOpenChange={setLogoutOpen}
        onLogout={() => alert("（demo）登出")}
      />
    </div>
  )
}
```

- [ ] **Step 6: 更新 `tests/demo/profile-page.test.tsx`**

移除 `@/components/avatar-picker` 的 mock；其餘斷言保留。

- [ ] **Step 7: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/profile-v2.test.tsx tests/demo/profile-page.test.tsx`
Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add components/v2/settings/profile-v2.tsx components/v2/settings/profile-v2-view.tsx app/demo/profile/page.tsx tests/components/v2/profile-v2.test.tsx tests/demo/profile-page.test.tsx
git commit -m "feat(v2): make the profile avatar read-only"
```

---

### Task 3: 成員、專案與活動紀錄表面

**Files:**
- Modify: `components/v2/members/members-v2-view.tsx`
- Modify: `components/v2/projects/projects-v2-view.tsx`
- Modify: `components/v2/projects/projects-v2.tsx`
- Modify: `components/v2/project/project-overview-v2-view.tsx`
- Modify: `components/v2/project/project-overview-v2.tsx`
- Modify: `components/v2/project/recent-expenses.tsx`
- Modify: `components/v2/activity-logs/activity-logs-v2-view.tsx`
- Test: `tests/components/v2/members-v2.test.tsx`
- Test: `tests/components/v2/projects-v2-view.test.tsx`
- Test: `tests/components/v2/project-overview-v2.test.tsx`
- Test: `tests/components/v2/activity-logs-v2.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar` from Task 1。
- Produces: `ProjectsV2ViewProps` 新增 `userId?: string | null`。
- Produces: `ProjectOverviewV2ViewProps` 新增 `currentUserId?: string | null`。

- [ ] **Step 1: 在 `tests/components/v2/members-v2.test.tsx` 擴充頭像斷言**

把「renders the member image when present, else the initial」測試改成同時驗證：

```tsx
it("renders member images, initials and the placeholder style", () => {
  const withImage = {
    ...project,
    members: [
      { ...project.members[0], user: { ...project.members[0].user!, image: "https://cdn.example/emma.jpg" } },
      { ...project.members[1], user: { ...project.members[1].user!, image: "avatar:cat:red" } },
      project.members[2],
    ],
  }
  renderView({ project: withImage })
  const emma = screen.getByTestId("member-m1")
  expect(emma.querySelector('img[src="https://cdn.example/emma.jpg"]')).toBeInTheDocument()
  const mei = screen.getByTestId("member-m2")
  expect(within(mei).getByText("小", { exact: true })).toBeInTheDocument()
  expect(mei.querySelector("svg.lucide-cat")).toBeNull()
  const kai = screen.getByTestId("member-m3")
  expect(within(kai).getByTestId("placeholder-avatar")).toBeInTheDocument()
  expect(within(kai).getByText("阿")).toBeInTheDocument()
})
```

- [ ] **Step 2: 在 `tests/components/v2/projects-v2-view.test.tsx` 加入堆疊頭像測試**

```tsx
it("renders real images in the member stack and uses placeholder styling without accounts", () => {
  const withImage = projects.map((p) =>
    p.id === "tokyo"
      ? {
          ...p,
          members: [
            { ...p.members[0], user: { id: "u1", name: "小美", email: "m@x.com", image: "https://cdn.example/mei.jpg" } },
            ...p.members.slice(1),
          ],
        }
      : p
  )
  render(<ProjectsV2View projects={withImage} loading={false} userName="Emma" now={now} />)
  const tokyo = screen.getByRole("link", { name: /東京賞楓 5 日/ })
  expect(tokyo.querySelector('img[src="https://cdn.example/mei.jpg"]')).toBeInTheDocument()
  expect(within(tokyo).getAllByTestId("placeholder-avatar").length).toBeGreaterThan(0)
})
```

- [ ] **Step 3: 在 `tests/components/v2/activity-logs-v2.test.tsx` 加入操作者照片測試**

```tsx
it("renders the actor's LINE image when present", () => {
  const withImage: ActivityLog = {
    ...baseLog,
    actor: { id: "m1", displayName: "志明", user: { image: "https://cdn.example/zhi.jpg" } },
  }
  renderView({ logs: [withImage], filteredLogs: [withImage] })
  expect(document.querySelector('img[src="https://cdn.example/zhi.jpg"]')).toBeInTheDocument()
})
```

- [ ] **Step 4: 更新 `tests/components/v2/project-overview-v2.test.tsx` 的頭像測試**

把「uses a neutral tint for members without a real avatar and keeps chosen avatar colors」改成：

```tsx
it("uses the real initial for the current user and the initial for legacy avatar strings", () => {
  const withAvatars: OverviewProject = {
    ...project,
    members: [
      { id: "me", role: "owner", displayName: "Emma", user: { id: "u1", name: "Emma", email: "e@x.com", image: null } },
      { id: "chi", role: "member", displayName: "志明", user: { id: "u2", name: "志明", email: "zhi@x.com", image: "avatar:cat:red" } },
    ],
    expenses: [
      {
        id: "e1",
        amount: 1280,
        currency: "TWD",
        description: "拉麵",
        category: "food",
        createdAt: local(11, 16),
        payers: [{ memberId: "me", amount: 1280 }],
        participants: [
          { id: "p1", memberId: "me", shareAmount: 640 },
          { id: "p2", memberId: "chi", shareAmount: 640 },
        ],
      },
    ],
  }
  render(<ProjectOverviewV2View project={withAvatars} summary={summary} onShare={vi.fn()} onVoice={vi.fn()} />)
  const card = screen.getByTestId("v2-recent-expenses-card")
  expect(within(card).getByText("E", { exact: true })).toBeInTheDocument()
  expect(within(card).getByText("志", { exact: true })).toBeInTheDocument()
  expect(card.querySelector('[style*="background-color"]')).toBeNull()
})
```

- [ ] **Step 5: 跑這四個測試檔確認失敗**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx tests/components/v2/projects-v2-view.test.tsx tests/components/v2/activity-logs-v2.test.tsx tests/components/v2/project-overview-v2.test.tsx`
Expected: FAIL，成員頁仍有 User icon、專案堆疊仍是純首字、活動紀錄沒有照片、overview 仍顯示「我」。

- [ ] **Step 6: 改 `members-v2-view.tsx`**

- 移除 `User` import 與 `AVATAR_TONES`。
- 把 `isPlaceholder` 分支與 `V2Avatar` 合併成單一 `V2Avatar`：

```tsx
<V2Avatar
  image={member.user?.image ?? null}
  name={member.displayName}
  seed={member.id}
  placeholder={isPlaceholder}
  className="h-11 w-11 shrink-0 rounded-full"
  fallbackClassName="text-sm font-bold"
/>
```

- [ ] **Step 7: 改 `projects-v2-view.tsx`**

- `ProjectsV2ViewProps` 新增 `userId?: string | null`。
- 函式參數加入 `userId`。
- header 頭像改成：

```tsx
<V2Avatar
  image={userImage ?? null}
  name={userName}
  seed={userId}
  className="h-9 w-9 rounded-full"
  fallbackClassName="text-sm font-bold"
/>
```

- `AvatarStack` 改成使用 `V2Avatar`：

```tsx
const bubble = "flex h-5 w-5 items-center justify-center rounded-full border-2 border-v2-surface"
...
<V2Avatar
  key={m.id}
  image={m.user?.image ?? null}
  name={m.displayName}
  seed={m.id}
  placeholder={!m.user}
  className={`${bubble} ${i > 0 ? "-ml-1.5" : ""}`}
  fallbackClassName="text-[10px] font-bold"
/>
```

- 移除 `AVATAR_TONES`。

- [ ] **Step 8: 改 `projects-v2.tsx`**

傳 `userId={user?.id ?? null}` 給 `ProjectsV2View`。

- [ ] **Step 9: 改 `project-overview-v2-view.tsx`**

Props 新增 `currentUserId?: string | null`；header 頭像加 `seed={currentUserId}`，使用預設 seed tone（header 是 paper 淺色底，不可用 `on-lake`）。

- [ ] **Step 10: 改 `project-overview-v2.tsx`**

傳 `currentUserId={user?.id ?? null}` 給 `ProjectOverviewV2View`。

- [ ] **Step 11: 改 `recent-expenses.tsx`**

- 移除 `NEUTRAL_AVATAR_TONE` import。
- 付款人：`image={payerMember?.user?.image ?? null}`、`name={payerMember?.displayName ?? payerLabel}`、`seed={primaryId}`。
- 分攤者：`image={m.user?.image ?? null}`、`name={m.displayName}`、`seed={m.id}`、`placeholder={!m.user}`。
- 不再把 `label`（「我」）傳給 `name`；文字標籤仍用 `label`。

- [ ] **Step 12: 改 `activity-logs-v2-view.tsx`**

把操作者首字 span 改成：

```tsx
{log.actor ? (
  <V2Avatar
    image={log.actor.user?.image ?? null}
    name={log.actor.displayName}
    seed={log.actor.id}
    className="h-5 w-5 rounded-full"
    fallbackClassName="text-[10px]"
  />
) : (
  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-v2-lake-soft text-[10px]">🧾</span>
)}
```

- [ ] **Step 13: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/members-v2.test.tsx tests/components/v2/projects-v2-view.test.tsx tests/components/v2/activity-logs-v2.test.tsx tests/components/v2/project-overview-v2.test.tsx`
Expected: PASS。

- [ ] **Step 14: Commit**

```bash
git add components/v2/members/members-v2-view.tsx components/v2/projects/projects-v2-view.tsx components/v2/projects/projects-v2.tsx components/v2/project/project-overview-v2-view.tsx components/v2/project/project-overview-v2.tsx components/v2/project/recent-expenses.tsx components/v2/activity-logs/activity-logs-v2-view.tsx tests/components/v2/members-v2.test.tsx tests/components/v2/projects-v2-view.test.tsx tests/components/v2/activity-logs-v2.test.tsx tests/components/v2/project-overview-v2.test.tsx
git commit -m "feat(v2): unify avatars on members, projects and activity logs"
```

---

### Task 4: 支出卡與支出表單表面

**Files:**
- Modify: `components/v2/expenses/expense-card.tsx`
- Modify: `components/v2/expenses/filter-panels.tsx`
- Modify: `components/v2/expense-form/payer-picker.tsx`
- Modify: `components/v2/expense-form/split-editor.tsx`
- Modify: `components/v2/expense-form/split-panel.tsx`
- Modify: `components/v2/expense-form/split-summary.tsx`
- Modify: `components/v2/expense-form/amount-sheet.tsx`
- Modify: `components/v2/expense-form/split-detail-sheet.tsx`
- Modify: `components/v2/expense-form/personal-items-sheet.tsx`
- Test: `tests/components/v2/payer-picker.test.tsx`
- Test: `tests/components/v2/expenses-v2.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar` from Task 1。
- Produces: `buildSummaryRows()` 回傳的 `SummaryRow` 移除 `tone: string`，其餘欄位不變。
- Produces: `payer-picker.tsx` 不再 export `memberTone()`；`memberPillClass()` 保留。

- [ ] **Step 1: 擴充 `tests/components/v2/payer-picker.test.tsx`**

在 placeholder 測試中補上首字斷言，並新增 legacy avatar 測試：

```tsx
it("uses the neutral avatar with the member initial for a placeholder member", () => {
  setup({
    members: [
      { id: "a", displayName: "小雨", isPlaceholder: true },
      { id: "b", displayName: "志明" },
    ],
    payerIds: ["a", "b"],
    payers: [
      { memberId: "a", amount: 50 },
      { memberId: "b", amount: 50 },
    ],
  })
  const avatars = screen.getAllByTestId("placeholder-avatar")
  expect(avatars).toHaveLength(2)
  expect(avatars[0]).toHaveTextContent("小")
})

it("shows the initial for a legacy avatar string instead of a custom icon", () => {
  setup({ members: [{ id: "a", displayName: "小雨", image: "avatar:cat:red" }], payerIds: ["a"] })
  expect(screen.getByText("小", { exact: true })).toBeInTheDocument()
  expect(document.querySelector("svg.lucide-cat")).toBeNull()
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/payer-picker.test.tsx tests/components/v2/expenses-v2.test.tsx`
Expected: FAIL，legacy avatar 仍渲染自訂 icon。

- [ ] **Step 3: 改 `expense-card.tsx`**

- 移除 `NEUTRAL_AVATAR_TONE` import。
- 付款人：`seed={primaryPayer?.memberId ?? primaryId}`；`name={primaryPayer?.member.displayName ?? payerLabel}`。
- 分攤者：`seed={m.id}`；`name={m.displayName}`；`placeholder={!m.user}`。
- `fallbackClassName` 只留 `text-[7px] font-bold` / `text-[6px] font-bold`。

- [ ] **Step 4: 改 `filter-panels.tsx`**

- `V2Avatar` 加 `seed={member.id}`、`placeholder={!member.user}`（型別若沒有 `user`，用 `member.id` 與 `member.displayName`，不要新增 placeholder prop）。
- `fallbackClassName` 改成 `text-[8px] font-bold`。

- [ ] **Step 5: 改 `payer-picker.tsx`**

- 刪除 `AVATAR_TONES` 與 `memberTone()`。
- `MemberAvatar` 全部改成 `V2Avatar`。
- pill 與付款人列傳 `seed={m.id}` / `seed={p.memberId}`、`name={m.displayName}`、`placeholder={m.isPlaceholder}`。
- 移除 `iconClassName`。

- [ ] **Step 6: 改 `split-editor.tsx`**

移除 `memberTone` import 與 `tone` helper；4 個 `MemberAvatar` 改用 `V2Avatar`，傳 `seed`、`name`、`placeholder`，移除 `iconClassName`。

- [ ] **Step 7: 改 `split-panel.tsx`**

移除 `memberTone` import 與 `tone` helper；所有 `MemberAvatar` 改用 `V2Avatar`，傳 `seed`、`name`、`placeholder`，移除 `iconClassName`。

- [ ] **Step 8: 改 `split-summary.tsx`**

移除 `memberTone` import。`SummaryRow` 移除 `tone` 欄位，`buildSummaryRows` 不再回傳 `tone`。`MemberAvatar` 改成 `V2Avatar`，傳 `seed={r.id}`、`name={r.name}`、`placeholder={r.isPlaceholder}`，移除 `r.tone` 與 `iconClassName`。

- [ ] **Step 9: 改 `amount-sheet.tsx`**

移除 `memberTone` import 與 `tone` 變數；`MemberAvatar` 改成 `V2Avatar`，傳 `seed={memberId}`、`name={name}`、`placeholder={member?.isPlaceholder}`，移除 `iconClassName`。

- [ ] **Step 10: 改 `split-detail-sheet.tsx`**

移除 `memberTone` import 與 `tone` 變數；`MemberAvatar` 改成 `V2Avatar`，傳 `seed={memberId}`、`name={name}`、`placeholder={member?.isPlaceholder}`，移除 `iconClassName`。

- [ ] **Step 11: 改 `personal-items-sheet.tsx`**

移除 `memberTone` import 與 `tone` 變數；`MemberAvatar` 改成 `V2Avatar`，傳 `seed={memberId}`、`name={name}`、`placeholder={member?.isPlaceholder}`，移除 `iconClassName`。

- [ ] **Step 12: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/payer-picker.test.tsx tests/components/v2/expenses-v2.test.tsx tests/components/v2/expense-form`
Expected: PASS。

- [ ] **Step 13: Commit**

```bash
git add components/v2/expenses/expense-card.tsx components/v2/expenses/filter-panels.tsx components/v2/expense-form/payer-picker.tsx components/v2/expense-form/split-editor.tsx components/v2/expense-form/split-panel.tsx components/v2/expense-form/split-summary.tsx components/v2/expense-form/amount-sheet.tsx components/v2/expense-form/split-detail-sheet.tsx components/v2/expense-form/personal-items-sheet.tsx tests/components/v2/payer-picker.test.tsx
git commit -m "feat(v2): unify avatars in expenses and the expense form"
```

---

### Task 5: 結算、統計與設定表面

**Files:**
- Modify: `components/v2/settle/settlement-list.tsx`
- Modify: `components/v2/settle/settle-calc-dialog.tsx`
- Modify: `components/v2/stats/member-ranking.tsx`
- Modify: `components/v2/settings/general-settings-v2.tsx`
- Test: `tests/components/v2/settle-v2.test.tsx`
- Test: `tests/components/v2/general-settings-v2.test.tsx`
- Test: `tests/components/v2/stats-v2.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar` from Task 1。
- Produces: `settlement-list.tsx` 不再有 `AVATAR_TONES` 或「我固定金色」。
- Produces: `member-ranking.tsx` 不再有 `AVATAR_TONES`。

- [ ] **Step 1: 更新 `tests/components/v2/settle-v2.test.tsx`**

把「uses the gold tone for the current user avatar」改成：

```tsx
it("uses the member's real initial for the current user avatar", () => {
  renderView()
  const row = screen.getByTestId("settlement-0")
  expect(within(row).getByTestId("settlement-avatar-me")).toHaveTextContent("E")
})
```

- [ ] **Step 2: 在 `tests/components/v2/general-settings-v2.test.tsx` 補 on-lake 斷言**

在「falls back to the user's initial when there is no image」測試中，把 fallback 元素取出後加：

```tsx
const initial = within(card).getByText("E")
expect(initial.closest('[aria-hidden="true"]')?.className).toContain("bg-v2-paper/15")
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx tests/components/v2/general-settings-v2.test.tsx tests/components/v2/stats-v2.test.tsx`
Expected: FAIL，結算頁仍固定金色、設定頁 fallback 仍可能沒有 on-lake。

- [ ] **Step 4: 改 `settlement-list.tsx`**

- 移除 `AVATAR_TONES` 與 `tone()`。
- `person()` 直接渲染 `V2Avatar`：

```tsx
<span data-testid={`settlement-avatar-${memberId}`} className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full">
  <V2Avatar
    image={image}
    name={displayName}
    seed={memberId}
    className="h-full w-full rounded-full"
    fallbackClassName="text-[11px] font-bold"
  />
</span>
```

- 文字標籤仍用 `name(memberId, displayName)`（「我」）。

- [ ] **Step 5: 改 `settle-calc-dialog.tsx`**

`V2Avatar` 加 `seed={p.memberId}`、`name={p.displayName}`、`fallbackClassName="text-[8px] font-bold"`。

- [ ] **Step 6: 改 `member-ranking.tsx`**

- 移除 `AVATAR_TONES`。
- `V2Avatar` 傳 `seed={m.id}`、`name={m.name}`、`fallbackClassName="text-[10px] font-bold"`。
- `label` 只用於 meter 的 aria-label 與文字，不傳給 `V2Avatar`。

- [ ] **Step 7: 改 `general-settings-v2.tsx`**

`V2Avatar` 加 `seed={user?.id ?? null}`、`variant="on-lake"`；`fallbackClassName` 只留 `text-base font-bold`。

- [ ] **Step 8: 跑測試確認通過**

Run: `npx vitest run tests/components/v2/settle-v2.test.tsx tests/components/v2/general-settings-v2.test.tsx tests/components/v2/stats-v2.test.tsx tests/components/v2/settle-dialogs.test.tsx`
Expected: PASS。

- [ ] **Step 9: Commit**

```bash
git add components/v2/settle/settlement-list.tsx components/v2/settle/settle-calc-dialog.tsx components/v2/stats/member-ranking.tsx components/v2/settings/general-settings-v2.tsx tests/components/v2/settle-v2.test.tsx tests/components/v2/general-settings-v2.test.tsx
git commit -m "feat(v2): unify avatars on settle, stats and settings"
```

---

### Task 6: 移除舊 wrapper、色票檔與相容參數

**Files:**
- Delete: `components/v2/ui/member-avatar.tsx`
- Delete: `components/v2/expenses/avatar-tone.ts`
- Modify: `components/v2/ui/v2-avatar.tsx`（移除 `iconClassName`）
- Test: `tests/components/v2/v2-avatar.test.tsx`（不需要改內容，確認仍通過）
- Test: 全部 v2 測試

**Interfaces:**
- Consumes: Tasks 3–5 已把所有呼叫端改成 `V2Avatar`。
- Produces: `V2AvatarProps` 不再有 `iconClassName`。

- [ ] **Step 1: 刪除 `components/v2/ui/member-avatar.tsx`**

Run: `rm components/v2/ui/member-avatar.tsx`

- [ ] **Step 2: 刪除 `components/v2/expenses/avatar-tone.ts`**

Run: `rm components/v2/expenses/avatar-tone.ts`

- [ ] **Step 3: 從 `V2AvatarProps` 移除 `iconClassName`**

確認 `components/v2/ui/v2-avatar.tsx` 不再宣告或解構 `iconClassName`。

- [ ] **Step 4: 搜尋殘留引用**

Run: `grep -R "member-avatar\|avatar-tone\|memberTone\|NEUTRAL_AVATAR_TONE\|AVATAR_TONES" -n components/v2 app/demo/profile tests/components/v2`
Expected: 沒有輸出。

Run: `grep -R "iconClassName" -n components/v2`
Expected: 只剩 `v2-brand-mark.tsx`、`login-v2.tsx` 等非頭像元件的用法。

Run: `grep -R "components/avatar-picker" -n components/v2`
Expected: 沒有輸出。

- [ ] **Step 5: 跑型別檢查**

Run: `npx tsc --noEmit`
Expected: PASS，沒有 `V2Avatar` / `MemberAvatar` 型別錯誤。若遇到與本次變更無關的既有錯誤，記錄下來，只修本次變更造成的錯誤。

- [ ] **Step 6: 跑完整測試與 lint**

Run: `npm run test:run`
Expected: 全部 PASS。

Run: `npm run lint`
Expected: 沒有 error。

- [ ] **Step 7: Commit**

```bash
git add components/v2/ui/v2-avatar.tsx components/v2/ui/member-avatar.tsx components/v2/expenses/avatar-tone.ts
git commit -m "refactor(v2): remove the old avatar wrapper and tone helpers"
```

---

## Final Verification

- [ ] 確認 v2 個人資料頁沒有 picker、鉛筆、更換提示或 `profile-avatar` 按鈕。
- [ ] 確認 v2 成員頁、專案列表、支出卡、結算頁、統計頁對同一成員顯示相同首字與顏色。
- [ ] 確認所有佔位成員顯示沙色底 + 首字，且有「佔位成員」文字標籤。
- [ ] 確認有 LINE 圖片的成員在所有 v2 畫面顯示照片。
- [ ] 確認 v1 畫面與 `components/avatar-picker.tsx` 沒有被修改。
- [ ] 確認 `/api/users/profile` 與 Prisma schema 沒有被修改。
- [ ] `npm run test:run`、`npm run lint`、`npx tsc --noEmit` 全部通過。
