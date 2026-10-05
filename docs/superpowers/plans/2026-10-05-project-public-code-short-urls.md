# Project 短網址（publicCode）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 `Project` 加上短 `publicCode`，讓 `/projects/{uuid}` 變成 `/projects/{code}`，且所有既有 API／舊連結照常運作。

**Architecture:** 保留所有 UUID PK/FK。新增 `Project.publicCode`（唯一、12 碼隨機），URL 與前端用它；API 邊界用 `resolveProjectId(param)` 把 code 或 uuid 解析成 project UUID，之後照舊用 UUID 查詢。費用維持 UUID。

**Tech Stack:** Next.js 16（App Router）、Prisma 6 / PostgreSQL、Vitest（`tests/**`，jsdom，mock `@/lib/db` 與 `@/lib/auth`）、`node:crypto`。

**Spec:** `docs/superpowers/specs/2026-10-05-project-public-code-short-urls-design.md`

## Global Constraints

- `publicCode`：長度 **12**，字母集 `23456789abcdefghjkmnpqrstuvwxyz`（排除 `0 O 1 l i`，全小寫），URL-safe。
- **絕不更動任何 UUID PK/FK**（`id`、`projectId`、`expenseId` 等型別維持 `@db.Uuid`）。
- 路徑前綴**維持 `/projects`**；不搬路由樹、不新增前綴。
- 費用（`Expense`）**維持使用 UUID**。
- API 必須同時接受 **code 或 uuid**；未知識別字一律回 **404**（不可因把 code 當 uuid 而 500）。
- 建立專案遇 `publicCode` 唯一鍵衝突（Prisma `P2002`）要**重新產生並重試，最多 5 次**。
- 既有 `/projects/{uuid}`（含深層子路徑）必須仍可運作。
- 測試指令：`npx vitest run <path>`（單檔）、`npm run test:run`（全部）。

## Review Focus

1. 建立專案時 `publicCode` 撞號 → 必須重試後成功，不可回 500。（Task 3）
2. 不存在的 code 參數 → 404，不可因 uuid 轉型錯誤而 500。（Task 4、5）
3. 舊 `/projects/{uuid}/expenses` 深層連結 → 仍可載入。（Task 4、6）
4. Backfill 可重複執行、且階段 B 後不得有 `NULL`。（Task 2）
5. 參數大小寫／長度錯誤（如手機自動首字大寫）→ 當 code 查、回 404，不炸 DB。（Task 4）

---

### Task 1: 專案短碼產生器

**Files:**
- Create: `lib/project-code.ts`
- Test: `tests/lib/project-code.test.ts`

**Interfaces:**
- Produces: `generateProjectCode(): string`；`PROJECT_CODE_ALPHABET: string`；`PROJECT_CODE_LENGTH: 12`。

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/project-code.test.ts
import { describe, it, expect } from "vitest"
import { generateProjectCode, PROJECT_CODE_ALPHABET, PROJECT_CODE_LENGTH } from "@/lib/project-code"

describe("generateProjectCode", () => {
  it("回傳固定 12 碼且只含允許字母", () => {
    const code = generateProjectCode()
    expect(code).toHaveLength(PROJECT_CODE_LENGTH)
    expect(code).toMatch(new RegExp(`^[${PROJECT_CODE_ALPHABET}]{${PROJECT_CODE_LENGTH}}$`))
  })

  it("不含易混淆字元 0 1 i l o", () => {
    const sample = Array.from({ length: 500 }, () => generateProjectCode()).join("")
    expect(sample).not.toMatch(/[01ilo]/)
  })

  it("多次產生具差異（非固定值）", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateProjectCode()))
    expect(codes.size).toBeGreaterThan(190)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/project-code.test.ts`
Expected: FAIL（cannot resolve `@/lib/project-code`）

- [ ] **Step 3: Implement `lib/project-code.ts`**

```ts
import { randomInt } from "node:crypto"

export const PROJECT_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
export const PROJECT_CODE_LENGTH = 12

export function generateProjectCode(): string {
  let code = ""
  for (let i = 0; i < PROJECT_CODE_LENGTH; i++) {
    code += PROJECT_CODE_ALPHABET[randomInt(PROJECT_CODE_ALPHABET.length)]
  }
  return code
}
```

（`crypto.randomInt` 為無偏均勻取樣，長度 31 也正確。）

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/project-code.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/project-code.ts tests/lib/project-code.test.ts
git commit -m "feat: add project public code generator"
```

---

### Task 2: Schema 與既有資料補齊（phase A → backfill → phase B）

**Files:**
- Modify: `prisma/schema.prisma`（`Project` model 加 `publicCode`）
- Create: `scripts/backfill-project-public-code.mjs`
- Modify: `package.json`（scripts）

**Interfaces:**
- Consumes: Task 1 的字母集與長度（腳本內複製，見註解）。
- Produces: DB 欄位 `projects.public_code`（NOT NULL UNIQUE）。

- [ ] **Step 1: Schema phase A（可為 null）**

在 `model Project` 加：

```prisma
  publicCode  String?  @unique @map("public_code")
```

- [ ] **Step 2: Push phase A**

Run: `npm run db:push:dev`
Expected: 成功新增可為 null 的 `public_code` 欄位；既有列為 `NULL`。

- [ ] **Step 3: Write backfill script**

```js
// scripts/backfill-project-public-code.mjs
import { PrismaClient } from "@prisma/client"
import { randomInt } from "node:crypto"

// 與 lib/project-code.ts 保持一致（Node 無法直接 import TS）
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
const LENGTH = 12
const gen = () => Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")

const prisma = new PrismaClient()

async function main() {
  const pending = await prisma.project.findMany({
    where: { publicCode: null },
    select: { id: true },
  })

  let backfilled = 0
  for (const { id } of pending) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.project.update({ where: { id }, data: { publicCode: gen() } })
        backfilled++
        break
      } catch (e) {
        if (e?.code === "P2002" && attempt < 4) continue
        throw e
      }
    }
  }

  const remaining = await prisma.project.count({ where: { publicCode: null } })
  console.log(`backfilled=${backfilled} remaining_null=${remaining}`)
  if (remaining > 0) process.exitCode = 1
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Add npm script**

在 `package.json` `scripts` 加：

```json
"db:backfill-public-code": "dotenv -e .env.dev -- node scripts/backfill-project-public-code.mjs"
```

- [ ] **Step 5: Run backfill and verify**

Run: `npm run db:backfill-public-code`
Expected: 輸出 `remaining_null=0`，exit 0。（正式環境另跑 `.env.main`。）

- [ ] **Step 6: Schema phase B（必填）**

把 phase A 的欄位改為：

```prisma
  publicCode  String   @unique @map("public_code")
```

- [ ] **Step 7: Push phase B and verify**

Run: `npm run db:push:dev`
Expected: 成功；`public_code` 為 NOT NULL 且具唯一索引（因已無 NULL）。

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma scripts/backfill-project-public-code.mjs package.json
git commit -m "feat(db): add project public_code with backfill"
```

---

### Task 3: 建立專案時產生 publicCode（含碰撞重試）

**Files:**
- Modify: `app/api/projects/route.ts`（`POST`）
- Test: `tests/api/projects.test.ts`

**Interfaces:**
- Consumes: `generateProjectCode()`（Task 1）。
- Produces: `POST /api/projects` 回應含 `publicCode`。

- [ ] **Step 1: Add failing tests**

在 `tests/api/projects.test.ts` 的 `POST` describe 內新增：

```ts
it("建立時帶入符合格式的 publicCode", async () => {
  vi.mocked(getAuthUser).mockResolvedValue(mockUser)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
  vi.mocked(prisma.project.create).mockImplementation(async (args: never) => args as never)

  const req = new NextRequest("http://localhost:3000/api/projects", {
    method: "POST",
    body: JSON.stringify({ name: "New Project" }),
  })
  await POST(req)

  const call = vi.mocked(prisma.project.create).mock.calls[0][0] as { data: { publicCode: string } }
  expect(call.data.publicCode).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{12}$/)
})

it("publicCode 撞號（P2002）時會重試", async () => {
  vi.mocked(getAuthUser).mockResolvedValue(mockUser)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
  vi.mocked(prisma.project.create)
    .mockRejectedValueOnce({ code: "P2002" })
    .mockResolvedValue(mockProject as never)

  const req = new NextRequest("http://localhost:3000/api/projects", {
    method: "POST",
    body: JSON.stringify({ name: "New Project" }),
  })
  const response = await POST(req)

  expect(response.status).toBe(201)
  expect(prisma.project.create).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/projects.test.ts`
Expected: 新測試 FAIL（未帶 `publicCode`；第二次 create 未被呼叫）。

- [ ] **Step 3: Implement create with retry**

在 `app/api/projects/route.ts`：`import { generateProjectCode } from "@/lib/project-code"`，並把 `prisma.project.create({...})` 換成迴圈版本（保留原有 `data` 內容，只新增 `publicCode: generateProjectCode()`）：

```ts
const projectData = { /* 原 data（name, description, ..., members） */ }
let project = null
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    project = await prisma.project.create({
      data: { ...projectData, publicCode: generateProjectCode() },
      include: { /* 原 include */ },
    })
    break
  } catch (e) {
    if ((e as { code?: string }).code === "P2002" && attempt < 4) continue
    throw e
  }
}
if (!project) throw new Error("無法產生唯一 publicCode")
```

（`P2003` 等其他錯誤仍由既有 catch 處理，勿吞掉。）

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/projects.test.ts`
Expected: PASS（含既有測試）。

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/route.ts tests/api/projects.test.ts
git commit -m "feat(api): generate unique publicCode on project create"
```

---

### Task 4: 識別字解析器 `resolveProjectId`

**Files:**
- Create: `lib/project-resolve.ts`
- Test: `tests/lib/project-resolve.test.ts`

**Interfaces:**
- Produces: `resolveProjectId(param: string): Promise<string | null>`（回傳 project UUID 或 null）。

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/project-resolve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: { project: { findUnique: vi.fn(), findFirst: vi.fn() } },
}))

import { resolveProjectId } from "@/lib/project-resolve"
import { prisma } from "@/lib/db"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

beforeEach(() => vi.clearAllMocks())

describe("resolveProjectId", () => {
  it("uuid 參數以 findUnique 查 id", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: UUID } as never)
    expect(await resolveProjectId(UUID)).toBe(UUID)
    expect(prisma.project.findUnique).toHaveBeenCalledWith({ where: { id: UUID } })
  })

  it("非 uuid 以小寫 publicCode 查", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: UUID } as never)
    expect(await resolveProjectId("ABC123def456")).toBe(UUID)
    expect(prisma.project.findFirst).toHaveBeenCalledWith({ where: { publicCode: "abc123def456" } })
  })

  it("找不到回 null", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null)
    expect(await resolveProjectId("nope12345678")).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/project-resolve.test.ts`
Expected: FAIL（cannot resolve `@/lib/project-resolve`）

- [ ] **Step 3: Implement `lib/project-resolve.ts`**

```ts
import { prisma } from "@/lib/db"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolveProjectId(param: string): Promise<string | null> {
  if (UUID_RE.test(param)) {
    const p = await prisma.project.findUnique({ where: { id: param }, select: { id: true } })
    return p?.id ?? null
  }
  const p = await prisma.project.findFirst({
    where: { publicCode: param.toLowerCase() },
    select: { id: true },
  })
  return p?.id ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/project-resolve.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/project-resolve.ts tests/lib/project-resolve.test.ts
git commit -m "feat: add project id/code resolver"
```

---

### Task 5: 接上 `/api/projects/[id]` 與 `/api/projects/join`

**Files:**
- Modify: `app/api/projects/[id]/route.ts`、`app/api/projects/join/route.ts`
- Test: `tests/api/project-detail.test.ts`、`tests/api/join-project.test.ts`、新增 `tests/api/project-code-lookup.test.ts`

**Interfaces:**
- Consumes: `resolveProjectId`（Task 4）。

- [ ] **Step 1: Mock resolver in existing tests (keep them green)**

在 `tests/api/project-detail.test.ts` 與 `tests/api/join-project.test.ts` 的 imports 上方加：

```ts
vi.mock("@/lib/project-resolve", () => ({
  resolveProjectId: vi.fn(async (param: string) => param),
}))
```

- [ ] **Step 2: Add code-lookup integration test (real resolver)**

```ts
// tests/api/project-code-lookup.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  prisma: { project: { findUnique: vi.fn(), findFirst: vi.fn() } },
}))
vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }))

import { GET } from "@/app/api/projects/[id]/route"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

beforeEach(() => vi.clearAllMocks())

it("以 publicCode 取得專案詳情", async () => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: "user-123" } as never)
  vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: "uuid-real" } as never)
  vi.mocked(prisma.project.findUnique).mockResolvedValue({
    id: "uuid-real", name: "T", members: [{ id: "m1", userId: "user-123" }], expenses: [], _count: { members: 1, expenses: 0 },
  } as never)

  const req = new NextRequest("http://localhost:3000/api/projects/abcd1234efgh")
  const res = await GET(req, { params: Promise.resolve({ id: "abcd1234efgh" }) })
  expect(res.status).toBe(200)
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/api/project-code-lookup.test.ts`
Expected: FAIL（route 尚未解析 code，findUnique 收到 code 而非 uuid）。

- [ ] **Step 4: Wire the resolver**

在 `app/api/projects/[id]/route.ts` 的 `GET`/`PUT`/`DELETE` 與 `app/api/projects/join/route.ts` 的 `POST`，於 handler 取得 `id`/`projectId` 後、任何查詢前插入：

```ts
const resolvedId = await resolveProjectId(id)
if (!resolvedId) return NextResponse.json({ error: "專案不存在" }, { status: 404 })
```

並把該 handler 內所有以 `id`（或 `projectId`）當專案 UUID 的查詢／寫入改用 `resolvedId`（`join` 的 `projectId` 傳入值先解析再使用）。`import { resolveProjectId } from "@/lib/project-resolve"`。

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/api/project-detail.test.ts tests/api/join-project.test.ts tests/api/project-code-lookup.test.ts`
Expected: PASS（含既有與新測試）。

- [ ] **Step 6: Commit**

```bash
git add app/api/projects/[id]/route.ts app/api/projects/join/route.ts tests/api/project-detail.test.ts tests/api/join-project.test.ts tests/api/project-code-lookup.test.ts
git commit -m "feat(api): resolve project by code in detail and join"
```

---

### Task 6: 接上費用相關路由

**Files:**
- Modify: `app/api/projects/[id]/expenses/route.ts`、`app/api/projects/[id]/expenses/[expenseId]/route.ts`、`app/api/projects/[id]/expenses/batch/route.ts`
- Test: `tests/api/expenses.test.ts`（及其餘涵蓋上述路由的既有測試）

**Interfaces:**
- Consumes: `resolveProjectId`（Task 4）。`[expenseId]` 仍為費用 UUID，不解析。

- [ ] **Step 1: Mock resolver in existing expense tests**

在涵蓋這些路由的測試檔 import 前加：

```ts
vi.mock("@/lib/project-resolve", () => ({
  resolveProjectId: vi.fn(async (param: string) => param),
}))
```

（若 `tests/api/expenses.test.ts` 已因其他模組而失敗，先 `npx vitest run tests/api/expenses.test.ts` 建立基準。）

- [ ] **Step 2: Wire the resolver**

在每個 handler 取得 `id` 後插入 `resolveProjectId` + 404 檢查（同 Task 5 Step 4），並把 `id` 當專案 UUID 的用途改為 `resolvedId`；`expenseId` 不變。

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/api/expenses.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/projects/\[id\]/expenses tests/api/expenses.test.ts
git commit -m "feat(api): resolve project by code in expense routes"
```

---

### Task 7: 接上成員相關路由

**Files:**
- Modify: `app/api/projects/[id]/members/route.ts`、`app/api/projects/[id]/members/claim/route.ts`、`app/api/projects/[id]/members/payment-settings/route.ts`
- Test: `tests/api/members.test.ts`、`tests/api/project-members.test.ts`、`tests/api/claim-member.test.ts`

**Interfaces:**
- Consumes: `resolveProjectId`（Task 4）。

- [ ] **Step 1: Mock resolver in existing tests**

在 `tests/api/members.test.ts`、`tests/api/project-members.test.ts`、`tests/api/claim-member.test.ts` import 前加 `vi.mock("@/lib/project-resolve", () => ({ resolveProjectId: vi.fn(async (p: string) => p) }))`。

- [ ] **Step 2: Wire the resolver**

在三個路由的 handler 取得 `id` 後插入 `resolveProjectId` + 404 檢查，專案 UUID 用途改用 `resolvedId`。`claim` 的 `memberId` 不變。

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/api/members.test.ts tests/api/project-members.test.ts tests/api/claim-member.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "app/api/projects/[id]/members" tests/api/members.test.ts tests/api/project-members.test.ts tests/api/claim-member.test.ts
git commit -m "feat(api): resolve project by code in member routes"
```

---

### Task 8: 接上其餘專案路由（memo/mileage/settle/activity-logs）

**Files:**
- Modify: `app/api/projects/[id]/memo/route.ts`、`app/api/projects/[id]/mileage/route.ts`、`app/api/projects/[id]/settle/route.ts`、`app/api/projects/[id]/activity-logs/route.ts`
- Test: `tests/api/memo.test.ts`、`tests/api/mileage.test.ts`、`tests/api/settle.test.ts`、`tests/api/activity-logs.test.ts`

**Interfaces:**
- Consumes: `resolveProjectId`（Task 4）。

- [ ] **Step 1: Mock resolver in existing tests**

在四個測試檔 import 前加 `vi.mock("@/lib/project-resolve", () => ({ resolveProjectId: vi.fn(async (p: string) => p) }))`。

- [ ] **Step 2: Wire the resolver**

四個 handler 取得 `id` 後插入 `resolveProjectId` + 404 檢查，專案 UUID 用途改用 `resolvedId`。

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/api/memo.test.ts tests/api/mileage.test.ts tests/api/settle.test.ts tests/api/activity-logs.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add "app/api/projects/[id]/memo" "app/api/projects/[id]/mileage" "app/api/projects/[id]/settle" "app/api/projects/[id]/activity-logs" tests/api/memo.test.ts tests/api/mileage.test.ts tests/api/settle.test.ts tests/api/activity-logs.test.ts
git commit -m "feat(api): resolve project by code in misc project routes"
```

---

### Task 9: 前端列表改用 publicCode

**Files:**
- Modify: `lib/hooks/useProjects.ts`（`ProjectListItem` 加 `publicCode`）
- Modify: `components/v2/projects/projects-v2-view.tsx`、`components/v1/projects/projects-v1.tsx`
- Test: `tests/components/v2/projects-v2-view.test.tsx`

**Interfaces:**
- Consumes: API 回應（Task 3 起含 `publicCode`）。

- [ ] **Step 1: Update type + failing assertion**

在 `ProjectListItem` 加 `publicCode: string`。在 `tests/components/v2/projects-v2-view.test.tsx` 的 `project()` helper 加入 `publicCode: overrides.publicCode ?? String(overrides.id ?? "p")`，並新增一個測試：

```ts
it("卡片連結使用 publicCode（非 id）", () => {
  render(<ProjectsV2View projects={[project({ id: "uuid-1", publicCode: "tokyo99" })]} loading={false} userName="E" now={now} />)
  expect(screen.getByRole("link", { name: /旅程/ })).toHaveAttribute("href", "/projects/tokyo99")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: 新測試 FAIL（stub 目前用 `project.id`）。

- [ ] **Step 3: Use publicCode in links**

`components/v2/projects/projects-v2-view.tsx` 的 `ProjectCard`：`href={\`/projects/${project.publicCode}\`}`。
`components/v1/projects/projects-v1.tsx`：`router.push(\`/projects/${project.publicCode}\`)`（key 仍可用 `project.id`）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/v2/projects-v2-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useProjects.ts components/v2/projects/projects-v2-view.tsx components/v1/projects/projects-v1.tsx tests/components/v2/projects-v2-view.test.tsx
git commit -m "feat(ui): build project links from publicCode"
```

---

### Task 10: 前端詳情／導向改用 publicCode

**Files:**
- Modify: `components/v2/project/project-overview-v2.tsx`、`components/v2/project/project-overview-v2-view.tsx`
- Modify: `components/v1/new-project/new-project-v1.tsx`、`components/v2/new-project/new-project-v2.tsx`
- Test: `tests/components/v2/project-overview-v2.test.tsx`、`tests/components/v2/new-project-v2.test.tsx`

**Interfaces:**
- Consumes: 專案物件（含 `publicCode`）。

- [ ] **Step 1: Update fixtures + failing assertions**

- `tests/components/v2/project-overview-v2.test.tsx`：專案 fixture 加 `publicCode`（值設為與 `id` 相同以維持既有 href 斷言），並新增一個測試：fixture `publicCode: "trip42"` 時，`查看結算明細` 的 href 為 `/projects/trip42/settle`。
- `tests/components/v2/new-project-v2.test.tsx`：POST mock 回傳 `{ id: "new-id", publicCode: "newcode12345" }`，斷言 `mockPush` 呼叫 `/projects/newcode12345`（取代 `"/projects/new-id"`）。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx tests/components/v2/new-project-v2.test.tsx`
Expected: 新／改斷言 FAIL。

- [ ] **Step 3: Implement**

- `project-overview-v2.tsx`：`InviteDialog` 與傳給 `ProjectOverviewV2View` 的 `projectId` 改用 `project.publicCode`。
- `project-overview-v2-view.tsx`：`settings` 連結與傳給子元件的 `projectId` 改用 `project.publicCode`。
- `new-project-v1.tsx:108`：`router.push(\`/projects/${project.publicCode}\`)`。
- `new-project-v2.tsx:43`：`router.push(\`/projects/${data.publicCode}\`)`。

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/components/v2/project-overview-v2.test.tsx tests/components/v2/new-project-v2.test.tsx`
Expected: PASS

- [ ] **Step 5: Full unit run**

Run: `npm run test:run`
Expected: 全綠（exit 0）。

- [ ] **Step 6: Commit**

```bash
git add components/v2/project components/v1/new-project/new-project-v1.tsx components/v2/new-project/new-project-v2.tsx tests/components/v2/project-overview-v2.test.tsx tests/components/v2/new-project-v2.test.tsx
git commit -m "feat(ui): use publicCode for project detail links and post-create redirect"
```

---

### Task 11: 專案首頁 uuid→code 正規化（可選但建議）

**Files:**
- Modify: `app/projects/[id]/page.tsx`（改為 server component）

**Interfaces:**
- Consumes: `resolveProjectId`、Prisma（server）。

- [ ] **Step 1: Convert root page to a server component**

`app/projects/[id]/page.tsx` 移除 `"use client"` 與 `use(params)`，改成：

```tsx
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { UiVersionSwitch } from "@/components/ui-version/ui-version-switch"
import { ProjectOverviewV1 } from "@/components/v1/project/project-overview-v1"
import { ProjectOverviewV2 } from "@/components/v2/project/project-overview-v2"

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: /^[0-9a-f-]{36}$/i.test(id) ? id : undefined }, { publicCode: id.toLowerCase() }] },
    select: { publicCode: true },
  })
  if (!project) notFound()
  if (id !== project.publicCode) redirect(`/projects/${project.publicCode}`)
  return <UiVersionSwitch v1={<ProjectOverviewV1 projectId={project.publicCode} />} v2={<ProjectOverviewV2 projectId={project.publicCode} />} />
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`（依 `package.json` 之 env 變體），開 `/projects/<既有uuid>` → 應 302 到 `/projects/<code>`；開 `/projects/<code>` → 正常。深層子頁面（`/expenses` 等）用 uuid 仍可載入。

- [ ] **Step 3: Run full tests**

Run: `npm run test:run`
Expected: 全綠。

- [ ] **Step 4: Commit**

```bash
git add "app/projects/[id]/page.tsx"
git commit -m "feat(ui): canonicalize project root uuid to publicCode"
```

---

## Self-Review

- **Spec coverage：** §3 產生規則→Task 1；§4 backfill→Task 2；§4.1 建立→Task 3；§5 路由/正規化→Task 11；§6 API 解析→Task 4–8；§7 前端→Task 9–10；§8 安全（長度/唯一/重試）→Task 1、2、3；§10 測試→各 Task。§11 未來工作不在本計畫。
- **命名一致：** `generateProjectCode` / `PROJECT_CODE_ALPHABET` / `PROJECT_CODE_LENGTH` / `resolveProjectId` / `publicCode` 全篇一致。
- **Review Focus 對應：** 撞號重試→Task 3；未知 code→404→Task 4/5；舊 uuid 深層連結→Task 4/6；backfill 冪等＋無 NULL→Task 2；大小寫/格式→Task 4（`toLowerCase`）與 Task 11。
