# UI v2 功能測試回饋修正 — 設計（spec）

- 日期：2026-10-04
- 狀態：待使用者審閱（審閱通過後才進 writing-plans）
- 來源：`design/project-v20261004/enhancement-based-on-testing.md`（功能測試報告）
- 目標：把測試回饋中的 UI/UX 與功能缺陷，落實為 **v2** 的修正；同時產出可貼給 Claude Design 的同步 prompt。
- 交付物：
  1. 本 spec（設計、範圍、驗收）
  2. 實作 plan（後續由 writing-plans 產生）
  3. `design/project-v20261004/claude-design-sync-prompts-2.md`（Claude Design 同步 prompt）

> 命名：報告逐條以 ID 對應（G/L/X/S/M/N/T/A/C）。決策以 D 編號。

## 0. 決策摘要（已與使用者確認）

| # | 題目 | 決定 |
|---|---|---|
| D1 | 未開發 v2 的 6 個頁面（匯率／歷史紀錄／匯出／筆記／消費地圖／照片牆） | **不納入本次**（使用者自行處理）。本次只記錄為已知現況。 |
| D2 | 頭像顯示範圍 | **全部**：目前使用者出現處 + 所有成員 chip 都改用頭像（無頭像則 fallback 首字）。來源為 `User.image`（實務上即 LINE 頭像）。 |
| D3 | `付款人` → `付款成員` 改名範圍 | **只改 v2**（v1、活動紀錄、匯出等不動）。 |
| D4 | 分攤明細 vs 文字總結 | 出現「分攤明細」表時，**隱藏**「共同分攤」下方那行方程式。 |
| D5 | 快速記帳結果頁滑動 | **方案 A**：手勢擴大到整頁內容、加拖曳位移回饋、加上一筆／下一筆按鈕；保留 dots 與計數。 |
| D6 | 成員頁誤按 | 把「前往專案設定修改加入方式」**移出成員卡**，獨立成一列設定項並加大分隔。 |
| D7 | 旅程總覽返回 | 改成**專屬回首頁（`/projects`）按鈕**，不吃瀏覽器 history；其他子頁維持一般返回。 |
| D8 | 通用設定文案 | 語意修正為「建立新專案時預設使用的幣別；專案內以**專案結算幣別**為準」，並**移到卡片標題下方**。 |
| D9 | 重看導覽 | **先忽略**（v2 導覽功能不完善，本次不改、不隱藏）。列為已知限制。 |
| D10 | AI 引導文案陽春 | 優化輸入頁引導文案，但**精簡**（移到 section title 下方、不佔版面）。 |
| D11 | 收費／消費圖片 | **是**：新增 v2 版圖片選擇器，取代 v1 `ImagePicker`，並與 `CameraStep` 統一（需設計稿）。 |
| D12 | 結算頁 banner | 廣告 banner 移到**頁面最上方**（計算總覽之上）；支持贊助區塊**縮小**。 |
| D13 | 結算計算過程支出明細 | 需顯示**付款成員**＋**分攤成員（個人項目／共同分攤）**，數字**總結化**。需擴充 settle API／型別。 |
| D14 | 自訂頭像存續（登入覆蓋 `User.image`） | **本次不處理**：v2 只認 LINE 頭像，`V2Avatar` 仍支援三態（自訂字串／URL／首字）。覆蓋問題留待 v2 個人資料頁（A14b）另案。 |
| D15 | AI 快速記帳結果頁標題 | 改為「**AI 辨識結果**」（輸入頁維持「AI 快速記帳」）。 |
| D16 | AI 快速記帳輸入頁範例文案 | 換成：`早餐 100 我付`／`晚餐 600 大家分`／`計程車 250 小明付`／`超市 1280 我付 800、小明 480`；placeholder `例如：晚餐 600 大家分、我付 800 小明 480`。 |

## 1. 範圍（Edit scope）

**可修改**
- `components/v2/**`（含新檔）
- `app/globals.css`（如需新 token；只在 `[data-ui="v2"]` 與 dark 變體新增）
- `tests/**`（更新既有、新增）
- `app/api/projects/[id]/settle/route.ts`（**僅新增回應欄位**，additive、不改既有欄位語意）
- `lib/hooks/useSettlement.ts`（型別新增，additive）
- `lib/quick-expense/**`（v2 專用：文案／型別）
- `components/v2/quick-expense` 相關型別（成員頭像）

> 依 D14，**不修改** `app/api/auth/liff/route.ts`；自訂頭像存續問題本次不處理。

**不得修改**
- `components/v1/**`、`components/ui/**`、`components/expense/**`、`components/location-picker.tsx`
- `prisma/**`（`Expense.splitDetail` 已存在，無需 migration）
- `lib/expense-split.ts`、`lib/speech.ts`、`lib/media-recorder-speech.ts`（共用；僅在 v2 wrapper 層處理權限，不改共用 hook）
- 未開發 v2 的 6 個頁面（依 D1）

## 2. 保護原則

1. rename／文字調整**只套用在 v2 面向使用者的文案**；v1 逐字不變。
2. `components/v2/**` 禁止 `#hex`、`bg-white`、`text-white`、`bg-black`、`dark:`（`tests/components/v2/no-hardcoded-colors.test.ts` 會擋）。
3. 顏色一律用 v2 token；`components/v2` 內不使用 Portal（會脫離 `[data-ui="v2"]` token 作用域），定位改用 `position: fixed` + 量測（見 L1）。
4. 每個 task 結束都要 `npm run lint` 與 `npm run test:run` 全綠才 commit。
5. 每個 `components/v2/**` 資料夾 Lines ≥ 90%（延續 M6/M7 規則）。
6. 對外 API 變更必須 additive，且確認 v1 消費者不受影響。

## 3. 逐項設計

### E1 / G1 — 全域頭像（D2）

**現況**：`User.image` 已存（LINE 圖或 `avatar:icon:color`），API／hook 也都帶 `image`（`useProjectData.ProjectMember.user.image`、`useSettlement` balances `userImage`、settle API 已 select `user.image`），但 v2 **每一處都只顯示暱稱首字**。

**設計**
- 新增共用 `components/v2/ui/v2-avatar.tsx`：
  - props：`image?: string | null`、`name?: string | null`、`sizeClass`、可選 `toneClass`。
  - 三態：`avatar:` 自訂頭像（重用 `components/avatar-picker.tsx` 的解析／`AvatarDisplay`，**不修改該檔**）→ `http(s)` 用 `<img>` → fallback 首字 + 既有 `AVATAR_TONES`。
  - `aria-hidden`（裝飾）；需要時另給文字名稱。
- 套用點（至少）：
  - `components/v2/project/project-overview-v2-view.tsx:33-39`：右上改顯示**目前使用者**頭像（目前誤用 `project.creator.name`）。
  - `components/v2/projects/projects-v2-view.tsx:39,57-63`：右上使用者頭像。
  - `components/v2/settings/general-settings-v2.tsx:69-71`：個人卡（取代首字，保留既有版位）。
  - `components/v2/members/members-v2-view.tsx:66-73`：成員列表用 `member.user.image`。
  - 成員 chip：`expense-form/payer-picker.tsx`、`split-editor.tsx`、`split-summary.tsx`、`expenses/expense-card.tsx`、`expenses/filter-panels.tsx`、`quick-expense/quick-item-card.tsx`、`settle/settlement-list.tsx`、`stats/member-ranking.tsx`。
- **型別串接**：`useParticipantMembers`／`ProjectMember` 已有 `user.image`；需把 image 傳進目前只有 `{id, displayName}` 的型別：
  - `components/v2/expense-form/use-expense-draft.ts:19`（members）
  - `components/v2/quick-expense/quick-expense-v2.tsx:16`、`confirm-step.tsx:9`、`quick-item-card.tsx:21`（`Member`）
  - `components/v2/expenses/expense-filter-bar.tsx:15-16,46`、`filter-panels.tsx:74`
  - project-overview-v2 已傳 `user`（`project-overview-v2.tsx:59-64`），僅需收斂型別。
- **自訂頭像（D14，本次不處理）**：`app/api/auth/liff/route.ts:63-69` 每次登入都以 LINE 圖覆蓋 `image`，自訂頭像會被洗掉。依 D14，本次只認 LINE 頭像、不動 API；`V2Avatar` 仍實作三態，成本極低且向後相容。此問題留待 v2 個人資料頁（A14b）另案決定是否給自訂頭像獨立欄位。

### L1 — 全部支出：付款日期下拉溢出（D 未列，直接修）

**現況**：`filter-popover.tsx:44,67-73` 為 inline `absolute`（`top-[calc(100%+4px)]`），錨在 3 欄 grid（`expense-filter-bar.tsx:62`）的窄格子內，面板 236px 比格子寬；`align="right"` 是對「格子右緣」，且幣別 chip 隱藏時格子位移（`:82`）→ 面板跑出畫面。DatePanel 也無 `max-height`。

**設計**
- 面板改 `position: fixed` + 以 trigger 的 `getBoundingClientRect()` 計算 `top/left`（不 Portal，保持 v2 token 作用域）。
- 加入視窗碰撞處理：空間不足時**向上翻轉**、水平**夾在視窗內**（保留 `align` 偏好）。
- 監聽 scroll／resize／開啟時重算。
- `DatePanel` 於小螢幕加 `max-height` + `overflow-y-auto`（比照其他 panel `filter-panels.tsx:44,83,124` 的做法）。
- 視覺不變（Claude Design 不需改）。

### X1 — 金額頁 vs 計算機風格不一致、幣別不明顯（直接修）

**現況**：`amount-card.tsx:56-71` 輸入態淺色 36px serif，開計算機整張卡變深色（`:34`）且輸入列被 unmount；`calculator-pad.tsx:195-208` 結果 26px、沒有幣別符號。

**設計方向**（細部像素由 Claude Design 定案，見同步 prompt）
- 輸入態與計算機態**共用同一套字體／字級與卡面語言**（不要一開就換成完全不同的深色卡）。
- **幣別必須明顯且兩態都可見**：金額旁有醒目的幣別區塊（code／符號），計算機結果行也顯示當前幣別。
- 計算機展開時仍能看到「目前金額」與幣別（不再整個被替換掉）。
- 影響檔：`amount-card.tsx`、`calculator-pad.tsx`；共用於 A3/A21/A12b（改一次全部受益）。

### X2 — 付款人溢出 + 改名為「付款成員」（D3）

**現況**：`payer-picker.tsx:38` legend `付款人`；選中列 `:76-81` 名稱無 `truncate`、金額無 `shrink-0`，在 `overflow-hidden` 卡內易擠壓／裁切。

**設計**
- v2 文案 `付款人` → `付款成員`：`payer-picker.tsx:38`、`expense-filter-bar.tsx:67,69`、`quick-input-step.tsx:60`、`use-expense-draft.ts:266`、`lib/quick-expense/draft.ts:40`（確認 `lib/quick-expense` 僅 v2 使用）。對應測試同步。
- 選中列：名稱 `truncate`、金額 `shrink-0`；長名稱／大金額不破版。
- v1 不動。

### X3 — 個人項目金額缺 `$`（直接修）

**現況**：`split-editor.tsx:124-134` 個人項目金額 input 無幣別符號，相鄰欄位（`:101-104`、`:194-207`）與 `split-summary` 都有 `$`。

**設計**：於個人項目金額 input 補上與相鄰一致的 `$` 前綴（沿用該檔既有 `money()` 風格）。範圍僅此欄位。

### X4 — 分攤明細 vs 共同分攤文字總結（D4）

**現況**：`split-editor.tsx:243-245` 一行方程式與 `:248` 的 `<SplitSummary>`（分攤明細表）同時出現；付款卡 footer（`payer-picker.tsx:86-97`）另有第三份摘要。

**設計**
- 當 `SplitSummary` 有可見列時，**隱藏** `split-editor` 的共同分攤方程式（`:243-245`）；無可見列（純均分）時才顯示該行作為總結。
- 保留付款卡 footer 與分攤明細表。
- 影響：`split-editor.tsx`、`split-summary.tsx`（如需回報「有無可見列」）。

### X5 — 快速記帳結果頁滑動（D5）

**現況**：`confirm-step.tsx:74-86` 手勢只綁在 item 卡容器 div，整頁下滑後手勢失效；只有 `touchend` 判定（`:10`),無拖曳回饋、無按鈕、無 pointer/mouse。

**設計（方案 A）**
- 手勢綁到整個結果內容區（含 header 下方到 footer 上方）。
- 加入**即時拖曳位移／回彈**回饋（`transform: translateX`），讓使用者看到「有變化」。
- 於卡片兩側或 dots 旁新增**上一筆／下一筆**按鈕（邊界時 disabled）。
- 設定 `touch-action: pan-y` 讓垂直捲動與水平切換不互搶；保留 dots 與 `n / N` 計數。
- 影響：`confirm-step.tsx`。

### X6 — 收費／消費圖片 UI（D11）

**現況**：add/edit（`expense-form-v2-view.tsx:124-127`）與快速結果（`quick-item-card.tsx:129-132`）都用 v1 `components/ui/image-picker.tsx`（slate 框、`alert()`、高對話框）；快速流程另有 `CameraStep`，兩套不一致。

**設計**
- 新增 v2 `components/v2/expense-form/v2-image-picker.tsx`：對齊 v2 token／圓角／底部彈出（相機／相簿），錯誤改用 v2 提示（不用 `alert()`）。
- 取代上述兩處 v1 `ImagePicker`；與 `CameraStep` 的視覺語彙一致。
- 需 Claude Design 提供此元件的外觀（見同步 prompt）。
- 不改 `components/ui/image-picker.tsx`（v1 仍使用）。

### S1 — 結算 banner 位置與支持區塊（D12）

**現況**：`settle-v2-view.tsx:57` 廣告在計算總覽下方（已偏上），`:92` `<SponsorCard>` 在最底部且偏大。

**設計**
- 廣告 banner 移到**頁面最上方**（`V2TopBar` 之下、計算總覽之上）。
- `sponsor-card.tsx` 縮小（降低 padding、單列 icon 按鈕、縮小標題）。
- 需 Claude Design 更新 `Settle-sections` board。

### S2 — 結算計算過程支出明細（D13）

**現況**：`app/api/projects/[id]/settle/route.ts:16-32` 的 `ExpenseDetail` 只有 payer 名稱 + 各 participant 的 share，**沒有分攤結構**；`:145-178` 也沒讀 `expense.splitDetail`。`splitLine`（`settle-calc-dialog.tsx:22-36`）因此均分時只顯示 `$X（÷n）`，非均分時列平鋪金額——沒有「個人項目／共同分攤」。

**資料基礎（已存在）**
- `prisma/schema.prisma:117` `Expense.splitDetail Json?`，形狀 `{ version:1, personalItems: Record<memberId, {name,amount}[]>, customShares: Record<memberId, number> }`（`lib/expense-split.ts:13-17`）。
- `participant.shareAmount` 已是 `computeShares` 後的結果（含個人項目＋共同分攤）（`lib/expense-split.ts:44-68`）。

**設計**
- 擴充 `ExpenseDetail`（additive）：
  - `payer` 增加 `userImage`（API 已 select，只是沒放進 DTO）。
  - `participants[]` 增加 `userImage` 與 `personalItems: {name,amount}[]`（由 `expense.splitDetail.personalItems[memberId]`）與 `sharedAmount`（= `convertedShareAmount` − 該成員個人項目換算金額；有 `customShares` 者標示為「指定金額」）。
- `lib/hooks/useSettlement.ts` 型別同步（additive）。
- `settle-calc-dialog.tsx` 的 Step 1 每列改為：
  - 付款成員：頭像 + 名稱。
  - 分攤成員：摘要化——個人項目（列 `名稱 $金額`，可用「+N 項」收斂）、共同分攤（每人 `$金額` 或「N 人均分 $X」）。金額全以專案幣別、必要時顯示原幣→換算（沿用既有行為）。
  - 目標：「數字盡量總結、不要太細」。
- 需 Claude Design 更新 `SettleCalcDialog-after` board（見同步 prompt）。
- v1 消費者：確認回應 additive、不改既有欄位。

### M1 — 成員頁誤按（D6）

**現況**：`members-v2-view.tsx:37-46` 分享／增加成員按鈕，`:48-53` 緊接「前往專案設定修改加入方式」連結，同卡只隔 `mb-3`。

**設計**
- 將「前往專案設定修改加入方式」移出成員卡，獨立成一列設定項（icon + 標題 + 說明 + chevron），置於成員卡**之後**，加大與上方按鈕的分隔。
- 需 Claude Design 更新 `Members-sections` board。

### T1 — 旅程總覽返回（D7）

**現況**：`v2-top-bar.tsx:20-26` 有 history 就走 `window.history.back()`，`backHref` 只在 `history.length<=1` 生效；`project-overview-v2-view.tsx:29-41` 仍是一般返回箭頭。

**設計**
- `V2TopBar` 增加模式（如 `backMode="link"` 或 `fixedBack`）：**忽略 history**、按鈕固定導向 `backHref`。
- 旅程總覽改用此模式 + `backHref="/projects"`，並用**專屬圖示**（如資料夾／首頁）表示「回旅程列表」。
- 其他子頁維持一般返回。
- 需 Claude Design 於 `Trip-m0lh` 標示此特殊返回鍵。

### A1〜A5 — AI 快速記帳（D9/D10）

- **A5 標題重複**：輸入頁 `quick-input-step.tsx:32` 與結果頁 `confirm-step.tsx:43` 都叫「AI 快速記帳」。依 D15，**結果頁改為「AI 辨識結果」**，輸入頁不變。
- **A4 說明位置**：把 `quick-input-step.tsx:60` 的說明移到 section title（`:37`）下方，並**精簡用字**（D10）；範例 chips（`:7,63-69`）保留但控制版面。
- **A3 相機流程**：
  - `camera-step.tsx:24-26` 的 `X` 改為**回上一個 AI 快速記帳畫面**（`quick-expense-v2.tsx:132` 傳 `onClose={() => setStep("input")}`，而非關閉整個流程）。
  - 移除右上多餘的 `Sparkles` 裝飾 icon（`:28-30`）。
  - 移除「改用手動輸入」（`:77-79`）。
  - 進入即自動啟動相機：`use-camera.ts:13-46` 已在支援的裝置自動 `getUserMedia`；**iOS LIFF 無 `getUserMedia` 會走 fallback**，`capture="environment"` 的檔案輸入需使用者手勢觸發（瀏覽器限制）。fallback 時保留單一「開啟相機」按鈕，其餘 UI 簡化。
- **A1 麥克風權限**：`lib/quick-expense/speech-input.ts` 為 v2 wrapper；在**使用者首次按麥克風時**主動做權限請求／`getUserMedia`，被拒時顯示明確引導（例如「請允許麥克風權限」與開啟方式）。**不改**共用 `lib/speech.ts`、`lib/media-recorder-speech.ts`，以避免影響 v1。
- **A2 內容模板（D16）**：即輸入頁的 placeholder 與範例 chips（`quick-input-step.tsx:7,44,63-69`）。換成下列短句，涵蓋「單筆／均分／指定人／自訂分攤」，維持精簡不佔版面：
  - 範例 chips：`早餐 100 我付`、`晚餐 600 大家分`、`計程車 250 小明付`、`超市 1280 我付 800、小明 480`
  - placeholder：`例如：晚餐 600 大家分、我付 800 小明 480`

### C1/C2 — 通用設定（D8/D9）

- **C1 文案**：`general-settings-v2.tsx:134-147` 的 `記帳偏好` 卡，說明改為「建立新專案時預設使用的幣別；專案內以結算幣別為準」，並**移到卡片標題下方**（比照 `LINE 通知` 區塊 `:149-154`）。需 Claude Design 更新 `GeneralSettings` board。
- **C2 重看導覽**：依 D9 **本次不改**，列為已知限制（v2 無導覽，`project-overview-v2.tsx:13` 已刻意停用 `AppTour`）。

### N1 — 未開發 v2 的 6 個頁面（D1）

不納入本次。僅記錄：`activity-logs`／`notes`／`currency`／`map`／`mileage`／`photos`／`export` 仍走 v1 `AppLayout`。

## 4. 新增 token

本 spec 預期**不需要**新 token（頭像重用既有 `AVATAR_TONES`；定位、文案、結構變更不需色票）。若 Claude Design 的新元件（v2 圖片選擇器）引入新色，依既有流程於 `globals.css` + `tests/components/v2/v2-tokens.test.ts` 新增。

## 5. 測試

| 檔 | 動作 | 重點 |
|---|---|---|
| 新增 `tests/components/v2/v2-avatar.test.tsx` | new | 三態（自訂頭像／URL／首字 fallback）、`aria-hidden` |
| `projects-v2-view.test.tsx`、`project-overview-v2.test.tsx` | update | 改用頭像（有 image 時 render `<img>`） |
| 既有 members 測試（或 `m4-pages.test.tsx`） | update | 成員頭像；「前往專案設定」新位置與可及名稱 |
| `expense-form-v2-view.test.tsx`、`quick-expense/*` | update | `付款成員` 文案、個人項目 `$`、分攤總結條件顯示、`Member` 型別帶頭像 |
| `filter-panels.test.tsx`、`expenses-v2.test.tsx` | update | 日期面板 fixed/翻轉/夾邊（用 trigger rect mock 斷言）；`付款成員` chip |
| `confirm-step.test.tsx` | update | 上一筆／下一筆按鈕、邊界 disabled、滑動仍可切換、結果頁新標題 |
| `quick-input-step.test.tsx` | update | 標題、說明位置、範例、麥克風權限引導 |
| `camera-step` → `quick-expense` 相關測試 | update | `X` 回輸入頁、移除手動輸入與裝飾 icon |
| `settle-dialogs.test.tsx` | update | Step 1 顯示付款成員頭像＋個人項目／共同分攤；均分收斂 |
| `settle-v2.test.tsx` | update | banner 在最上方、支持卡縮小 |
| `general-settings-v2.test.tsx` | update | 記帳偏好說明位置與新文案 |
| `trip`／`project-overview-v2.test.tsx` | update | 專屬回首頁按鈕（固定 `/projects`、不吃 history） |
| `no-hardcoded-colors.test.ts`、`v2-tokens.test.ts` | 維持綠 | 新元件不得用 hex／白黑 class |

- 覆蓋率：每個 `components/v2/**` 資料夾 Lines ≥ 90%；新檔案 ≥ 90%。
- 每個 task：`npm run lint && npm run test:run` exit 0。

## 6. API／型別變更（additive）

| 位置 | 變更 |
|---|---|
| `app/api/projects/[id]/settle/route.ts` `ExpenseDetail` | payer 加 `userImage`；participants 加 `userImage`、`personalItems`、`sharedAmount`（＋自訂分攤標示）。讀取 `expense.splitDetail`。 |
| `lib/hooks/useSettlement.ts` | 對應型別新增（additive） |
| `components/v2`／`lib/quick-expense` 型別 | `Member` 帶 `image`；不足以影響 API |

## 7. v1 回歸風險

- rename 只改 v2 文案；common 元件（`image-picker.tsx`、`avatar-picker.tsx`、共用 speech hooks）**不修改**。
- settle API additive；需確認 v1 消費者忽略新欄位仍正常。
- `/api/auth/liff` **不在本次修改範圍**（D14）。
- `components/v2/no-hardcoded-colors.test.ts` 對新元件維持綠。
- v1 保護 diff 指令（基準 `d2eb7e2`）輸出須為空：
  `git diff --name-only d2eb7e2 -- components/v1 components/ui components/expense components/location-picker.tsx prisma`

## 8. 已收斂決策與已知限制

1. **自訂頭像（D14）**：本次只認 LINE 頭像，不動 `app/api/auth/liff`；`V2Avatar` 仍支援三態。存續問題留待 A14b 另案。
2. **A2 內容模板（D16）**：採 §3 的範例字組（輸入頁 placeholder 與 chips）。
3. **A5 結果頁標題（D15）**：「AI 辨識結果」。
4. **C2 重看導覽**：已知限制（v2 無導覽），本次不改；未來若要補導覽，另立里程碑。
5. **D1**：6 個未開發 v2 頁面（匯率／歷史紀錄／匯出／筆記／消費地圖／照片牆）由你另行處理，本 spec 不動。

## 9. 給 Claude Design 的同步項目

見 `design/project-v20261004/claude-design-sync-prompts-2.md`，涵蓋：AddExpense/EditExpense/VoiceExpense 金額卡與幣別、付款成員、個人項目 `$`、分攤總結、v2 圖片選擇器、Settle 的 banner/支持卡/計算過程、Members 加入方式連結、Trip 特殊返回鍵、Camera 相機流程、GeneralSettings 文案。
