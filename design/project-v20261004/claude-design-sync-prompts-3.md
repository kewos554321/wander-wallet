# Claude Design 同步提示 3 — 以程式最終樣貌為準（v20261004）

用法：把每一條 text 區塊整段貼給 Claude Design。路徑都相對於 `design/project-v20261004/`。
來源：實作完成後，逐一比對 `.dc.html` board 與 v2 程式的最終差異。
說明：本檔取代 `claude-design-sync-prompts-2.md` 的同名項目（內容相同、但以最終程式細節為準）。**只改設計稿，讓設計稿 = 程式最終樣貌。**

---

## 1a — 付款成員卡（付款人 → 付款成員、單一付款人）

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
修改上述 board 的付款卡：
1. 標題「付款人」改為「付款成員」。
2. 付款明細標題列移除「全選」。
3. 只保留「一位」付款人的金額列，移除第二位付款人那列；摘要改「已選 1 人」。
4. 移除付款列上的 pin 與移除(–)按鈕。
5. 選中付款人列：名稱可 truncate（過長省略），右側金額不壓縮。
```

---

## 1b — 金額卡與計算機（輸入金額卡一律深綠）

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
修改上述 board 的「輸入金額」卡，讓它與計算機同一張卡面：
1. 關閉（輸入金額）與展開（計算機）兩種狀態都使用深綠卡面（bg-v2-lake、border-v2-lake）。
2. 標題「輸入金額」一律白字（text-v2-paper）；展開時可略降不透明度。
3. 金額輸入數字改白字（text-v2-paper），placeholder 用淡白。
4. 幣別選單改成白色 pill（白底、深綠字），與計算機的白鍵一致。
5.「計算機」切換鈕維持白底（paper）。
6. 展開計算機時仍隱藏金額/幣別輸入、只顯示計算機；結果行不含幣別（維持現狀）。
```

---

## 1c — 分攤：明細表出現時機與文字總結

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
修改上述 board 的分攤區塊：
1. 「個人項目」金額輸入框前加 `$` 前綴；共同分攤「剩餘應攤分金額」用 `$…`（非 NT$）。
2. 「分攤明細」表只在「先扣個人項目」開關「開啟」時出現（開關一開就切換，不必先選成員或填項目）。開關關閉時不顯示表格。
3. 表格出現時：「已選 N 人」那行不顯示；表格保留「合計」列；表格下方依序放文字總結（個人項目 $X（n 項）＋ 共同分攤 $Y（m 人）= $S / $A）與「金額相符 ✓」。
4. 開關關閉（或金額 0 等退化情況）時：顯示「已選 N 人 + 金額相符」一行，其下為文字總結；此時文字總結「不要」含個人項目，只顯示「共同分攤 $Y（m 人）= $S / $A」。
5. 「分攤明細」表若某位成員的小計為 0，隱藏該列。
6. AddExpense-section-demo / EditExpense-section-demo 目前沒有分攤明細表，請補上（依上述規則）。
```

---

## 1d — 收據／消費圖片：單一按鈕 + 底部彈出

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
把「收據/消費圖片」的兩個虛線磚（拍照／選擇圖片）改成與程式一致：
一個整寬的「新增圖片」按鈕；點擊後在卡片內展開一個選單，含「拍照」與「從相簿選擇」兩個選項（v2 token 樣式）。
```

---

## 2 — 結算：廣告 banner 置頂＋精簡支持卡

**目標檔案**：`Settle-sections.dc.html`

```text
1. 在 top bar 之下、計算總覽卡片之上，加入廣告 banner 區塊。
2. 在「查看統計」連結下方，加入精簡版「支持我們」卡：小 padding、32px 圖示、標題 13px + 副標 11px，四個 11px 按鈕（Buy Me a Coffee／Ko-fi／PayPal／其他方式）排成「單列」、無內文段落。
3.（若此 board 要完整）補上計算總覽標題列的顯示幣別下拉與匯率說明卡。
```

---

## 3 — 結算計算過程對話框

**目標檔案**：`SettleCalcDialog-after.dc.html`

```text
1. 卡片右上補一個圓形關閉 X，標題右側預留空間避免重疊。
2. Step 1「支出明細」每列的「付款：」前加一個 16px 圓形頭像。
3. 分攤行改成結構化摘要（以專案幣別）：
   - 有個人項目/指定金額時，逐位成員顯示「個人（項目名 金額…）」＋「共同 金額」或「指定 金額」，成員間以「；」分隔。
   - 只有均分且無結構時，才用「金額（總額 ÷ n）」。
```

---

## 4 — 成員頁

**目標檔案**：`Members-sections.dc.html`

```text
1. 把「前往專案設定修改加入方式」從成員卡內移出，改成成員卡「下方」的獨立設定卡列（icon + 標題「前往專案設定修改加入方式」+ 副標「調整成員如何加入這趟旅程」+ 右側 chevron）；原「成員組成」列只留旅伴數。
2. 成員列改顯示真實圓形頭像（無圖時才用首字）；佔位成員維持人形 icon。
```

---

## 5 — 旅程總覽返回鍵

**目標檔案**：`Trip-m0lh.dc.html`

```text
左上返回鍵改成「資料夾」圖示、語意為「回旅程列表」（固定回旅程列表，不吃瀏覽器上一頁）；右上使用者改顯示真實圓形頭像（fallback 首字）。
```

---

## 6 — 拍照記帳（相機頁）

**目標檔案**：`Camera.dc.html`

```text
1. 移除右上角的裝飾 icon（改為空白佔位）。
2. 移除底部「改用手動輸入」。
3. 關閉（X）代表回到「AI 快速記帳」輸入畫面，不是關閉整個流程。
```

---

## 7 — AI 快速記帳（輸入頁）

**目標檔案**：`VoiceExpenseInput.dc.html`

```text
1. 引導說明移到 section 標題「說出或輸入消費內容」正下方，文字改為「支援一次多筆；點麥克風可語音輸入」。
2. 輸入框 placeholder 改為「例如：晚餐 600 大家分、我付 800 小明 480」。
3. 範例 chips 增加第四個：早餐 100 我付／晚餐 600 大家分／計程車 250 小明付／超市 1280 我付 800、小明 480。
```

---

## 8 — AI 快速記帳（結果頁）

**目標檔案**：`VoiceExpense-ngs7.dc.html`

```text
1. 結果頁標題由「AI 快速記帳」改為「AI 辨識結果」（輸入頁標題維持「AI 快速記帳」）。
2. 每筆項目的分攤區塊改用與新增／編輯支出「完全相同」的樣式（重用同一元件）：先扣個人項目開關、個人項目清單、共同分攤、分攤明細表、表下文字總結、金額相符；預設為均分、個人項目未開啟。移除舊版「幫誰付？（N 人均分 · 每人 X）」樣式。
3. 批次總額改為「各筆金額以 · 串接」（例：TWD 210 · JPY 500），不是單一加總。
4. 進度 dots 兩側加上「上一筆／下一筆」箭頭按鈕（第一/最後一筆時對應鈕 disabled）。
5. 其餘付款成員/金額卡/圖片變更同 1a–1d。
```

---

## 9 — 通用設定：記帳偏好說明

**目標檔案**：`GeneralSettings.dc.html`

```text
把「記帳偏好」卡內的說明由「新增支出時優先使用此幣別」改為「建立新專案時預設使用的幣別；專案內以結算幣別為準」，並移到卡片標題正下方（在「預設幣別」控制項之前）。
```

---

## 10 — 支出列表篩選：付款人 → 付款成員

**目標檔案**：`ExpenseList-sections.dc.html`、`FilterDropdowns-test.dc.html`

```text
把所有「付款人」字樣改為「付款成員」（chip 標籤與下拉標題「選擇付款人」→「選擇付款成員」）。
```

---

## 11 — 頭像改為真實圓形圖片

**目標檔案**：`MainCard3-njus.dc.html`、`Trip-m0lh.dc.html`、`Stats-sections.dc.html`、`Members-sections.dc.html`、`ExpenseList-sections.dc.html`

```text
所有「使用者／成員」的圓形頭像改為真實圖片（圓形裁切），無圖時才顯示姓氏首字。
適用：MainCard3 右上使用者、Trip-m0lh 右上、Stats 成員排行、Members 成員列、ExpenseList 付款人/分攤者 chip。
注意：MainCard3 的「旅程卡成員 stack」在程式中仍用首字，維持不變、不要改成圖片。
```

---

## 不需改設計稿

- 全部支出的「付款日期」下拉定位（程式改 fixed + 視窗翻轉/夾邊）：外觀不變。
