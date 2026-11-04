# v2 頭像統一與個人資料頁唯讀化 — Design Spec

Date: 2026-11-04
Status: proposed
Scope: v2 only

## Goal

1. 個人資料頁（v2）不再提供頭像編輯。頭像由 LINE 登入時自動同步，頁面只負責顯示。
2. 全站 v2 頭像改用同一套顯示規則：同一個人在任何畫面都使用同一張照片、同一個名字首字、同一個顏色。

## Non-goals

- 不改 v1 的任何畫面或元件。
- 不刪除 `components/avatar-picker.tsx`，因為 v1 個人資料頁與 v1 通用設定仍在使用。
- 不改 `/api/users/profile` 的 `image` 欄位、Prisma schema 或資料庫。
- 不遷移或清除資料庫中既有的 `avatar:icon:color` 值；v2 一律將其視為「沒有照片」。
- 不重新設計個人資料頁的資訊列、登出流程或版面間距。
- 不改 `app/demo/v2-fixes` 這個視覺對照 demo。

## Current state

v2 的頭像顯示分散在多個地方，規則不一致：

- `components/v2/ui/v2-avatar.tsx` 支援三種顯示：`avatar:` 自訂 icon、外部圖片、名字首字。
- `components/v2/ui/member-avatar.tsx` 在佔位成員時顯示「沙色底 + 人像 icon」，其餘交給 `V2Avatar`。
- `components/v2/members/members-v2-view.tsx` 直接畫佔位成員的「沙色底 + 人像 icon」，非佔位成員再交給 `V2Avatar`。
- `components/v2/projects/projects-v2-view.tsx` 的成員堆疊完全不看 `image`，一律顯示名字首字。
- `components/v2/activity-logs/activity-logs-v2-view.tsx` 的操作者頭像只看名字首字，不看 `actor.user.image`。
- 多個畫面用列表 index 決定 fallback 顏色（`memberTone()`、`AVATAR_TONES`），同一個人在不同頁面或排序改變後會換色。
- `components/v2/settle/settlement-list.tsx` 額外讓「我」固定使用金色。
- `components/v2/settings/profile-v2-view.tsx` 提供頭像選擇器、鉛筆角標與「點擊更換頭像」提示。
- `components/v2/settle/settle-calc-dialog.tsx` 的頭像沒有傳 fallback 樣式。

`app/api/auth/liff/route.ts` 在每次 LINE 登入時都會用 `profile.pictureUrl` 更新 `user.image`，因此 v2 的自訂頭像編輯已無實際用途。

## Approaches considered

1. **Single source of truth（採用）** — 把所有 v2 頭像規則收進 `V2Avatar`，刪除其他頭像分支與 index 色票。呼叫端只傳 `image`、`name`、`seed`、`placeholder`、`variant`。
2. Shared `resolveAvatar()` helper — 保留多個渲染元件，只共用判斷函式。改動較小，但渲染路徑仍有多條，樣式容易再次分叉。
3. CSS-only unification — 只統一 class，不改資料流。無法保證同一人同色，也無法處理舊的 `avatar:` 值。

採用 1。v2 只留一條頭像路徑，測試與後續修正只需改一個元件。

## Avatar rules

`V2Avatar` 是 v2 唯一的頭像元件，顯示規則如下：

| 資料情況 | 顯示 |
|---|---|
| `image` 是 `http://`、`https://`、`data:image/` 或站內 `/` 開頭 | 顯示照片 |
| `placeholder = true` | 中性沙色底 + 名字首字 |
| 沒有照片、也不是佔位成員 | 依人物固定的 v2 色底 + 名字首字 |
| 沒有名字 | `?` |
| `avatar:` 或其他非圖片字串 | 視為沒有照片，顯示首字 |

### Color resolution

- 以 `seed` 做穩定 hash；沒有 `seed` 時用 `name`；兩者都沒有時用 `"?"`。
- hash 對應五個既有 v2 tone：
  - `bg-v2-lake-tint text-v2-lake`
  - `bg-v2-coral-soft text-v2-coral-strong`
  - `bg-v2-plum-soft text-v2-plum`
  - `bg-v2-rose-soft text-v2-rose`
  - `bg-v2-gold-soft text-v2-gold`
- `seed` 一律優先使用已連結帳號的 `user.id`；只有佔位成員（沒有 `user.id`）才使用 `member.id`。這樣同一個人在通用設定、成員頁、支出卡、結算頁、統計頁都會得到同一個顏色。
- 呼叫端統一使用 `avatarSeed(userId, memberId)` 產生 seed，不要各自決定要用哪個 id。
- 不再使用列表 index 決定顏色。
- 佔位成員一律使用 `bg-v2-sand text-v2-ink-subtle`，不輪替色票；佔位狀態由「佔位成員」標籤與頭像樣式共同表達。

### Current user

- 頭像一律使用真實 `displayName` 的首字。
- 旁邊的文字標籤仍可顯示「我」。
- 移除 `settlement-list` 中「我固定金色」的特例，讓同一人在結算頁與其他頁面同色。

### Dark surfaces

- `variant="on-lake"` 供深色底使用，固定為 `bg-v2-paper/15 text-v2-paper`。
- `variant="brand"` 固定為 `bg-v2-lake text-v2-on-lake`，用於所有以「我」身分顯示的頭像：個人資料頁、旅程列表／總覽 header、成員列表、支出卡、最近支出、篩選面板、結算清單／計算明細、統計排行、支出表單與快速記帳。
- `on-lake` 只用於真正深色／湖色的容器，例如設定頁的湖色個人卡。
- 其他成員沒有照片時使用預設 seed tone；佔位成員使用沙色。
- 旅程列表 header 是 paper 淺色底，不使用 `on-lake`。
- 「我」的頭像有 LINE 照片時顯示照片；沒有照片時使用 `brand`（lake 品牌色），不使用 seed tone。
- 這是為了對比度的表面 variant，不用於一般白底列表或 header。

## Component interface

```tsx
interface V2AvatarProps {
  image: string | null | undefined
  name: string | null | undefined
  seed?: string | null
  placeholder?: boolean
  variant?: "default" | "on-lake" | "brand"
  className?: string
  fallbackClassName?: string
}
```

- `className` 負責尺寸、圓角、邊框、位移。
- `fallbackClassName` 只放字級與字重，不再放背景色或文字色。
- 移除 `iconClassName`。
- 佔位成員的根元素保留 `data-testid="placeholder-avatar"`，讓既有測試可以繼續辨識。
- 根元素維持 `aria-hidden="true"`，因為頭像旁邊都有可見姓名。

## Architecture changes

### Core

- 重寫 `components/v2/ui/v2-avatar.tsx`。
- 刪除 `components/v2/ui/member-avatar.tsx`，所有呼叫端改用 `V2Avatar` 的 `placeholder` prop。
- 刪除 `components/v2/expenses/avatar-tone.ts`。
- 移除 `memberTone()`、`AVATAR_TONES`、`NEUTRAL_AVATAR_TONE`。
- 移除 v2 對 `components/avatar-picker` 的所有 import。

### Members and projects

- `components/v2/members/members-v2-view.tsx`：使用 `V2Avatar` + `placeholder={isPlaceholder}` + `seed={avatarSeed(member.userId, member.id)}`。
- `components/v2/projects/projects-v2-view.tsx`：
  - header 的個人頭像改用 `V2Avatar` + `variant="brand"`（沒有照片時用 lake 品牌色）。
  - `AvatarStack` 改為讀取 `member.user?.image`、`member.displayName`、`member.id`，並在 `user === null` 時傳 `placeholder`。
- `components/v2/projects/projects-v2.tsx`：把 `user.id` 傳給 view 作為 seed。
- `components/v2/project/project-overview-v2-view.tsx`：header 頭像使用 `variant="brand"`；有照片顯示照片，沒有照片顯示 lake 品牌色。
- `components/v2/project/project-overview-v2.tsx`：把 `user.id` 傳給 view。
- `components/v2/project/recent-expenses.tsx`：付款人與分攤者使用 `V2Avatar`，傳 `seed`，移除 neutral tone。

### Expenses

- `components/v2/expenses/expense-card.tsx`：付款人與分攤者使用 `V2Avatar`，傳 `seed`，移除 neutral tone。
- `components/v2/expenses/filter-panels.tsx`：使用 `V2Avatar`，移除固定 lake tone。
- `components/v2/expense-form/payer-picker.tsx`：移除 `AVATAR_TONES` 與 `memberTone()`；所有 pill 與付款人列改用 `V2Avatar`。
- `components/v2/expense-form/split-editor.tsx`：移除 `memberTone()`，改傳 `seed`。
- `components/v2/expense-form/split-panel.tsx`：移除 `memberTone()`，改傳 `seed`。
- `components/v2/expense-form/split-summary.tsx`：移除 `memberTone()` 與 `r.tone`。
- `components/v2/expense-form/amount-sheet.tsx`：移除 `memberTone()`，改傳 `seed`。
- `components/v2/expense-form/split-detail-sheet.tsx`：移除 `memberTone()`，改傳 `seed`。
- `components/v2/expense-form/personal-items-sheet.tsx`：移除 `memberTone()`，改傳 `seed`。

### Settle, stats and activity logs

- `components/v2/settle/settlement-list.tsx`：使用 `V2Avatar`，移除 `AVATAR_TONES` 與「我固定金色」。
- `components/v2/settle/settle-calc-dialog.tsx`：使用 `V2Avatar`，傳 `seed` 與字級 fallback。
- `components/v2/stats/member-ranking.tsx`：使用 `V2Avatar`，移除 `AVATAR_TONES`，傳 `seed`。
- `components/v2/activity-logs/activity-logs-v2-view.tsx`：操作者改用 `V2Avatar`，傳 `actor.id`、`actor.displayName`、`actor.user?.image`；系統紀錄維持原本的 `🧾`。

### Settings and profile

- `components/v2/settings/general-settings-v2.tsx`：個人卡頭像使用 `V2Avatar` + `variant="on-lake"` + `seed={user.id}`。
- `components/v2/settings/profile-v2.tsx`：
  - 移除 `useAuthFetch`、`parseAvatarString`、`generateAvatarString`。
  - 移除 picker 開啟狀態、`saving`、`handleAvatarSelect`、`/api/users/profile` 的 PUT 呼叫。
  - 只保留 `user`、`logout` 與登出確認狀態。
- `components/v2/settings/profile-v2-view.tsx`：
  - 移除 `AvatarPicker`、`AvatarDisplay`、`avatarData`、`hasExternalImage`、`pickerOpen`、`saving`、`onOpenPicker`、`onPickerOpenChange`、`onSelectAvatar`。
  - 頭像改成唯讀的 `V2Avatar`，傳 `image`、`name`、`seed={userId}`、`variant="brand"`（沒有照片時用 lake 品牌色）。
  - 移除鉛筆角標、可點擊按鈕與「點擊更換頭像」提示，且不加任何替代說明文字。
  - 保留名稱、帳號類型、登入方式、登出按鈕與登出確認對話框。
- `app/demo/profile/page.tsx`：移除 picker 狀態，只傳唯讀 props。

## Data flow

- 頭像資料來源不變：`useLiff().user.image`，由 `/api/auth/liff` 在每次登入時同步 LINE 圖片。
- `V2Avatar` 是純展示元件，不發送請求、不讀取 context。
- 成員資料的 `seed` 使用 `avatarSeed(user.id, member.id)`；佔位成員才落到 member id。活動紀錄使用 `avatarSeed(actor.user?.id, actor.id)`。
- 任何可能顯示佔位成員的 v2 曲面都必須把 `placeholder` 狀態傳給 `V2Avatar`；不可只靠 `image = null` 推斷，否則同一個佔位成員會在不同畫面得到不同色底。
- 佔位狀態來源：`ProjectMember.userId`、`ExpenseMember.userId`、`OverviewMember.user`、`ProjectListMember.user`。
- 沒有新增 API、沒有新增資料欄位、沒有 migration。

## Testing

更新或新增以下測試：

- `tests/components/v2/v2-avatar.test.tsx`
  - 外部圖片會渲染 `<img>`。
  - `https`、`data:image/`、`/` 以外的字串（含 `avatar:`）會顯示首字。
  - 沒有名字時顯示 `?`。
  - `placeholder` 使用沙色並且有 `placeholder-avatar` test id。
  - 相同 `seed` 產生相同顏色；不同 `seed` 可產生不同顏色。
  - `variant="on-lake"` 使用 on-lake 樣式。
- `tests/components/v2/profile-v2.test.tsx`
  - 頁面仍顯示名稱、資訊列與登出。
  - 有照片時顯示照片。
  - 沒有照片時顯示名字首字。
  - 不再有頭像選擇器、`profile-avatar` 按鈕或「點擊更換頭像」。
- `tests/demo/profile-page.test.tsx`
  - 移除 `avatar-picker` mock。
  - 頁面仍顯示「個人資料」與使用者名稱。
- `tests/components/v2/project-overview-v2.test.tsx`
  - 移除「neutral tint」與「chosen avatar color」的舊斷言。
  - 驗證沒有照片的成員顯示首字、有照片的成員顯示照片。
  - 目前使用者的頭像使用真實名字首字，而不是「我」。
- `tests/components/v2/settle-v2.test.tsx`
  - 移除「我固定金色」的斷言，改驗證同一成員的顏色由 seed 決定。
- `tests/components/v2/payer-picker.test.tsx`
  - 保留 `placeholder-avatar` 的測試；確認佔位成員仍然使用中性樣式。
- 其他 v2 測試若只驗證圖片存在或文字存在，預期不需修改。

驗證指令：

```bash
npm run test:run
npm run lint
```

完成後以搜尋確認 v2 已無以下引用：

```bash
rg "AvatarPicker|AvatarDisplay|parseAvatarString|memberTone|NEUTRAL_AVATAR_TONE|AVATAR_TONES" components/v2
```

（若環境沒有 `rg`，改用 `grep -R`。）

## Risks and mitigations

- **既有 `avatar:` 資料**：v2 會從自訂 icon 變成首字。這是刻意的行為改變；LINE 登入會覆寫圖片，影響有限。
- **顏色改變**：原本依 index 輪替的畫面會改成固定色。測試需同步更新，避免把舊行為當成規格。
- **深色底對比**：使用 `variant="on-lake"` 的畫面需人工確認首字在白底或深底上仍可讀。
- **佔位成員辨識**：所有佔位成員共用沙色，需確認「佔位成員」文字標籤仍清楚。

## Acceptance criteria

1. v2 個人資料頁沒有任何頭像編輯入口、picker 或更換提示。
2. v2 正式畫面的所有頭像都經過 `V2Avatar`，且 `components/v2` 內不再有 `AvatarPicker`、`AvatarDisplay`、`parseAvatarString`、`memberTone`、`AVATAR_TONES`。
3. 同一個成員在 v2 成員頁、專案列表、支出卡、結算頁、統計頁顯示相同首字與相同顏色。
4. 佔位成員在 v2 所有畫面都是沙色底 + 名字首字。
5. 有 LINE 圖片的成員在 v2 所有畫面都顯示該圖片。
6. `npm run test:run` 與 `npm run lint` 通過。
7. v1 畫面與 `/api/users/profile` 行為不變。
