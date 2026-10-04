# Claude Design 同步提示 2 — 功能測試回饋修正（v20261004）

用法：把每一條「text 區塊」整段貼給 Claude Design。路徑都相對於 `design/project-v20261004/`。
來源：`enhancement-based-on-testing.md`；決策對照 `docs/superpowers/specs/2026-10-04-ui-v2-test-findings-design.md`。
原則：只改設計稿，使其 = v2 程式修正後的最終樣貌。**精準、少字**。

---

## 1 — 金額卡與計算機統一、幣別要明顯

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
修改上述 board 的「輸入金額」卡：
1. 目前輸入態（淺色）與計算機展開態（整卡變深色、字級變小）差異過大，請統一成同一套卡面與字體字級，展開計算機不要像換了一個元件。
2. 幣別要明顯：金額旁加一個清楚的幣別區塊（例：TWD 標籤／符號），輸入態與計算機展開態都要看得到當前幣別。
3. 計算機展開時仍要能看到「目前金額」與幣別，不要整個被取代。
```

---

## 2 — 「付款人」改名為「付款成員」

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`、`ExpenseList-sections.dc.html`、`FilterDropdowns-test.dc.html`

```text
把所有面向使用者的「付款人」文案改為「付款成員」（付款卡的 section 標題、篩選 chip 與下拉標題、快速記帳提示）。其餘文字不動。
```

---

## 3 — 個人項目金額補上 `$`

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`

```text
「個人項目」的名稱／金額輸入列，金額欄位請補上 `$` 前綴，與相鄰的金額欄位（每人小計、共同分攤）一致。
```

---

## 4 — 有分攤明細時，隱藏共同分攤下方文字總結

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`

```text
當頁面出現「分攤明細」表時，請移除「共同分攤」區塊下方那一行文字方程式（例：個人項目 $… ＋ 共同分攤 $… = $… / $…）。
若為純均分（沒有分攤明細表），才保留該行作為總結。
付款卡的付款明細 footer 與分攤明細表都保留。
```

---

## 5 — 收費／消費圖片：新的 v2 圖片選擇器

**目標檔案**：`AddExpense-ngs7-sections.dc.html`、`AddExpense-section-demo.dc.html`、`EditExpense-ngs7-sections.dc.html`、`EditExpense-section-demo.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
「收據/消費圖片」目前樣式與其他 v2 元件不一致。請重畫此區塊，對齊 v2 語彙：
- 用 v2 卡片圓角/色票（paper/surface/line/lake），不要 v1 的 slate 灰框。
- 點擊後以底部彈出（bottom sheet）提供「拍照」與「從相簿選擇」兩個選項。
- 錯誤用 v2 提示樣式，不要用瀏覽器 alert 的觀感。
- 與快速記帳的相機頁（Camera.dc.html）視覺一致。
```

---

## 6 — 結算：廣告 banner 移到最上方、支持區塊縮小

**目標檔案**：`Settle-sections.dc.html`

```text
1. 廣告 banner 移到頁面最上方（top bar 之下、計算總覽卡片之上）。
2. 「支持我們」贊助區塊縮小：降低留白、改成單列 icon 按鈕、標題縮小，不要太佔版面。
```

---

## 7 — 結算計算過程：支出明細顯示付款成員與分攤結構

**目標檔案**：`SettleCalcDialog-after.dc.html`

```text
修改「計算過程」Step 1「支出明細」的每一列：
1. 付款者顯示「付款成員」：頭像 + 名稱。
2. 分攤要反映目前記帳結構：分「個人項目」與「共同分攤」。
   - 個人項目：逐項或收斂為「個人項目 +N 項」，金額以專案幣別。
   - 共同分攤：例「共同分攤 $X」或均分時「N 人均分 $Y」。
3. 數字要總結，不要太細；非均分時不要平鋪一長串金額。
4. 多幣別時沿用「原幣 → 換算幣」顯示。
```

---

## 8 — 成員頁：加入方式連結移出成員卡

**目標檔案**：`Members-sections.dc.html`

```text
「前往專案設定修改加入方式」目前緊貼在「分享／增加成員」按鈕下方，容易誤按。
請把它移出成員卡，獨立成一列設定項（icon + 標題 + 說明 + chevron），放在成員卡之後，並與上方按鈕有明顯分隔。
```

---

## 9 — 旅程總覽：專屬「回旅程列表」按鈕

**目標檔案**：`Trip-m0lh.dc.html`

```text
旅程總覽（旅程首頁）的返回鍵改成「專屬回首頁」樣式：用資料夾／首頁圖示（不是一般返回箭頭），語意為回到旅程列表，不受瀏覽器上一頁影響。
其他子頁仍維持一般返回箭頭。
```

---

## 10 — AI 快速記帳：標題、說明位置、相機流程

**目標檔案**：`Camera.dc.html`、`VoiceExpenseInput.dc.html`、`VoiceExpense-ngs7.dc.html`

```text
1. 快速記帳「輸入頁」與「結果頁」目前標題都叫「AI 快速記帳」。結果頁改用不同標題（例：確認支出）。
2. 輸入頁的引導說明移到 section 標題下方，並精簡用字（不要長段落佔版面）。
3. 相機頁簡化：
   - 進入即為相機，移除多餘的右上裝飾 icon。
   - 移除「改用手動輸入」。
   - 關閉（X）代表回到上一個快速記帳畫面，不是關閉整個流程。
   - iOS 無法自動開鏡頭時，只保留單一「開啟相機」按鈕。
```

---

## 11 — 通用設定：記帳偏好文案與位置

**目標檔案**：`GeneralSettings.dc.html`

```text
「記帳偏好」卡片：說明改為「建立新專案時預設使用的幣別；專案內以結算幣別為準」，並把說明移到卡片標題下方（與其他 section 一致的位置）。
```

---

## 12 — 頭像（選配，讓設計稿 = 程式最終樣貌）

**目標檔案**：`MainCard3-njus.dc.html`、`Trip-m0lh.dc.html`、`AddExpense-*.dc.html`、`EditExpense-*.dc.html`、`VoiceExpense-ngs7.dc.html`、`ExpenseList-sections.dc.html`、`Settle-sections.dc.html`、`Members-sections.dc.html`、`Stats-sections.dc.html`、`GeneralSettings.dc.html`

```text
所有顯示成員／使用者的圓形頭像（成員 chip、付款成員、分攤成員、成員列表、右上使用者、個人資料卡）改為可顯示「真實頭像圖片」：圓形裁切，無圖片時才用姓氏首字 fallback（沿用現有色票）。請在 board 以頭像圖片示意。
```

---

## 不需改設計稿

- 全部支出的「付款日期」下拉溢出：程式改成 `position: fixed` + 視窗翻轉/夾邊，**外觀不變**。
