# Project 短網址（publicCode）— 設計（spec）

- 日期：2026-10-05
- 狀態：待審核
- 目標：縮短專案及其所有子頁面的 URL，同時**不動任何 UUID 主鍵與外鍵**。
- 範圍：只改「專案層」的路由與識別字串；**費用（Expense）維持 UUID 不變**。

## 1. 問題

目前分享連結與專案子頁面又長又難用，例如：

```
https://liff.line.me/2008702256-zk3uzDl3/projects/550e8400-e29b-41d4-a716-446655440000
```

`/projects/[id]` 的 36 碼 UUID 在**每一條**專案子路徑重複出現（15 條），是長度的主要來源。

## 2. 決策摘要

| 項目 | 決策 | 理由 |
|---|---|---|
| UUID PK / FK | **全部保留** | 避免跨表 migration、保住 Postgres native `uuid`（16 bytes）與既有 `ExpenseParticipant`、`ActivityLog.entityId` 關聯 |
| 專案對外識別 | 新增 `Project.publicCode`（`@unique`） | URL / 分享連結改用它；PK 不變 |
| 短路徑前綴 | `/p/[code]` | 最短；避開頂層既有字（`admin`、`projects`、`api`…） |
| 舊連結 | `/projects/{uuid}` 與 `/projects/{code}` → 302 到 `/p/{code}` | 向後相容既有書籤與分享連結 |
| 費用識別 | **維持 UUID**（本階段） | 加流水號屬純新增、可日後再做，先降低風險 |
| API 識別字 | 接受「code 或 uuid」 | 前端統一把 code 當識別字，API 邊界解析成 uuid |

> 註：短路徑前綴 `/p` 為建議預設；若審核時想降低改動量，可改回 `/projects/[code]`（只把 UUID 換成 code）。本 spec 其餘設計兩種皆適用。

## 3. 資料模型變更

`prisma/schema.prisma`：

```prisma
model Project {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  publicCode  String    @unique @map("public_code")   // 新增
  ...
  @@map("projects")
}
```

- 其餘 model **完全不動**。
- `Expense`、`ExpenseParticipant`、`ActivityLog`、所有 FK 皆維持 UUID。

### 3.1 產生規則

新增 `lib/project-code.ts`：

- 長度 12、URL-safe、排除易混淆字元（`0/O`、`1/l/I`）。
- 以 `node:crypto`（`randomBytes`）實作，避免新增相依；或採用 `nanoid` 的 `customAlphabet`（需新增相依）。
- 熵 ≥ 2^60，足以作為「邀請／加入」的能力憑證。
- 匯出 `generateProjectCode(): string`。

**不從 UUID 推導**（截斷會碰撞；無損 base62 要 22 碼，效益低）。採用「隨機產生 + DB `@unique` + 碰撞重試」。

## 4. 既有資料補齊（backfill）

因為 `publicCode` 為必填且唯一，採**兩階段 `prisma db push`**：

1. **階段 A（可為 null）**：先將 schema 設為 `publicCode String? @unique @map("public_code")`，執行 `npm run db:push:dev`（與 `db:push:main`）。此時既有列為 `NULL`。
2. **補資料腳本**：新增 `scripts/backfill-project-public-code.mjs`（以 `@prisma/client` 直連 DB）：
   - 讀取 `publicCode IS NULL` 的所有專案。
   - 逐一產生 `generateProjectCode()` 並 `UPDATE`。
   - 遇唯一鍵衝突（Prisma `P2002`）重新產生，最多重試 5 次。
   - 輸出處理筆數；可重複執行（idempotent，只補 null）。
   - 以 `dotenv-cli` 載入環境：於 `package.json` 新增
     `"db:backfill-public-code": "dotenv -e .env.dev -- node scripts/backfill-project-public-code.mjs"`
     （正式環境另用 `.env.main`）。
3. **階段 B（必填）**：把 schema 改回 `publicCode String @unique @map("public_code")`，再 `db:push`。因為已無 NULL，唯一索引可成功建立。

> 備選（零腳本）：若可接受小寫 hex 密碼，可用 `@default(dbgenerated("substr(replace(gen_random_uuid()::text,'-',''),1,12)"))` 讓 DB 於 `ADD COLUMN` 時自動補值；但會失去自訂字母與長度的控制，故不列為預設。

### 4.1 建立流程

`app/api/projects/route.ts` POST：

- 產生 `publicCode` 後放入 `data`。
- 以 `try/catch` 攔 `P2002`，重新產生並重試（最多 5 次）。
- 回應自然包含 `publicCode`（Prisma 回傳純量）。

## 5. 路由變更

### 5.1 新正式路徑

將 `app/projects/[id]/` **整棵樹** 更名為 `app/p/[code]/`（15 個檔案）。頁面內 `params.id` → `params.code`，並以**原本的 `projectId` prop 名稱**傳給 V1/V2 component（元件不需改 prop 介面）。

```
app/p/[code]/page.tsx                      /p/{code}
app/p/[code]/expenses/page.tsx             /p/{code}/expenses
app/p/[code]/expenses/[expenseId]/edit     /p/{code}/expenses/{expenseUuid}/edit   ← 唯一仍帶 UUID
app/p/[code]/settle/page.tsx               /p/{code}/settle
...（其餘 11 條同理）
```

保留不動：`app/projects/page.tsx`（專案列表）、`app/projects/new/page.tsx`（建立）。

### 5.2 舊連結轉址

新增 `app/projects/[...slug]/page.tsx`（server component）：

- 取第一段 `slug[0]`，以「uuid 或 code」查專案。
- 找到 → `redirect('/p/' + project.publicCode + 其餘子路徑)`。
- 找不到 → `notFound()`。
- 靜態段 `new` 優先於 catch-all，故 `/projects/new` 不受影響；`/projects` 仍由 `app/projects/page.tsx` 處理。

### 5.3 其他路由參照

- `app/robots.ts`：disallow 加入 `/p/`（保留 `/projects/`）。
- `components/layout/app-header.tsx`：`pathname.startsWith("/projects/")` 判斷加入 `/p/`。

## 6. API：code / uuid 解析

新增 `lib/project-resolve.ts`：

```ts
export async function resolveProjectId(param: string): Promise<string | null>
// uuid 格式 → 以 id 查；否則以 publicCode 查。回傳 project.id 或 null。
```

在下列 route 的 handler 開頭，把 `params.id` 解析為 `projectId`（uuid），之後查詢與 FK 一律用 uuid；解析失敗回 404：

- `app/api/projects/[id]/route.ts`
- `app/api/projects/[id]/expenses/route.ts`
- `app/api/projects/[id]/expenses/[expenseId]/route.ts`
- `app/api/projects/[id]/expenses/batch/route.ts`
- `app/api/projects/[id]/members/route.ts`
- `app/api/projects/[id]/members/claim/route.ts`
- `app/api/projects/[id]/members/payment-settings/route.ts`
- `app/api/projects/[id]/memo/route.ts`
- `app/api/projects/[id]/mileage/route.ts`
- `app/api/projects/[id]/settle/route.ts`
- `app/api/projects/[id]/activity-logs/route.ts`
- `app/api/projects/join/route.ts`（解析 `body.projectId`）

`[expenseId]` 仍為費用 UUID，不變。

## 7. 前端變更

原則：**元件的 `projectId` prop 一律承載 `publicCode`**；API 路徑維持 `/api/projects/{projectId}/...`（由 API 解析）。

- 導覽 URL：把所有專案範圍的 `/projects/${projectId}` 改為 `/p/${projectId}`（V1/V2 元件，例如 `components/v2/expense-form/expense-form-v2.tsx`、`components/v2/project-settings/project-settings-v2.tsx`、`components/v2/map/map-v2-view.tsx` 等）。
- 使用已載入專案物件處，把「給 URL / prop 用的 `project.id`」改為 `project.publicCode`：
  - `components/v1/projects/projects-v1.tsx`
  - `components/v2/projects/projects-v2-view.tsx`
  - `components/v2/project/project-overview-v2.tsx`（含 `InviteDialog` 的 `projectId`）
  - `components/v2/project/project-overview-v2-view.tsx`（傳給子元件的 `projectId`）
  - 建立專案後導向：`components/v1/new-project/new-project-v1.tsx:108`、`components/v2/new-project/new-project-v2.tsx:43`（`data.id` → `data.publicCode`）
- `lib/utils.ts` `getProjectShareUrl()`：輸入改為 code（函式本體不需改，只是呼叫端傳 code）。
- 其餘子元件（expenses、settle、stats…）沿用既有 `projectId` prop，**不需改**。

## 8. 安全性

- `publicCode` 是「可加入專案」的能力憑證，長度 12（≥2^60）足以抵抗列舉。
- 存取/寫入仍由伺服器端驗證成員身分；`publicCode` 只負責「找到專案」。
- 邀請連結可失效/輪替列為**未來工作**（可加 `rotatePublicCode` 端點）。

## 9. 部署順序（dev 與 main 各做一次）

1. 階段 A schema（nullable）→ `db:push`。
2. 執行 backfill 腳本，確認 0 筆 `NULL`。
3. 階段 B schema（必填）→ `db:push`。
4. 部署應用（路由、API、前端）。
5. 抽驗：`/p/{code}` 正常、舊 `/projects/{uuid}` 正確 302、分享連結可用、加入流程可用。

## 10. 測試

- 單元：`generateProjectCode` 格式/字母集/長度；`resolveProjectId` 對 uuid 與 code 的行為。
- API：`GET /api/projects/{code}` 回 200；不存在回 404；`join` 以 code 成功。
- 路由：舊 `/projects/{uuid}` → 302 `/p/{code}`；子路徑保留。
- E2E/手動：建立專案 → 導向 `/p/{code}`；邀請連結分享 → 開啟 → 加入成功。

## 11. 不在本次範圍（未來工作）

- 費用短參照：`Expense.no`（專案內流水號）+ `Project.expenseSeq` 原子計數器 + backfill，URL 變 `/p/{code}/e/{no}`。
- 自訂短網域（縮短 `liff.line.me/...` 那段）；需處理 LIFF endpoint / redirect。
- `publicCode` 輪替與過期。

## 12. 驗收條件

- 專案及其 14 條子路由 URL 由 `/projects/{uuid}` 改為 `/p/{code}`（唯一例外：費用編輯頁仍含一個 UUID）。
- 舊 `/projects/{uuid}`（含深層子路徑）皆 302 至新路徑。
- 所有既有專案皆已補上唯一 `publicCode`，且無 `NULL`。
- 所有既有 API 行為不變（以 uuid 呼叫仍可用）。
- `npm run test:run` 全綠。
