# UI v2 功能測試回饋修正 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依 spec 修正 v2 的功能測試回饋（頭像、篩選下拉、金額卡、付款成員、分攤、快速記帳、結算、成員、導覽、通用設定），維持 v1 不變、v2 覆蓋率 ≥90%。

**Architecture:** 新增一個共用 `V2Avatar`（三態）；其餘是各畫面的局部修正；唯一後端變更是 settle API 的 additive 欄位，資料來自已存在的 `Expense.splitDetail`（無 migration）。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4 / Vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-10-04-ui-v2-test-findings-design.md`

## Global Constraints

- 只改 `components/v2/**`、`app/globals.css`、`tests/**`、`app/api/projects/[id]/settle/route.ts`、`lib/hooks/useSettlement.ts`、`lib/quick-expense/**`。
- **不得修改**：`components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`、`prisma/**`、`lib/speech.ts`、`lib/media-recorder-speech.ts`、`lib/expense-split.ts`、`components/avatar-picker.tsx`、`app/api/auth/liff/route.ts`。
- `components/v2/**` 禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會擋）；`components/v2` 內**不得使用 Portal**。
- rename（付款人→付款成員）**只改 v2** 文案。
- 自訂頭像存續問題**不處理**（只認 LINE 頭像；`V2Avatar` 仍支援三態）。
- 每個 task 完成：`npm run lint && npx vitest run <檔案>` 綠；每個 `components/v2/**` 資料夾 Lines ≥ 90%；commit。
- v1 保護 diff（基準 `d2eb7e2`）輸出須為空：`git diff --name-only d2eb7e2 -- components/v1 components/ui components/expense components/location-picker.tsx prisma lib/speech.ts lib/media-recorder-speech.ts`.
- 多個 task 共用 `components/v2/expense-form/` 與 `components/v2/quick-expense/`，**必須循序**執行，勿平行。

## 非目標（Non-goals，勿實作）

- **C2 重看導覽**：v2 無導覽，本次不改、不隱藏（已知限制）。
- **N1 未開發 v2 的 6 個頁面**：`activity-logs`／`notes`／`currency`／`map`／`mileage`／`photos`／`export` 由使用者另行處理。
- **D14 自訂頭像存續**：不動 `app/api/auth/liff/route.ts`；只認 LINE 頭像。
- 不改任何 v1／shared 檔案（見 Global Constraints）。

## Review Focus

1. 頭像三態：`image` 為 `avatar:icon:color`／外部 URL／`null`（含 name 也 null）都要正確，且不破壞 layout 尺寸。
2. 篩選下拉在視窗邊緣：面板需翻轉／夾邊，不可跑出畫面；幣別 chip 隱藏造成格子位移時仍正確。
3. 結算分攤：`splitDetail` 為 null／全均分／有個人項目／有自訂金額／多幣別，都要顯示合理且數字總結。
4. 長名稱／大金額：付款成員列與成員列表不得破版（truncate / shrink-0）。
5. 快速記帳滑動邊界：第一筆／最後一筆時按鈕 disabled、index 不越界。
6. 相機：iOS LIFF 無 `getUserMedia` 走 fallback，仍需可用（單一按鈕）。

---

### Task 1: 共用 `V2Avatar`

**Files:**
- Create: `components/v2/ui/v2-avatar.tsx`
- Test: `tests/components/v2/v2-avatar.test.tsx`

**Interfaces:**
- Consumes: `components/avatar-picker.tsx` 的 `parseAvatarString`、`getAvatarColor`、`AvatarIcon`（只讀）。
- Produces: `V2Avatar({ image, name, className, fallbackClassName, iconClassName })`。

- [ ] **Step 1: 寫失敗測試**（`v2-avatar.test.tsx`）
  - `render(<V2Avatar image="https://x/a.png" name="小明" className="h-9 w-9" />)` → `container.querySelector("img")` 的 `src` 為該 URL，root 有 `aria-hidden="true"`。
  - `image="avatar:coffee:teal"`、`name="小明"` → **無** `img`，且 fallback 字 `小` 不出現（有自訂 icon）。
  - `image={null}`、`name="小明"` → 文字 `小`。
  - `image={null}`、`name={null}` → 文字 `?`。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/v2-avatar.test.tsx` → FAIL（module not found）。

- [ ] **Step 3: 實作 `components/v2/ui/v2-avatar.tsx`**
  - 用 `parseAvatarString(image)`：有值 → 容器 `inline-flex items-center justify-center {className}` + `style={{ backgroundColor: getAvatarColor(colorId) }}` + `<AvatarIcon iconId className={iconClassName} />`。
  - 否則 `image` 有值 → `inline-flex overflow-hidden {className}` + `<img src={image} alt="" className="h-full w-full object-cover" />`（加 `{/* eslint-disable-next-line @next/next/no-img-element */}`）。
  - 否則 → `inline-flex items-center justify-center {className} {fallbackClassName}` + 首字（`name?.trim().charAt(0).toUpperCase() || "?"`）。
  - root 一律 `aria-hidden="true"`。**不得** 使用 `#hex`/`text-white`（自訂 icon 色用 `text-v2-on-dark`）。

- [ ] **Step 4: 執行確認通過**：同 Step 2 指令 → PASS；`npx vitest run tests/components/v2/no-hardcoded-colors.test.ts` → PASS。

- [ ] **Step 5: Commit**：`git add components/v2/ui/v2-avatar.tsx tests/components/v2/v2-avatar.test.tsx && git commit -m "feat(v2): add shared V2Avatar"`

---

### Task 2: 套用頭像（目前使用者層級）

**Files:**
- Modify: `components/v2/projects/projects-v2-view.tsx:28-63`、`components/v2/projects/projects-v2.tsx`（傳 `userImage`）
- Modify: `components/v2/project/project-overview-v2-view.tsx:13-41`、`components/v2/project/project-overview-v2.tsx`（傳目前使用者）
- Modify: `components/v2/settings/general-settings-v2.tsx:63-77`
- Test: `tests/components/v2/projects-v2-view.test.tsx`、`tests/components/v2/project-overview-v2.test.tsx`、`tests/components/v2/general-settings-v2.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar`（Task 1）；`useLiff().user`（`{ name, image }`）。
- Produces: `ProjectsV2ViewProps` 新增 `userImage?: string | null`；`ProjectOverviewV2ViewProps` 新增 `currentUserName?: string | null`、`currentUserImage?: string | null`。

- [ ] **Step 1: 寫失敗測試**
  - `ProjectsV2View` 給 `userName="小明" userImage="https://x/a.png"` → 右上連結內有 `img[src]`。
  - `ProjectOverviewV2View` 給 `currentUserName/currentUserImage` → 右上顯示該使用者頭像（不再用 `project.creator.name` 的 `initial`）。
  - `GeneralSettingsV2`（mock `useLiff().user = { name:"Emma", image:"https://x/e.png" }`）→ 個人卡內有 `img[src="https://x/e.png"]`；image 為 null 時顯示 `E`。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/projects-v2-view.test.tsx tests/components/v2/project-overview-v2.test.tsx tests/components/v2/general-settings-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - `projects-v2.tsx`：從 `useLiff()` 取 `user`，傳 `userName={user?.name}`、`userImage={user?.image}`。
  - `projects-v2-view.tsx`：右上 `Link` 內以 `<V2Avatar image={userImage} name={userName} className="h-9 w-9" .../>` 取代 `initial`。
  - `project-overview-v2.tsx`：從 `useLiff()` 取 `user`，傳 `currentUserName/currentUserImage`；view 的右上改用 `V2Avatar`。
  - `general-settings-v2.tsx`：`<span className="... 12 w-12 ...">{displayName.charAt(0)}</span>` 換成 `<V2Avatar image={user?.image} name={displayName} className="h-12 w-12" fallbackClassName="bg-v2-paper/15 text-base font-bold" />`。

- [ ] **Step 4: 執行確認通過**：同 Step 2 指令 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): show user avatar on list/overview/settings"`

---

### Task 3: 套用頭像（成員 chip）＋ 型別串接

**Files:**
- Modify: `components/v2/expense-form/use-expense-draft.ts:19`、`payer-picker.tsx`、`split-editor.tsx`、`split-summary.tsx`
- Modify: `components/v2/expenses/expense-card.tsx`、`expense-filter-bar.tsx:15-16,46`、`filter-panels.tsx:74`
- Modify: `components/v2/quick-expense/quick-expense-v2.tsx:16`、`confirm-step.tsx:9`、`quick-item-card.tsx:21`
- Modify: `components/v2/settle/settlement-list.tsx`、`components/v2/stats/member-ranking.tsx`
- Modify: `components/v2/members/members-v2-view.tsx:66-73`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`、`tests/components/v2/quick-expense/quick-item-card.test.tsx`、`tests/components/v2/members-v2.test.tsx`、`tests/components/v2/expenses-v2.test.tsx`

**Interfaces:**
- Consumes: `V2Avatar`（Task 1）。
- Produces: `Member`/成員型別新增 `image?: string | null`（`use-expense-draft.ts`、`quick-expense-v2.tsx`、`confirm-step.tsx`、`quick-item-card.tsx`、`expense-filter-bar.tsx`、`filter-panels.tsx`）；`project-overview-v2.tsx:59-64` 傳 `image: m.user?.image ?? null`。

- [ ] **Step 1: 寫失敗測試**
  - `PayerPicker`：成員有 `image` 時，radio 內 render `img`；無 image 顯示首字。
  - `SplitSummary`／`SplitEditor`：成員有 image 時該列 render `img`。
  - `MembersV2View`：`member.user.image` 有值時該列 render `img`，無值顯示首字。
  - `QuickItemCard`：成員有 image 時 payer 選項 render `img`。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/quick-expense/quick-item-card.test.tsx tests/components/v2/members-v2.test.tsx tests/components/v2/expenses-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - 型別加 `image?: string | null`；資料來源：`useProjectData().members[].user?.image`、`project-overview-v2` 已帶 `user`。
  - 各成員 chip 的「首字」`<span>` 換成 `<V2Avatar image={m.image} name={m.displayName} className=... fallbackClassName=... />`，沿用原本尺寸與 tone class。
  - 不改 v1／shared。

- [ ] **Step 4: 執行確認通過**：同 Step 2 指令 → PASS（含 `no-hardcoded-colors`）。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): member avatars across chips"`

---

### Task 4: `付款人` → `付款成員` ＋ 付款卡溢出

**Files:**
- Modify: `components/v2/expense-form/payer-picker.tsx:38,76-81`、`components/v2/expense-form/use-expense-draft.ts:266`
- Modify: `components/v2/expenses/expense-filter-bar.tsx:67,69`
- Modify: `lib/quick-expense/draft.ts:40`、`components/v2/quick-expense/quick-input-step.tsx:60`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`、`tests/components/v2/quick-expense/confirm-step.test.tsx`、`tests/components/v2/filter-panels.test.tsx`、`tests/components/v2/expenses-v2.test.tsx`

**Interfaces:** 無新增（純文案＋樣式）。

- [ ] **Step 1: 寫失敗測試**
  - `getByRole("group", { name: "付款成員" })` 存在（原本 `付款人` 不再存在）。
  - 篩選列 `getByRole("button", { name: /付款成員/ })`。
  - 付款卡選中列：名稱 span 有 `truncate`、金額 span 有 `shrink-0`（以 `getByTestId` 或 role 定位）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/expense-form-v2-view.test.tsx tests/components/v2/filter-panels.test.tsx`。

- [ ] **Step 3: 實作**
  - `payer-picker.tsx:38` legend 改 `付款成員`；選中列名稱加 `truncate`、金額容器加 `shrink-0`。
  - `expense-filter-bar.tsx:67,69`、`quick-input-step.tsx:60`、`use-expense-draft.ts:266`、`lib/quick-expense/draft.ts:40` 文案改 `付款成員`。
  - 對應測試字串同步（`payment` 群組名稱）。

- [ ] **Step 4: 執行確認通過**：同 Step 2 ＋ `npx vitest run tests/components/v2/quick-expense/confirm-step.test.tsx tests/components/v2/expenses-v2.test.tsx` → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): rename payer to paying members and fix overflow"`

---

### Task 5: 支出列表篩選下拉定位（不溢出）

**Files:**
- Modify: `components/v2/expenses/filter-popover.tsx:34-77`
- Modify: `components/v2/expenses/filter-panels.tsx:220-318`（DatePanel `max-height`/scroll）
- Test: `tests/components/v2/filter-panels.test.tsx`、`tests/components/v2/expenses-v2.test.tsx`

**Interfaces:** `FilterPopover` props 不變；內部定位改為 `position: fixed` + 量測。

- [ ] **Step 1: 寫失敗測試**
  - mock trigger `getBoundingClientRect` 回傳靠視窗右緣、下方空間不足 → 面板樣式 `position: fixed`，且 `top` 小於 trigger 頂（向上翻轉）、`right/left` 夾在 `window.innerWidth` 內。
  - 面板仍可被 `getByTestId("filter-panel")` 找到（同一 DOM，非 Portal）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/filter-panels.test.tsx`。

- [ ] **Step 3: 實作**
  - 開啟時以 trigger `getBoundingClientRect()` 計算：預設在下方 `top = rect.bottom + 4`；若 `rect.bottom + panelHeight > innerHeight` 則 `top = rect.top - panelHeight - 4`。
  - 水平：`align="right"` → `left = rect.right - panelWidth`；否則 `left = rect.left`；`clamp` 到 `[4, innerWidth - panelWidth - 4]`。
  - 面板 class 用 `fixed`（保留 `z-20`、圓角、陰影）；`useEffect` 監聽 scroll/resize 重算；`DatePanel` 加 `max-h-[calc(100vh-160px)] overflow-y-auto`。
  - **不用 Portal**。

- [ ] **Step 4: 執行確認通過**：同 Step 2 ＋ `npx vitest run tests/components/v2/expenses-v2.test.tsx` → PASS。

- [ ] **Step 5: Commit**：`git commit -am "fix(v2): keep expense filter popover inside viewport"`

---

### Task 6: 金額卡與計算機一致、幣別可見

**Files:**
- Modify: `components/v2/expense-form/amount-card.tsx:32-71`、`components/v2/expense-form/calculator-pad.tsx:158-222`
- Test: `tests/components/v2/amount-card.test.tsx`、`tests/components/v2/calculator-pad.test.tsx`

**Interfaces:** `AmountCard`/`CalculatorPad` props 不變（`value`、`currency`、`open`、`onChange`）。

- [ ] **Step 1: 寫失敗測試**
  - `AmountCard` 收合態：金額旁顯示目前幣別（`TWD` 或符號）。
  - `AmountCard` `open`（計算機）態：仍看得到目前金額與幣別，且字級與輸入態一致（例如皆 `font-v2-serif` 且非 26px 級）；不再整卡變深色。
  - `CalculatorPad` 結果行顯示幣別。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/amount-card.test.tsx tests/components/v2/calculator-pad.test.tsx`。

- [ ] **Step 3: 實作**
  - 兩態共用同一卡面（`border-v2-lake-edge bg-v2-lake-tint`），計算機展開時**保留**金額輸入列可見（或顯示同字級的目前金額）。
  - 金額旁固定顯示幣別區塊（`CurrencySelect` 或 `{currency}` 標籤，視覺明顯）；`CalculatorPad` 結果行加幣別。
  - 移除「展開時隱藏輸入（`{!open && …}`）」的落差；顏色一律用 token。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): unify amount card and calculator, surface currency"`

---

### Task 7: 分攤編輯器 — 個人項目 `$` ＋ 明細出現時隱藏總結

**Files:**
- Modify: `components/v2/expense-form/split-editor.tsx:116-134,243-248`、`components/v2/expense-form/split-summary.tsx`
- Test: `tests/components/v2/expense-form-v2-view.test.tsx`

**Interfaces:** `SplitSummary` 不需新 prop；以「是否有可見列」在 `split-editor.tsx` 內判斷（例如依 `personalItems`/`customShares` 是否非空）。

- [ ] **Step 1: 寫失敗測試**
  - 個人項目金額 input 前有 `$`（可用 `aria-label`/container 文字）。
  - 當有分攤明細（個人項目非空）→ 不出現「個人項目 $… ＋ 共同分攤 $… = …」方程式；純均分（無個人項目）→ 出現該行。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/expense-form-v2-view.test.tsx`。

- [ ] **Step 3: 實作**
  - 個人項目金額 input 加 `$` 前綴（比照 `:195`）。
  - `:243-245` 方程式改為 `hasDetail ? null : (...)（原方程式）`，`hasDetail` = `split-summary` 會渲染列。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): currency prefix on personal item + hide summary when detail shown"`

---

### Task 8: 快速記帳結果頁滑動（方案 A）

**Files:**
- Modify: `components/v2/quick-expense/confirm-step.tsx:10,26,72-86`
- Test: `tests/components/v2/quick-expense/confirm-step.test.tsx`

**Interfaces:** `ConfirmStep` props 不變。

- [ ] **Step 1: 寫失敗測試**
  - 有「上一筆」「下一筆」按鈕；第一筆時「上一筆」disabled、最後一筆時「下一筆」disabled。
  - 點「下一筆」→ `onIndexChange(index+1)`；點「上一筆」→ `onIndexChange(index-1)`。
  - 既有 `touchend` 滑動（≥ 50px）仍切換，且左右滑動可作用於整個內容區（非只有卡片 div）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/quick-expense/confirm-step.test.tsx`。

- [ ] **Step 3: 實作**
  - 新增 `goPrev`/`goNext` 按鈕（`aria-label`），邊界 `disabled`。
  - 手勢綁到整個結果內容容器（header 下方 → footer 上方），加 `dragging` state + `transform: translateX`（`touch-action: pan-y`），`touchend` 依 dx 切換並回彈。
  - 保留 dots 與 `n / N` 計數。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): clearer quick-expense swipe with prev/next"`

---

### Task 9: 快速記帳文案／標題／麥克風權限（A1/A2/A4/A5）

**Files:**
- Modify: `components/v2/quick-expense/quick-input-step.tsx:7,32,37,44,60`
- Modify: `components/v2/quick-expense/confirm-step.tsx:43`
- Modify: `lib/quick-expense/speech-input.ts`
- Test: `tests/components/v2/quick-expense/quick-input-step.test.tsx`、`tests/components/v2/quick-expense/confirm-step.test.tsx`

**Interfaces:** `useSpeechInput` 新增回傳 `requestPermission?: () => Promise<void>`（或於 `toggle` 內首次呼叫 `getUserMedia`）；不破壞既有 `{ supported, recording, transcribing, error, toggle }`。

- [ ] **Step 1: 寫失敗測試**
  - 輸入頁標題 `AI 快速記帳`；範例 chips = `早餐 100 我付`／`晚餐 600 大家分`／`計程車 250 小明付`／`超市 1280 我付 800、小明 480`；placeholder 含 `我付 800 小明 480`；說明在 section 標題下方（DOM 順序）。
  - 結果頁 `h1` = `AI 辨識結果`。
  - 麥克風：mock `navigator.mediaDevices.getUserMedia` 被拒 → 顯示「請允許麥克風權限」。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/quick-expense/quick-input-step.test.tsx tests/components/v2/quick-expense/confirm-step.test.tsx`。

- [ ] **Step 3: 實作**
  - `EXAMPLES` 換成新四句；placeholder 更新；說明 `<p>` 移到 section 標題（`:37`）下方並精簡。
  - `confirm-step.tsx:43` 標題改 `AI 辨識結果`。
  - `speech-input.ts`：在 `toggle` 開始前呼叫 `navigator.mediaDevices.getUserMedia({audio:true})` 以觸發權限（catch `NotAllowedError` → `請允許麥克風權限`）；**不改** `lib/speech.ts`、`lib/media-recorder-speech.ts`。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): quick-expense copy, result title, mic permission"`

---

### Task 10: 相機流程簡化（A3）

**Files:**
- Modify: `components/v2/quick-expense/camera-step.tsx:24-30,77-79`、`components/v2/quick-expense/quick-expense-v2.tsx:132`
- Test: `tests/components/v2/quick-expense/camera-step.test.tsx`、`tests/components/v2/quick-expense/quick-expense-v2.test.tsx`

**Interfaces:** `CameraStep` props 新增 `onClose` 語意改變 → 由父層傳 `onClose={() => setStep("input")}`（回輸入頁）。

- [ ] **Step 1: 寫失敗測試**
  - `CameraStep` 點 `X` 觸發 `onClose`（父層測試：回到輸入頁而非整個流程關閉，`AI 快速記帳` 輸入頁再現）。
  - 不再有「改用手動輸入」按鈕；不再有右上 `Sparkles` 裝飾按鈕。
  - `mode="fallback"`（mock `isIOSDevice` 為 true／無 `getUserMedia`）仍顯示單一「開啟相機」按鈕。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/quick-expense/camera-step.test.tsx tests/components/v2/quick-expense/quick-expense-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - 移除 `:77-79` 手動輸入鈕與 `:28-30` 的 `Sparkles` span。
  - `quick-expense-v2.tsx:132` 傳 `onClose={() => setStep("input")}`。
  - 保留 `useCamera` 自動啟動；fallback 只留「開啟相機」（＋相簿）。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): simplify camera step and return to input on close"`

---

### Task 11: v2 圖片選擇器（X6）

**Files:**
- Create: `components/v2/expense-form/v2-image-picker.tsx`
- Modify: `components/v2/expense-form/expense-form-v2-view.tsx:124-127`、`components/v2/quick-expense/quick-item-card.tsx:129-132`
- Test: `tests/components/v2/v2-image-picker.test.tsx`、`tests/components/v2/expense-form-v2-view.test.tsx`

**Interfaces:**
- Produces: `V2ImagePicker({ label, value, onChange, onError? })`；`value` 為預覽 URL／data，`onChange(file)`。
- Consumes: v1 檔案讀取邏輯可參考 `components/ui/image-picker.tsx`（只讀，不修改）。

- [ ] **Step 1: 寫失敗測試**
  - 點「拍照」「從相簿選擇」開啟對應 hidden input（`capture="environment"`）。
  - 選檔後呼叫 `onChange(file)`。
  - 錯誤以 v2 提示（`role="alert"`）呈現，**呼叫 `window.alert` 的次數為 0**。
  - 元素可被 v2 token class 檢查（無 hex/白黑）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/v2-image-picker.test.tsx`。

- [ ] **Step 3: 實作**
  - 新元件：以 v2 卡片（`SECTION_CARD` 語彙 / paper / line / lake）呈現；底部彈出（inline overlay，**不用 Portal**）提供「拍照」「從相簿選擇」；錯誤用 `role="alert"`。
  - `expense-form-v2-view.tsx` 與 `quick-item-card.tsx` 改 import `V2ImagePicker`；**不修改** `components/ui/image-picker.tsx`。

- [ ] **Step 4: 執行確認通過**：同 Step 2 ＋ `npx vitest run tests/components/v2/expense-form-v2-view.test.tsx` → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): add v2 image picker"`

---

### Task 12: 結算頁 banner 置頂＋支持區塊縮小（S1）

**Files:**
- Modify: `components/v2/settle/settle-v2-view.tsx:48-93`、`components/v2/settle/sponsor-card.tsx:10-39`
- Test: `tests/components/v2/settle-v2.test.tsx`

**Interfaces:** props 不變。

- [ ] **Step 1: 寫失敗測試**
  - adSlot 渲染位置在 `計算總覽`（`SettleSummaryGrid`）**之前**（DOM 順序）。
  - `SponsorCard` 標題仍在，但版面縮小（例如按鈕容器為單列、padding class 改變；以 class/結構斷言）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/settle-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - `settle-v2-view.tsx`：把 `{props.adSlot && …}` 移到 `V2TopBar` 之後、`SettleSummaryGrid` 之前。
  - `sponsor-card.tsx`：降低 padding、4 個按鈕改單列 icon 按鈕、標題縮小。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): settle banner on top, compact sponsor card"`

---

### Task 13: 結算計算過程顯示分攤結構（S2）

**Files:**
- Modify: `app/api/projects/[id]/settle/route.ts:16-32,145-282`
- Modify: `lib/hooks/useSettlement.ts:22-30`
- Modify: `components/v2/settle/settle-calc-dialog.tsx:22-105`
- Test: `tests/components/v2/settle-dialogs.test.tsx`

**Interfaces:**
- Produces（additive）：
  ```ts
  interface ExpenseDetailParticipant {
    memberId: string
    displayName: string
    userImage: string | null
    shareAmount: number
    convertedShareAmount: number
    personalItems: { name: string; amount: number; convertedAmount: number }[]
    sharedAmount: number      // 非自訂分攤成員的共同分攤（專案幣別）；自訂者為 0
    customAmount?: number     // 自訂分攤成員的指定金額（專案幣別）
  }
  // payer 新增 userImage: string | null
  ```
- Consumes: `expense.splitDetail`（形狀見 `lib/expense-split.ts:13-17`）。

- [ ] **Step 1: 寫失敗測試**（`settle-dialogs.test.tsx`）
  - mock 一筆支出含 `personalItems`（例：`小雨 $300`）與共同分攤；斷言 Step 1 出現「小雨」「$300」與「共同分攤」（或「N 人均分」）。
  - 全均分（無 splitDetail）→ 顯示「N 人均分 $X」單一總結，不平鋪成員。
  - 自訂分攤成員 → 顯示指定金額標示。
  - payer 顯示頭像（`img`）當 `userImage` 有值。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/settle-dialogs.test.tsx`。

- [ ] **Step 3: 實作**
  - API：`ExpenseDetail` 介面擴充；`findMany` 已 include `splitDetail`（若無則補 `splitDetail: true`）；組 `expenseDetail.participants` 時，由 `expense.splitDetail?.personalItems?.[memberId]` 產生 `personalItems`（換算 `* rate`），`sharedAmount = convertedShareAmount - sum(personalItems.convertedAmount)`（有 `customShares[memberId]` 時 `sharedAmount=0`、`customAmount=convertedShareAmount - itemsTotal`）；payer 帶 `userImage: expense.payer.user?.image ?? null`。
  - `useSettlement.ts` 型別同步。
  - `settle-calc-dialog.tsx`：Step 1 每列改為付款成員（`V2Avatar` + 名稱）＋分攤摘要（個人項目逐項／「+N 項」、共同分攤「N 人均分 $X」或自訂「指定 $X」）；多幣別沿用「原幣 → 換算」。移除平鋪長串。
  - v1 消費者：確認既有欄位不變（additive）。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS；`npx vitest run tests/components/v2/settle-v2.test.tsx` → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(settle): expose split detail and summarize breakdown"`

---

### Task 14: 成員頁加入方式連結移出成員卡（M1）

**Files:**
- Modify: `components/v2/members/members-v2-view.tsx:34-53`
- Test: `tests/components/v2/members-v2.test.tsx`

**Interfaces:** props 不變。

- [ ] **Step 1: 寫失敗測試**
  - 「前往專案設定修改加入方式」（或新名稱）為獨立一列（在成員卡容器**之外**），且與「增加成員」按鈕分屬不同 DOM 容器。
  - 連結 href 仍為 `/projects/{id}/settings`。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/members-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - 將該 `Link` 從 `成員列表` 卡移除，改成成員卡之後的獨立設定列（icon + 標題 + 說明 + `ChevronRight`），加大與上方按鈕分隔。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): move join-method link out of members card"`

---

### Task 15: 旅程總覽專屬返回（T1）

**Files:**
- Modify: `components/v2/layout/v2-top-bar.tsx:14-35`、`components/v2/project/project-overview-v2-view.tsx:29-41`
- Test: `tests/components/v2/v2-top-bar.test.tsx`、`tests/components/v2/project-overview-v2.test.tsx`

**Interfaces:**
- Produces: `V2TopBar` 新增可選 `fixedBack?: boolean`（或 `backMode?: "history" | "link"`）；為 true 時**忽略 history**、固定導向 `backHref`，並可用 `backIcon?: ReactNode` 指定專屬圖示。

- [ ] **Step 1: 寫失敗測試**
  - `V2TopBar fixedBack backHref="/projects"` 且有 `history.length>1` → 點返回仍導向 `/projects`（不呼叫 `history.back`）。
  - 預設（無 `fixedBack`）維持原行為。
  - 旅程總覽渲染 `fixedBack` 與專屬圖示（如 `aria-label="回旅程列表"`）。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/v2-top-bar.test.tsx tests/components/v2/project-overview-v2.test.tsx`。

- [ ] **Step 3: 實作**
  - `v2-top-bar.tsx` 新增 `fixedBack`（略過 `history.back()`）；`backIcon` 覆寫預設箭頭。
  - `project-overview-v2-view.tsx` 傳 `fixedBack backHref="/projects"` + 專屬圖示（資料夾／首頁）與 `aria-label="回旅程列表"`。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): trip overview returns to trip list"`

---

### Task 16: 通用設定記帳偏好文案與位置（C1）

**Files:**
- Modify: `components/v2/settings/general-settings-v2.tsx:134-147`
- Test: `tests/components/v2/general-settings-v2.test.tsx`

**Interfaces:** props 不變。

- [ ] **Step 1: 寫失敗測試**
  - `記帳偏好` 卡內，說明「建立新專案時預設使用的幣別；專案內以結算幣別為準」出現在卡片標題**之後、控制項之前**（DOM 順序）。
  - 原本掛在 `預設幣別` 控制項下方的 `新增支出時優先使用此幣別` 不再出現。

- [ ] **Step 2: 執行確認失敗**：`npx vitest run tests/components/v2/general-settings-v2.test.tsx`。

- [ ] **Step 3: 實作**：把說明 `<p>` 移到卡片標題下方並改文案（比照 `LINE 通知` 區塊）。

- [ ] **Step 4: 執行確認通過**：同 Step 2 → PASS。

- [ ] **Step 5: Commit**：`git commit -am "feat(v2): clarify preference currency copy"`

---

### Task 17: 最終驗證

- [ ] **Step 1: 全套測試**：`npm run test:run` → exit 0。
- [ ] **Step 2: 覆蓋率**：`npm run test:coverage` → 每個 `components/v2/**` 資料夾 Lines ≥ 90%；新檔（`v2-avatar.tsx`、`v2-image-picker.tsx`）≥ 90%。
- [ ] **Step 3: Lint**：`npm run lint` → 0 error。
- [ ] **Step 4: v1 保護 diff**：`git diff --name-only d2eb7e2 -- components/v1 components/ui components/expense components/location-picker.tsx prisma lib/speech.ts lib/media-recorder-speech.ts` → 空輸出。
- [ ] **Step 5: 顏色守衛**：`npx vitest run tests/components/v2/no-hardcoded-colors.test.ts tests/components/v2/v2-tokens.test.ts` → PASS。
- [ ] **Step 6: Commit（若有殘留變更）**：`git commit -am "test(v2): finalize test-findings enhancements"`。
