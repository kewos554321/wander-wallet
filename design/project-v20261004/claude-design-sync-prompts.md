# Claude Design 同步提示 — v20261004（讓設計稿 = v2 程式最終樣貌）

用法：把每一條「提示」整段貼給 Claude Design。路徑都相對於 `design/project-v20261004/`。
標記：**必改** = 依里程碑 7 已確認的決策；**選配** = 程式刻意偏離設計，建議一併同步。

---

## 必改 1 — A26/A27 對話框加關閉 X

**目標檔案**：`SettleCalcDialog-after.dc.html`、`SettleShareDialog-after.dc.html`

```text
請修改 design/project-v20261004/SettleCalcDialog-after.dc.html 與 SettleShareDialog-after.dc.html：
在對話框卡片加 position:relative，並在卡片右上角新增一個 28×28 圓形關閉鈕。
- SettleCalcDialog：卡片是第 22 行 <div style="width:350px;max-height:1080px;overflow-y:auto;background:#FFFFFF;border-radius:20px;padding:22px;">
- SettleShareDialog：卡片是第 21 行 <div style="width:340px;background:#FFFFFF;border-radius:20px;padding:22px;">
關閉鈕樣式：
  position:absolute; right:14px; top:14px;
  width:28px; height:28px; border-radius:50%;
  background:#F1EBE0; color:#6E6860; border:none;
  display:flex; align-items:center; justify-content:center;
  aria-label="關閉"
內含一個 15px 的 X 圖示（lucide X，stroke-width:2）。
標題（「計算過程」/「分享結算結果」）樣式不動，但右側預留 36px 不與 X 重疊。
```

---

## 必改 2 — A26 非均分分攤顯示

**目標檔案**：`SettleCalcDialog-after.dc.html`

```text
請修改 design/project-v20261004/SettleCalcDialog-after.dc.html 的 Step 1「支出明細」分攤行（第 37 行「分攤：$320（1280 ÷ 4）」、第 42 行「分攤：$3,500（14000 ÷ 4）」）：
1. 均分時維持「分攤：$320（1280 ÷ 4）」。
2. 補一個「非均分」狀態示意（可加在第 3 筆，或於同一卡片下方加一行註記）：非均分時改為逐位成員列出，例如「分攤：小雨 $300、志明 $980」。
```

---

## 必改 3 — A6b 已選取且展開的 chip 只顯示 badge

**目標檔案**：`FilterDropdowns-test.dc.html`

```text
請修改 design/project-v20261004/FilterDropdowns-test.dc.html：
「已選取且展開」的篩選 chip，移除展開狀態的旋轉 chevron（transform:rotate(180deg) 的 svg），只保留筆數 badge。
- 類別展開：第 40–45 行，刪除第 44 行的旋轉 chevron。
- 付款人展開：約第 135–145 行，刪除第 145 行的旋轉 chevron。
- 參與者展開：約第 206–220 行，刪除第 220 行的旋轉 chevron。
（未選取、未展開的 idle chip，仍保留向下的 chevron。）
原因：程式先不做「active+open 同時顯示 badge 與 chevron」。
```

---

## 必改 4 — 12px 輸入框一致性

**目標檔案**：`NewProject-sections-demo.dc.html`（A9b）、`ProjectSettings.dc.html`（A13）、`GeneralSettings.dc.html`（A14）

```text
請檢查並統一 design/project-v20261004 下列 board 的 paper 輸入框 border-radius 為 12px（若有非 12px 者改為 12px）：
- A9b NewProject-sections-demo.dc.html：基本資訊的「旅程名稱」輸入框、預算輸入框、描述 textarea、日期下拉、結算幣別下拉、加入方式選項卡。
- A13 ProjectSettings.dc.html：描述 textarea、預算輸入框、匯率輸入框。
- A14 GeneralSettings.dc.html：記帳偏好幣別下拉。
（目前設計稿多為 12px，此為一致性確認；不確定者請標成 12px。）
```

---

## 必改 5 — 付款人卡改單一付款人

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
請把以下 board 的「付款人」卡改成單一付款人（與程式一致）：
- AddExpense-ngs7-sections.dc.html（A3d）：卡片在第 109–179 行。
- AddExpense-section-demo.dc.html（A3b）。
- EditExpense-ngs7-sections.dc.html（A21d）。
- EditExpense-section-demo.dc.html（A21b）。
- VoiceExpense-ngs7.dc.html（A12b）：卡片約在第 138–200 行。

修改內容：
1. 移除「全選」文字：A3d 第 115 行、A3b 第 115 行、A21d 第 100 行、A21b 第 100 行、A12b 第 142 行。
2. 付款明細只保留「一位」付款人的金額列；移除第二位付款人那一列（A3d 第 153–165 行的「志明」列），並移除保留列上的 pin 按鈕（A3d 第 145 行）與移除(–)按鈕（A3d 第 148 行）。
3. 付款摘要：
   - A3d「已選 2 人」→「已選 1 人」（第 171 行）；A21d 第 156 行；A12b 第 198 行。
   - 金額行由「$300 + $980 = $1,280 / $1,280」改為單一「$1,280 = $1,280」（A3d 第 177 行；其他 board 同區塊同理）。
4. A12b 的「誰付的錢？」改成單選（一顆選中）。
```

---

## 選配 6 — A12b 分攤區塊簡化（程式暫不支援個人項目/明細表）

**目標檔案**：`VoiceExpense-ngs7.dc.html`

```text
請簡化 design/project-v20261004/VoiceExpense-ngs7.dc.html 的分攤區塊（程式目前只支援均分）：
- 移除「先扣個人項目」toggle（第 212–213 行）。
- 移除「個人項目」清單（第 221 行起）。
- 移除「共同分攤（剩餘應攤分金額 …）」區塊（第 291 行起）。
- 移除「分攤明細」表（第 336 行起，欄位：個人項目／共同分攤／小計）。
- 改為單一「幫誰付？（N 人均分 · 每人 X）」成員 pill 卡，對齊 A3d 的簡化版分攤成員卡。
```

---

## 選配 7 — 金額格式統一為 TWD

**目標檔案**：所有含金額的 board

```text
請把所有 board 的金額顯示由設計稿的「NT$…」「$…」改為程式用的格式「TWD …」：
- 例：NT$1,280 → TWD 1,280；$320 → TWD 320。
- 千分位保留；幣別代碼用大寫三碼（TWD/JPY/USD…）。
適用：MainCard3-njus、Trip-m0lh、AddExpense-*、EditExpense-*、VoiceExpense-*、ExpenseList-sections、Settle-sections、SettleCalcDialog-after、SettleShareDialog-after、Stats-sections 等。
```

---

## 選配 8 — A2 旅程總覽：摘要卡裝飾與預算前綴

**目標檔案**：`Trip-m0lh.dc.html`

```text
請修改 design/project-v20261004/Trip-m0lh.dc.html：
1. 頂部摘要卡左上的裝飾圖示：改為「跟隨該旅程的封面圖示」（例如封面選相機就顯示相機），而不是固定 Sparkle。
2. 預算行：由「（NT$27,400）」改為「（剩餘 NT$27,400）」；超支時顯示「（超支 NT$…）」。
```

---

## 選配 9 — A14 通用設定加回 Beta 卡

**目標檔案**：`GeneralSettings.dc.html`

```text
請在 design/project-v20261004/GeneralSettings.dc.html 加回「Beta 功能」開關卡（程式保留此推出機制，設計稿原本沒有）。放在其他設定卡之後、頁尾之前。
```

---

## 選配 10 — A5b/A6b 保留設計稿未畫的區塊

**目標檔案**：`Settle-sections.dc.html`、`ExpenseList-sections.dc.html`

```text
程式保留了設計稿未畫的區塊，請在設計稿補上以保持一致：
1. design/project-v20261004/Settle-sections.dc.html：保留「幣別選擇」、「匯率說明」區塊與底部贊助卡（放在轉帳建議卡下方）。
2. design/project-v20261004/ExpenseList-sections.dc.html：保留「多幣別篩選」chip（僅多幣別專案會出現，放在篩選列）。
```
