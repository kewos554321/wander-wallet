---
target: app/projects/[id]/page.tsx
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/kewos/Documents/projects/wander-wallet/app/projects/[id]/page.tsx"
timestamp: 2026-11-04T12-39-41Z
slug: app-projects-id-page-tsx
---
Method: dual-agent (A: ses_e59719302ffemDiW0nApzPaSio · B: ses_e59719301ffeplrTFkel8LY8rA)

# Design Health Score

| # | 啟發式 | 分數 | 關鍵問題 |
|---|---|---|---|
| 1 | 系統狀態可見性 | 2 | 匯率未載入時 `getRate` 回傳 1（`useCurrencyConversion.ts:92`），總額先以 1:1 顯示再無聲跳動；`hasMixedCurrencies`（`project-overview.ts:112`）算了卻沒顯示 |
| 2 | 系統↔真實世界 | 3 | 文案口語到位；但「旅程總覽」同頁出現 3 次，h1 是泛用頁名、旅程名只是 h2 |
| 3 | 使用者控制與自由 | 2 | 返回鍵是品牌 icon（`project-overview-v2-view.tsx:47`）；支出列點一下直接進編輯（`recent-expenses.tsx:58`）；無復原 |
| 4 | 一致性與標準 | 2 | 加入旅程仍是 v1 彈窗（`project-overview-v2.tsx:7`）；3 套 overlay、3 種頁首、4 種 CTA、23 種字級 |
| 5 | 錯誤預防 | 2 | 加入失敗用 `alert()`（`useProjectOverview.ts:69,72`）；混合幣別與 0 元餘額無說明 |
| 6 | 辨識而非回想 | 2 | 10 個功能有 6 個藏在「更多」（`feature-grid.tsx:99`）；餘額規則藏在 16px 的 ⓘ |
| 7 | 效率與彈性 | 2 | AI／手動雙入口很好；但無「複製上一筆」「只看我的」、無手勢、最近支出固定 5 筆 |
| 8 | 美學與極簡 | 3 | 版面節制、金額排版優秀；但兩個標題、兩顆浮動 CTA、10 宮格搶走主角 |
| 9 | 錯誤辨識與復原 | 1 | 任何失敗（含網路錯誤）都顯示「專案不存在」，無重試（`project-overview-v2.tsx:51`） |
| 10 | 說明與文件 | 2 | 一次性 7 步導覽＋可折疊 tooltip，無常駐說明 |
| **總計** | | **21/40** | **Acceptable（下緣）** |

# Design Specificity Verdict

**LLM 評估：約 65% 屬於品類通用。** 系統層有作者感：深湖綠 × 和紙底 × Noto Serif TC 金額、封面插畫、日式色名。但「旅程總覽」這一頁換成任何分帳 App 都成立：金額卡＋餘額卡＋10 宮格＋最近列表＋兩顆 FAB。清單頁承諾「每一趟旅程，都值得被好好記住」（`projects-v2-view.tsx:64`），詳情頁卻只剩一張發票。

**確定性掃描：detector 回報 0 findings，但這是 false negative。** 它無法讀取帶括號的目標路徑（`cannot access app/projects/[id]/page.tsx`），只掃到 `components/v2/project` 且無命中；同一批檔案人工量到 AA 對比失敗、16–36px 觸控目標、23 種字級，規則均未回報。**不可把 0 findings 當成 a11y／一致性通過。**

**視覺 overlay：** 本 session 無瀏覽器自動化，未注入、無 overlay；以上全為原始碼與 token 量測。

# 風格一致性：這次最重要的答案

**色票與 token 紀律已經很好，但「元件與尺度」還沒統一。** `components/v2` 共 101 個 `.tsx`：**0 個 hex、0 個 Tailwind 具名色（slate/blue/gray/white）、0 個 arbitrary radius**，1,286 次 v2 token utility。上一輪的三個問題已修好：

- ✅ 預算超支不再截在 100%，`budgetProgress` 保留真實比率（`project-overview.ts:79`），超支段獨立顯示（`trip-summary-card.tsx:46-57`）。
- ✅ 「分享」已改成 v2 底部 sheet（`invite-sheet-v2.tsx`），不再是 v1 shadcn 彈窗。
- ✅ 互動回饋與 `motion-reduce` 已補上（`globals.css:220` 全域安全網）。

**還沒統一的四類：**

1. **v1 破口仍在「第一次加入旅程」**：`project-overview-v2.tsx:7` 仍載入 `components/project/join-project-dialog.tsx`——slate 邊框、簡體「專案創建者」、36px shadcn 按鈕，且 Dialog portal 到 `<body>`（`components/ui/dialog.tsx:63`），逃出 `[data-ui="v2"]` 的色票、字型與 reduced-motion。日期 popover 也走同一條 portal 路徑。
2. **微觀尺度碎片化**：v2 有 23 種實際字級（6–36px），63/101 檔使用 `text-[Npx]`；18 種 arbitrary 間距（40 檔）；4 個 radius token 外仍有 6 種 legacy 名稱（`rounded-2xl` 32 次、`rounded-xl` 20 次等）。`invite-sheet-v2.tsx` 單檔用 7 種字級。
3. **同一角色多種長相**：3 種頁首標題處理、4 種主按鈕、3 套 overlay、2 套空狀態、支出卡有 `ChevronRight` 但同構的最近支出列沒有。
4. **金額與術語規則不一致**：概覽寫 `TWD 1,234`，記帳／分帳寫硬編 `$1,234`（`split-panel.tsx:90`，即使幣別是 JPY 也印 `$`）；「專案／旅程／行程」「旅伴／成員／參與者」並用，目標頁自己就有「專案不存在」對「旅程總覽」。

# Overall Impression

看起來像設計過的旅遊記帳 app，但沒有回答「我現在欠誰、要不要付」。戲劇性給了團體總花費，付款入口是一行 12px 連結。最大機會仍是把「我的餘額 → 前往結算」做成主角。

# What's Working

1. **金錢排版**：襯線大數字＋`tabular-nums`＋深湖綠底，總額／人均／預算剩餘三層一次到位（`trip-summary-card.tsx:41-73`）。
2. **支出的社交密度**：付款人＋分攤人頭像＋「共 N 人分攤」，一眼回答「誰在場」（`recent-expenses.tsx:75-109`）。
3. **無障礙底子**：`focus-visible` 環、Sheet 有 focus trap＋`aria-modal`＋Escape、全域 reduced-motion 安全網，高於同類產品平均。

# Priority Issues

## P0｜首屏總額可能說謊

`getRate` 在匯率未載入時回傳 1（`useCurrencyConversion.ts:92`），`convert` 直接乘（:106）；`useProjectOverview.ts:19` 只取 `convert`，沒有等 `loading`，總覽照常渲染。一趟 ¥120,000 的旅程會先顯示「TWD 120,000」再無提示跳成 TWD 25,000。`hasMixedCurrencies` 從未使用。

**修法**：匯率載入中顯示數字骨架或「換算中」；載入後在 hero 加一行「含 3 種幣別，依 11/04 匯率換算」；備援匯率要明說。
**指令**：`/impeccable harden`

## P1｜「我該付多少」被降級成 12px 連結

`balance-card.tsx:29-35` 是整頁唯一的「錢的動作」，卻與說明 icon 同層；`+TWD 4,820` 沒有主詞，0 元沒有結局（:37-40）。

**修法**：改成一句人話（「志明欠你 TWD 4,820」／「你欠 2 人共 TWD 1,200」）＋主要按鈕「去結算」；0 元顯示「這趟已結清」。
**指令**：`/impeccable clarify`

## P1｜加入旅程那一刻不屬於 v2

`project-overview-v2.tsx:7` 仍載入 v1 `JoinProjectDialog`：置中、slate 邊框、簡體「專案創建者」、36px 按鈕，portal 後拿到 v1 青綠與 Geist 字型（`components/ui/dialog.tsx:63`）。這是新成員第一眼看到的畫面。

**修法**：改用 `ui/sheet.tsx` 底部 sheet（與邀請、刪除一致），統一「佔位成員」用語與 v2 按鈕；`date-range-field` 的 Popover 同樣指定 v2 portal container。
**指令**：`/impeccable polish`

## P1｜金額格式與術語沒有單一規則

概覽／結算顯示 ISO 代碼 `TWD 1,234`，記帳／分帳顯示硬編 `$1,234`（`split-panel.tsx:90`、`split-summary.tsx:119`、`amount-sheet.tsx:60`）；`currency-field.tsx:27` 又把 TWD 定義成 `$`，與 `formatCurrency` 的 `TWD` 前綴互相矛盾。`Math.round` 也會吃掉 USD/EUR 小數（`trip-summary-card.tsx:17`、`balance-card.tsx:9`）。

**修法**：全站只留一個金額 formatter；`TWD` 顯式寫「TWD」或「NT$」，非 TWD 不印 `$`；術語收斂為「旅程／旅伴」或「專案／成員」單一套。
**指令**：`/impeccable clarify` ＋ `/impeccable polish`

## P2｜可讀性與觸控的細節債

`ink-subtle` 對白底 2.20:1、對紙底 2.06:1（v2 共 91 處）；`check` 1.82:1、`line` 1.32:1（輸入框邊界）、白 icon 在 coral FAB 上 2.70:1；暗色模式 `ink-subtle` 也只有 3.54:1。觸控目標：ⓘ 16px、分享／修改 pill 32px、返回 34px、頭像 36px；`userScalable:false`（`app/layout.tsx:122`）讓 11px 標籤無法放大。

**修法**：`ink-subtle` 只做裝飾（文字改用 `ink-muted`，5.16:1）；控制邊界加深；觸控目標一律 ≥44px；移除 `maximumScale`。
**指令**：`/impeccable audit`

# Persona Red Flags

- **Alex（重度）**：「更多」每次重開；最近支出固定 5 筆；無「只看我的」、無 pull-to-refresh；里程／匯出埋在二層。
- **Jordan（新手）**：品牌 icon 當返回鍵；`+TWD` 語意不明；兩顆新增按鈕不知差別；空狀態說「點右下角」但右下角有兩顆；一進來被 7 步導覽攔截。
- **Casey（手機）**：320px 下旅程名被兩顆 pill 壓到折行；32px pill 相距 6px；FAB `fixed right-4` 脫離 `max-w-md` 內容欄；兩顆浮動按鈕吃掉右下 120px。
- **Sam（無障礙）**：上述對比與觸控問題；禁止縮放；6px 頭像縮寫等於無資訊；v1 彈窗 radio 僅靠 `accent-primary` 表態。

# Minor Observations

1. 「最近支出」其實是「最近新增」（依 `createdAt`），補登舊帳會插到最前。
2. 自訂照片封面在詳情頁完全消失，只處理 icon 封面（`trip-summary-card.tsx:21-24`）。
3. 詳情頁沒有旅程狀態與天數，旅程結束後畫面與第一天一模一樣。
4. 功能名稱與目的地標題不一致：歷史→「歷史紀錄」、照片→「照片牆」、地圖→「消費地圖」。
5. `budget` 為 0 或未設定時整段消失，且沒有「設定預算」入口。
6. 空狀態在總覽沒有 CTA，清單頁卻有——同一產品兩種教法。
7. 骨架缺頁首，載入完成有 CLS（`project-overview-v2.tsx:33-39`）。
8. 日期無年份（`11/12 – 11/16`），跨年或回顧舊旅程時有歧義。
9. 超支進度條的珊瑚段從右側長出，160% 時像另一條獨立條。
10. `/debug`、`/demo` 沒有環境守門，且不在 robots disallow 內。

# Questions to Consider

- 如果這趟旅程已經結束三個月，這個畫面為什麼長得跟第一天完全一樣？「回顧」在哪裡？
- 把顏色與文字全部拿掉，只留版面：這還是 Wander Wallet，還是任何一個 split-bill App？
- 使用者在日本便利商店結帳後 30 秒打開它——第一個動作是「結帳」還是「記一筆」？現在兩個都不是主角。
- 如果只能留一個數字，你會留總花費還是「你還欠 1,200 元」？現在的視覺回答是前者，行為需求是後者。
