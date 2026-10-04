# Gap report A5b — 結算 (Settle) + settle dialogs (A26/A27)

Design sources (v20261004):
- `design/project-v20261004/Settle-sections.dc.html` — **CHANGED vs v20261003**. `diff` shows the board differs by exactly **two HTML lines** (52–53): the 日均花費 tile switched from the lake tone to a blue (sky) tone. See Part A.
- `design/project-v20261004/SettleCalcDialog-after.dc.html` — **NEW** (no v20261003 counterpart). 結算｜計算明細 dialog. See Part B.
- `design/project-v20261004/SettleShareDialog-after.dc.html` — **NEW**. 結算｜分享結算結果 dialog. See Part C.

Code under review: `components/v2/settle/{settle-v2,settle-v2-view,settle-summary-grid,settlement-list,sponsor-card}.tsx`.
Dialog code currently in use: shared **v1** `components/settle/{settlement-calc-dialog,share-settlement-dialog}.tsx` (imported by both `components/v1/settle/settle-v1.tsx:22-23` and `components/v2/settle/settle-v2.tsx:6-7`). **Must not be edited** — see §3/§7.

Repo facts used: `rounded-lg` = 10px, `rounded-xl` = 14px, `rounded-2xl` = 16px (`--radius: 0.625rem`, `--radius-xl: calc(var(--radius)+4px)`, `app/globals.css:40-43,61`). Token check for this board: `#E8EEF7` = `--v2-sky-soft`, `#4A6FA5` = `--v2-sky`, `#EAF5F1` = `--v2-lake-soft`, `#D2EAE1` = `--v2-lake-tint`, `#1B5847` = `--v2-lake`, `#FAF7F2` = `--v2-paper`, `#FFFFFF` = `--v2-surface`, `#E7DFD2` = `--v2-line`, `#F0EAE0` = `--v2-line-soft`, `#6E6860` = `--v2-ink-muted`, `#B7AE9D` = `--v2-ink-subtle`, `#9C7A28` = `--v2-gold`, `#C4472F`/`#C0533A` = `--v2-danger`, `#DCEAE3` ≈ `--v2-lake-border` (#DDEDE6). **No token exists for `#D3E0F5` (sky icon circle) or `#06C755` (LINE green).**

Baseline for the non-delta parts of A5b: `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a5-a7.md` §1; milestone decisions D17/D19 apply.

---

## 1. Header

Scope: A5b settle screen + its two dialogs, auditing the v20261004 snapshot against the code on `feat/ui-v2-m6` (base commit `f6f74aa`, "chore: Add v20261004 design canvas snapshot").

- **A5b delta**: one tile recolour. Everything else in the board is byte-identical to v20261003, which was already implemented by `fc9fd89`/`16c5ffb` (see `gap-a5-a7.md` §1); it is out of scope here except where noted.
- **A26/A27**: never existed before, so they are whole-board comparisons against the current v1 dialogs. They are **reachable today** (see §6.1) but render with v1 tokens.
- Protected v1: the dialogs live in `components/settle/**` and are shared with `components/v1/settle/settle-v1.tsx`. Recommendations below create **new v2** dialogs and leave the shared files untouched.

## 2. Gap table

### Part A — `Settle-sections.dc.html` (changed board: delta only)

Delta isolated with `diff design/project-v20261003/Settle-sections.dc.html design/project-v20261004/Settle-sections.dc.html` — only lines 52–53 differ:

```html
<!-- v20261003 -->
<div …padding:12px 4px;border-radius:12px;background:#EAF5F1;">
  <div …border-radius:50%;background:#D2EAE1;…color:#1B5847;>
<!-- v20261004 -->
<div …padding:12px 4px;border-radius:12px;background:#E8EEF7;">
  <div …border-radius:50%;background:#D3E0F5;…color:#4A6FA5;>
```

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---------|--------------------|--------------------------|---------------|
| Summary tile — 日均花費 tone | bg `#E8EEF7`, 32px icon circle bg `#D3E0F5`, icon `#4A6FA5` (`Settle-sections.dc.html:52-53`) | tone `LAKE` = `{ bg: "bg-v2-lake-soft", iconBg: "bg-v2-lake-tint", text: "text-v2-lake" }` — `components/v2/settle/settle-summary-grid.tsx:10,29` | Add `const SKY = { bg: "bg-v2-sky-soft", iconBg: "bg-v2-sky-tint", text: "text-v2-sky" }`; change the 日均花費 tile `tone: LAKE` → `tone: SKY` (line 29). Requires the new `--v2-sky-tint` token (§4). |
| Summary tile — 日均花費 icon | 3-column bar chart (no axis) `M12 20V10M18 20V4M6 20v-6`, 15px `stroke-width:1.7` — `Settle-sections.dc.html:54` (identical in v20261003) | `TrendingUp` — `settle-summary-grid.tsx:1,29` | **Pre-existing, not part of this delta.** Optional while touching the tile: swap to `ChartNoAxesColumn` (lucide 0.548.0 has it; paths `M5 21v-6 M12 21V3 M19 21V9`, visually equal). Mark low priority. |
| Everything else (top bar, 計算總覽 card frame/heading, 支出筆數/總金額/人均 tones, 轉帳建議 card, action buttons `border-v2-lake-edge bg-v2-lake-soft`, transfer rows 26px avatars + `stroke-width:2.2` arrow, 查看統計 link) | unchanged vs v20261003 | already implemented | **no change** for this delta pass; do not re-open previously assessed items (`gap-a5-a7.md` §1). |

Both changed values resolve to `--v2-sky-soft`/`--v2-sky` (existing) except the icon circle `#D3E0F5`, which needs `--v2-sky-tint`. No `#hex`, `bg-white`/`text-white`, or `dark:` is introduced.

### Part B — `SettleCalcDialog-after.dc.html` (new board): 計算過程 dialog

Current implementation is `components/settle/settlement-calc-dialog.tsx` (shared v1), rendered by `settle-v2.tsx:66` with `open={showCalc}`. It is styled entirely with v1/shadcn tokens and portals outside `[data-ui="v2"]`, so `bg-v2-*` would not resolve inside it. Recommended: a new `components/v2/settle/settle-calc-dialog.tsx` rendering inline (no Portal) inside the `UiV2Scope` tree.

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---------|--------------------|--------------------------|---------------|
| Overlay | `background:rgba(27,24,21,.5)` (`SettleCalcDialog-after.dc.html:20`) | shadcn `DialogOverlay` = `fixed inset-0 bg-black/50` — `components/ui/dialog.tsx:41` | New inline overlay `fixed inset-0 z-50 flex items-center justify-center bg-v2-overlay` (pattern: `project-settings/delete-project-sheet.tsx:26`). Colour differs (`rgb(0 0 0/.4)`); **accepted deviation**. |
| Card frame | `width:350px; max-height:1080px; overflow-y:auto; background:#FFFFFF; border-radius:20px; padding:22px` (`:22`) | `DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"` with `bg-background` + `rounded-lg` + `p-6` — `settlement-calc-dialog.tsx:29` | `w-[350px] max-w-[calc(100vw-40px)] max-h-[85vh] overflow-y-auto rounded-[20px] bg-v2-surface p-[22px]` |
| Title | serif 700 17px, receipt icon 18px `stroke:#1B5847;stroke-width:2` (`:24-27`) | `DialogTitle flex items-center gap-2` + `Calculator h-5 w-5` (v1 colour) — `:31-34` | `flex items-center gap-2 font-v2-serif text-[17px] font-bold`, icon `text-v2-lake` 18px `h-[18px] w-[18px]` `strokeWidth={2}`. Icon is a receipt, not `Calculator`; use `ReceiptText` (or `Receipt`). |
| Step badge | 24px circle `background:#1B5847; color:#FAF7F2; font-size:13px; font-weight:700` (`:30,47,73`) | `h-6 w-6 rounded-full bg-brand-500 text-white text-sm font-bold` — `:40,105,146` | `flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v2-lake text-[13px] font-bold text-v2-paper` |
| Step 1 heading | `支出明細（共 3 筆）` 13/700 lake, badge + text in one row, `margin-bottom:10px` (`:29-32`) | heading `<h3 className="font-semibold">` + separate `<span className="text-xs text-muted-foreground">（共 N 筆）</span>` — `:41-42` | Single `<p className="m-0 text-[13px] font-bold text-v2-lake">支出明細（共 {n} 筆）</p>` |
| Step 1 list | `margin:0 0 18px 32px`; items `background:#FAF7F2; border-radius:10px; padding:9px 12px`, gap 6, `max-height:150px; overflow-y:auto` (`:33-44`) | `ml-8 space-y-2 max-h-48`, items `bg-slate-50 dark:bg-slate-900 rounded-lg p-3` — `:44-48` | Container `ml-8 mb-[18px] flex max-h-[150px] flex-col gap-1.5 overflow-y-auto v2-scroll`; item `rounded-[10px] bg-v2-paper px-3 py-[9px]` |
| Step 1 line 1 | `一蘭拉麵晚餐 · $1,280` → description 13/600 + ` · ` + amount (`:35`) | `flex justify-between` description (`font-medium`) / amount (`text-primary`) — `:49-58` | One 13/600 line `text-[13px] font-semibold`: `{description} · {formatCurrency(convertedAmount)}` (D17 keeps `TWD 1,280`, not `$1,280`). |
| Step 1 付款 line | `付款：志明` 11px lake (`:36`) | `text-green-600` — `:61` | `text-[11px] text-v2-lake` |
| Step 1 分攤 line | `分攤：$320（1280 ÷ 4）` 11px gold (`:37`) | `text-amber-600` + rounded-division prefix + full participant list with per-person shares — `:65-90` | `text-[11px] text-v2-gold`; design shows a **single per-person share + division**. See §6.3 (unequal splits). |
| Step 2 table frame/header | `background:#FAF7F2; border-radius:10px`, header row `background:#EAF5F1`, cells 11px lake `padding:7px 8px` (`:50-56`) | `bg-slate-50 rounded-lg overflow-hidden`; `thead bg-slate-100` with green/amber headers — `:109-117` | `ml-8 rounded-[10px] bg-v2-paper`; header `bg-v2-lake-soft`, all cells `px-2 py-[7px] text-[11px] text-v2-lake` (design left-aligns all four; current right-aligns 3 — match design) |
| Step 2 body cells | 12px; 已付 lake, 應付 gold, 餘額 lake (positive) / `#C0533A` (negative) (`:57-68`) | `text-green-600` / `text-amber-600` / `text-green-600`/`text-red-600` — `:122-131` | `text-[12px]`; 已付 `text-v2-lake`, 應付 `text-v2-gold`, 餘額 `text-v2-lake` when ≥ 0 else `text-v2-danger` |
| Step 2 note | `餘額 = 已付金額 − 應付金額（正數表示應收回，負數表示需付出）` 10px `#A79F8F`, `margin:0 0 18px 32px` (`:70`) | `text-xs text-muted-foreground mt-2` — `:137-139` | `ml-8 mb-[18px] text-[10px] text-v2-ink-subtle` |
| Step 3 plan box | `background:#EAF5F1; border-radius:10px; padding:10px 12px; margin-left:32px` (`:76`) | `bg-green-50 dark:bg-green-950 rounded-lg p-3` — `:152` | `ml-8 rounded-[10px] bg-v2-lake-soft px-3 py-2.5`; keep a per-row separator only if >1 settlement |
| Step 3 row | `1.` subtle · from `#C0533A` · arrow `#6E6860` · to lake · amount right 700 lake (`:77-83`) | `text-red-600`/`text-green-600` names, `text-primary` amount — `:154-162` | from `text-v2-danger`, to `text-v2-lake`, arrow `text-v2-ink-muted` 13px, amount `font-bold text-v2-lake` |
| Step 3 note | `以上為最少轉帳次數的結算方案，共需 1 筆轉帳` 10px subtle (`:85`) | `text-xs text-muted-foreground mt-2` — `:165-167` | `ml-8 mt-1.5 text-[10px] text-v2-ink-subtle` |
| Empty plan (all settled) | not drawn in board | green `CheckCircle2` box — `:169-176` | Keep behaviour; restyle to `bg-v2-lake-soft text-v2-lake` (no v1 green) |
| Dismiss | board shows no close control; overlay is dimmed (`:20`) | Radix renders an X button + Esc + overlay click — `dialog.tsx:57-64` | New overlay: click-overlay + Esc via `useDismiss` (`components/v2/use-dismiss.ts`). **Open question**: add an X for discoverability or match the board (no X) — see §6.4. |

### Part C — `SettleShareDialog-after.dc.html` (new board): 分享結算結果 dialog

Current implementation is `components/settle/share-settlement-dialog.tsx` (shared v1), rendered by `settle-v2.tsx:65` with `open={showShare}`. Recommended: a new `components/v2/settle/settle-share-dialog.tsx` rendered inline.

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---------|--------------------|--------------------------|---------------|
| Overlay | `rgba(27,24,21,.5)` (`SettleShareDialog-after.dc.html:19`) | `DialogOverlay bg-black/50` — `components/ui/dialog.tsx:41` | Same as A26: `bg-v2-overlay` (accepted deviation) |
| Card frame | `width:340px; background:#FFFFFF; border-radius:20px; padding:22px` (`:21`) | `DialogContent className="sm:max-w-md"` (`bg-background rounded-lg p-6`) — `share-settlement-dialog.tsx:45` | `w-[340px] max-w-[calc(100vw-40px)] rounded-[20px] bg-v2-surface p-[22px]` |
| Title | `分享結算結果` serif 700 17px (`:23`) | `DialogTitle` (v1 16px sans) — `:47` | `font-v2-serif text-[17px] font-bold` |
| Preview box | `background:#EAF5F1; border:1px solid #DCEAE3; border-radius:12px; padding:13px; font-size:13px; line-height:1.7; white-space:pre-line; max-height:150px; overflow-y:auto; margin-bottom:18px; color:#1B1815` (`:25`) | `bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm whitespace-pre-line max-h-48` — `:51` | `mb-[18px] max-h-[150px] overflow-y-auto whitespace-pre-line rounded-[12px] border border-v2-lake-border bg-v2-lake-soft p-[13px] text-[13px] leading-[1.7] text-v2-ink` |
| 複製文字 button | `flex:1; height:44px; border-radius:12px; border:1px solid #E7DFD2; background:#FFFFFF; color:#6E6860; font-size:13px; font-weight:600`, Copy icon 14px (`:32-33`) | v1 `Button variant="outline" className="flex-1 gap-2"` — `:56-72` | `flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-v2-line bg-v2-surface text-[13px] font-semibold text-v2-ink-muted`; icon `h-3.5 w-3.5` |
| LINE 分享 button | `flex:1; height:44px; border-radius:12px; background:#06C755; color:#FFFFFF; font-size:13px; font-weight:700`, LINE svg 15px (`:36-37`) | v1 `Button className="flex-1 gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white"` — `:73-81` | `flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-v2-line-green text-[13px] font-bold text-v2-on-lake`; svg `h-[15px] w-[15px]`. Needs new `--v2-line-green` (§4); `text-white` is banned in v2, so `text-v2-on-lake`. |
| Copied state | not drawn | "已複製" + `Check` green — `:61-65` | Keep the behaviour (`已複製`, 2s); use `text-v2-lake` for the check, not `text-green-500`. |

## 3. Files to modify

Allowed set only (`components/v2/**`, `app/globals.css` additive tokens, `tests/**`):

- `components/v2/settle/settle-summary-grid.tsx` — add `SKY` tone, switch 日均花費 `tone: LAKE → SKY`; optionally swap `TrendingUp → ChartNoAxesColumn`.
- `components/v2/settle/settle-v2.tsx` — import the new v2 dialogs instead of `@/components/settle/*` (`:6-7`); props unchanged (`open`, `onOpenChange`, `data` / `shareText`).
- `components/v2/settle/settle-calc-dialog.tsx` — **CREATE** (A26). Inline overlay; no Portal.
- `components/v2/settle/settle-share-dialog.tsx` — **CREATE** (A27). Inline overlay; no Portal.
- `app/globals.css` — add `--v2-sky-tint` and `--v2-line-green` (+ `@theme inline` mappings) in `[data-ui="v2"]` and `.dark [data-ui="v2"]`.
- `tests/components/v2/settle-v2.test.tsx` — update the two dialog mocks to the new paths (or drop them; dialogs stay closed in these tests).
- `tests/components/v2/settle-dialogs.test.tsx` — **CREATE**.
- `tests/components/v2/v2-tokens.test.ts` — extend `NEW_TOKENS`.

No change: `settle-v2-view.tsx`, `settlement-list.tsx`, `sponsor-card.tsx` structure. **Never touch** `components/settle/{settlement-calc-dialog,share-settlement-dialog}.tsx` (v1-shared).

## 4. New tokens

Add in `app/globals.css` (light `[data-ui="v2"]`, dark `.dark [data-ui="v2"]`, and `@theme inline`):

| Token | Light | Dark (proposal) | Used by |
|---|---|---|---|
| `--v2-sky-tint` | `#D3E0F5` | `#28354A` | A5b 日均花費 32px icon circle (`#D3E0F5`; the tile bg is the existing `--v2-sky-soft`). Dark = one step lighter than `--v2-sky-soft` `#1E2838`, mirroring the lake-soft→lake-tint relationship. |
| `--v2-line-green` | `#06C755` | `#06C755` | A27 `LINE 分享` button background. LINE brand green; kept identical in dark. |

Mappings: `--color-v2-sky-tint: var(--v2-sky-tint);` and `--color-v2-line-green: var(--v2-line-green);`.

Text on the LINE green button reuses the existing `--v2-on-lake` (`text-v2-on-lake`; `#FFFFFF` light) — no new token, and avoids the banned `text-white`.

No other new token is required: every other design colour maps to an existing token (see the header note). `#DCEAE3` → existing `--v2-lake-border` (accepted, 3-hex off); overlay `rgba(27,24,21,.5)` → `--v2-overlay` (accepted); `#C0533A` → `--v2-danger`; `#A79F8F` → `--v2-ink-subtle`.

## 5. Tests to add/update

`tests/components/v2/settle-v2.test.tsx`
- UPDATE: the mocks at `:15-16` currently target `@/components/settle/share-settlement-dialog` and `@/components/settle/settlement-calc-dialog`. After the switch, either retarget them to `@/components/v2/settle/*` or remove them (both dialogs render nothing while `open=false`, and no test clicks 計算說明/分享 on the container).
- KEEP green: "shows the four summary tiles", "keeps the summary heading inside the summary card", "keeps the transfer heading in the same card as the rows", "uses the gold tone for the current user avatar", "wires calc, share, stats link and currency select".
- ADD: the 日均花費 tile icon circle has `bg-v2-sky-tint` and the tile has `bg-v2-sky-soft` (not the lake classes). Suggest adding `data-testid="settle-tile-daily"` to the tile to make the assertion stable.

`tests/components/v2/settle-dialogs.test.tsx` (CREATE; render the two new components directly inside `<UiV2Scope>` so tokens are present)
- A26: renders title `計算過程`; `calculate` step rows; with `expenseDetails` renders `支出明細（共 N 筆）` and `付款：{name}`; table header is `成員/已付/應付/餘額`; negative balance gets `text-v2-danger`; plan row renders `from → to amount` and the `共需 N 筆轉帳` note; clicking the overlay calls `onOpenChange(false)`; Escape calls `onOpenChange(false)`; when `open=false` renders nothing.
- A27: renders title `分享結算結果`; preview contains `shareText`; `複製文字` writes to the clipboard mock and flips to `已複製`; `LINE 分享` calls `window.open("https://line.me/R/share?text=…")` and then `onOpenChange(false)`; overlay click / Escape close; button/label classes contain `bg-v2-line-green` and no raw hex.
- Coverage: both new files must hit ≥90% Lines (milestone rule) — the above cases cover the render branches.

`tests/components/v2/v2-tokens.test.ts`
- ADD `"sky-tint": ["#D3E0F5", "#28354A"]` and `"line-green": ["#06C755", "#06C755"]` to `NEW_TOKENS`.
- The existing assertions for `@theme inline` mappings and the untouched `--v2-lake-border` remain.

`tests/components/v2/no-hardcoded-colors.test.ts` must stay green: the new files use only `*-v2-*` tokens (`bg-v2-line-green`, `text-v2-on-lake`, `bg-v2-lake-soft`, …).

## 6. Open questions / API gaps / UI-only items

1. **Do A26/A27 exist and are they reachable?** Yes. The buttons 計算說明 / 分享 (`settlement-list.tsx:61-68`) call `onShowCalc` / `onShare` (`settle-v2-view.tsx:81-82`), which set `showCalc`/`showShare` in `settle-v2.tsx:20-21,62-63` and render `SettlementCalcDialog`/`ShareSettlementDialog` (`settle-v2.tsx:65-66`). But those are the **v1 shared** components: v1/shadcn tokens, rendered through a Portal outside `[data-ui="v2"]`, so they do not match A26/A27 and cannot be token-styled in place. **No v2 dialog exists yet.** Recommended: new v2 components as in §3.
2. **No API gaps.** `SettleData` already carries everything A26 needs (`balances[].totalPaid/totalShare/balance`, `expenseDetails[].description/convertedAmount/currency/payer/participants[].convertedShareAmount`, `settlements[]`) — `lib/hooks/useSettlement.ts:7-48`. A27 needs only `shareText` (already composed at `useSettlement.ts:91-103`). UI-first; do not touch `app/api/**`.
3. **Unequal-split 分攤 line (A26 step 1).** The design shows one line `分攤：$320（1280 ÷ 4）`, which only represents an equal split. The data model allows arbitrary per-participant `convertedShareAmount`. Options: (a) render the design line only when all shares are equal, else list participants; (b) always list participants (current v1 behaviour). Recommend (a); confirm.
4. **A26/A27 dismiss control.** Neither board draws a close button; only a dimmed overlay. Radix currently provides an X + Esc + overlay click. Recommended v2 UX: overlay click + Esc via `useDismiss`, and (optionally) a small X for discoverability. Decide whether to match the board exactly (no X). This is also an a11y trade-off: a custom inline overlay does **not** give Radix's focus trap / `aria-modal`; add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and focus the card on open.
5. **Amount format.** D17 keeps `formatCurrency` (`TWD 1,280`), so A26/A27 previews will read `TWD …` where the board shows `$…` / `NT$ …`. Accepted deviation (consistent with A5b and v1).
6. **Overlay colour.** `--v2-overlay` (`rgb(0 0 0/.4)` light) vs board `rgba(27,24,21,.5)`. Accepted deviation (existing token).
7. **A5b daily icon.** `TrendingUp` vs the board's 3-column bar chart — pre-existing, not a v20261004 delta. Optional `ChartNoAxesColumn` while editing the tile.
8. **Not in design / kept.** The currency `Select` beside 計算總覽, the 匯率說明 box, the `AdContainer` ad slot, and `SponsorCard` are rendered by `settle-v2-view.tsx:30-44,57-74,92` and are absent from the board. D19 keeps them; leave untouched. (The old `member-balances.tsx` / 各人收支 section was removed in `db40bc3` — not part of these boards.)
9. **`分攤` / `餘額` semantics** are unchanged from v1; only the visual language changes.

## 7. v1 regression risks

- **Shared dialog files.** `components/settle/{settlement-calc-dialog,share-settlement-dialog}.tsx` are imported by `components/v1/settle/settle-v1.tsx:22-23` **and** `components/v2/settle/settle-v2.tsx:6-7`. The plan creates new v2 components and switches only the v2 import — the v1 path and the shared files stay byte-for-byte identical. Verify with the milestone-6 guard: `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib` must be empty.
- **`app/globals.css` is additive only.** Add `--v2-sky-tint` / `--v2-line-green`; do not rename or alter any existing token (e.g. `--v2-lake-border`). `v2-tokens.test.ts` pins the existing values.
- **`settle-summary-grid.tsx` is v2-only** (imported only by `settle-v2-view.tsx`), so the tile recolour has no v1 blast radius.
- **No `components/ui/**` change.** The new dialogs deliberately avoid the shadcn `Dialog` Portal so v2 tokens resolve; `components/ui/dialog.tsx` and `bottom-sheet.tsx` are reused-as-is by v1 and are not edited.
- **`no-hardcoded-colors.test.ts`** scans `components/v2` `.tsx` only; the new files must use `bg-v2-line-green`/`text-v2-on-lake`, never `bg-[#06C755]`/`text-white`. The v1 shared dialog may keep its `#06C755` because it is outside `components/v2`.
- **Tests**: only `tests/components/v2/**` changes; `tests/components/v1/**` untouched.
