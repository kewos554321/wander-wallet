---
target: app/projects/[id]/page.tsx
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/kewos/Documents/projects/wander-wallet/app/projects/[id]/page.tsx"
target_fingerprint: "sha256:b315f8ef5cc40e0328d6963758533e4b0d97fe107b72fb14bc69c817bbb353f4"
target_path: /Users/kewos/Documents/projects/wander-wallet/app/projects/[id]/page.tsx
timestamp: 2026-11-04T02-55-12Z
slug: app-projects-id-page-tsx
---
**方法：雙代理（A：設計審查 · B：偵測器＋技術證據）**

# Design Health Score

| # | 啟發式 | 分數 | 關鍵問題 |
|---|---|---|---|
| 1 | 系統狀態可見性 | 2 | 匯率未載入時 `getRate` 直接回傳 1，首屏總額可能把日圓當台幣 |
| 2 | 系統↔真實世界 | 3 | 同頁混用「旅伴」與「成員」；金額寫 `TWD` 而非 `NT$` |
| 3 | 使用者控制與自由 | 2 | 支出列點一下直接進編輯頁；返回鍵是品牌 icon |
| 4 | 一致性與標準 | 2 | 「分享」打開的是 v1 shadcn 彈窗，硬寫 slate/blue |
| 5 | 錯誤預防 | 2 | 混合幣別靜默換算；預算 180% 顯示 100%；加入失敗用 alert |
| 6 | 辨識而非回想 | 2 | 10 個功能有 6 個藏在「更多」；餘額規則藏在 16px ⓘ |
| 7 | 效率與彈性 | 3 | AI 記帳到位，但沒有「複製上一筆」「只看我的」 |
| 8 | 美學與極簡 | 3 | 版面節制；但兩個「旅程總覽」、兩個 FAB |
| 9 | 錯誤辨識與復原 | 1 | 網路失敗顯示「專案不存在」，無重試 |
| 10 | 說明與文件 | 1 | v2 明確關閉 onboarding |
| **總計** | | **21/40** | **Acceptable** |

# Design Specificity Verdict

LLM：70–80% 屬於品類通用。品牌宣稱水浅葱／鴇／胡粉，但 v2 另用 --v2-lake #1B5847 與 --v2-coral #E8825A，色名只活在註解。唯一有作者感的是 trip-summary-card.tsx:24-34（深湖綠卡、襯線金額、封面浮水印）。

確定性掃描：impeccable detect 0 findings（規則覆蓋缺口）。靜態掃描：v2/project 有 94 個 arbitrary values、11 種字級；ui 有 70 次具名色票；4 組對比不合格（最低 1.85:1）；5 個觸控目標 <44px；13/13 互動節點無 transition；prefers-reduced-motion 全 repo 0 次。

# Overall Impression

看起來像設計過的旅遊記帳 app，但沒有回答「我現在欠誰、要不要付」。戲劇性給了團體總花費，付款入口是一行 12px 連結。最大機會是把「我的餘額 → 前往結算」做成主角。

# What's Working

1. 襯線大數字 + 封面浮水印 + tabular-nums。
2. 支出列的社交資訊密度（誰付、幾人分、多少錢）。
3. AI 快速記帳懂 LIFF webview 返回堆疊。

# Priority Issues

## P0 首屏總額可能在說謊
useCurrencyConversion.ts:92 匯率載入前回傳 1；convert 直接乘（:106）；不等匯率就渲染（project-overview-v2-view.tsx:87）；hasMixedCurrencies 未使用。修法：ratesLoading/usingFallback、skeleton、匯率 caption。指令 /impeccable harden。

## P1 付錢入口被降級，0 元沒有結局
balance-card.tsx:29-35 是 12px 連結；金額無動詞對象人數；0 元只顯示 TWD 0；說明對比 2.2:1。修法：人類語言句子、主要按鈕、已結清狀態、text-v2-ink-muted。指令 /impeccable clarify。

## P1 預算超支被抹平
project-overview.ts:79 截在 100；trip-summary-card.tsx:42 再 round；進度條永遠白色。修法：未截斷比率、danger fill、真實百分比。指令 /impeccable colorize。

## P1 分享打開的是另一個產品
invite-dialog.tsx:51-88 硬寫 slate/blue；DialogPortal 掛 body 使 v2 token 失效；clipboard 無 try-catch。修法：改用 v2 sheet、指定 portal container、收斂選項。指令 /impeccable polish。

## P2 微動畫與回饋幾乎不存在
13/13 互動節點無 transition；tw-animate-css 只用在 skeleton；reduced-motion 0 次；FAB 無 safe-area；餘額更新無 aria-live。修法：按壓/進場/數字三種語彙 + motion-reduce。指令 /impeccable animate。

# Persona Red Flags

Alex：常用目的地每次重收「更多」；無「只看我的」；支出列直接進編輯；無 pull-to-refresh。
Jordan：logo 當返回鍵；+TWD 2,400 語意不明；兩顆新增按鈕；無引導。
Casey：32px pill 相距 6px；無行程狀態；skeleton 3 塊對 5 塊；FAB 無 safe-area。

# Minor Observations

1. 兩個「旅程總覽」標題。
2. h1 是泛用頁名，旅程名稱是 h2。
3. 分類色循環導致「地圖」與「餐飲」同為 coral。
4. 三種頁面邊距。
5. 深色模式招牌卡變薄荷綠。
6. bottom-sheet 硬寫 bg-white、無 focus trap。
7. skeleton/badge/bottom-sheet 仍是 v1 灰階。
8. 禁止縮放（WCAG 1.4.4）。
9. 6px/7px 頭像縮寫。
10. 「最近」是「最近新增」。
11. DebugOverlay / UiVersionToggle 在 production tree。

# Questions to Consider

- 拿掉顏色與標籤後，5 秒內知道該做什麼嗎？
- 為什麼記得封面卻忘記旅程狀態？
- 日式色名是品牌，還是只是配色參考？
