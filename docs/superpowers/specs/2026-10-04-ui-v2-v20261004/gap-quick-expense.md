# Diff: 快速記帳 flow — A10 / A11 / A12b (design v20261004 vs. current v2 code)

Design inputs (NEW v20261004 boards):
- A10 `design/project-v20261004/Camera.dc.html` — 拍照記帳（新流程）
- A11 `design/project-v20261004/VoiceExpenseInput.dc.html` — AI 語音記帳（輸入）
- A12b `design/project-v20261004/VoiceExpense-ngs7.dc.html` — AI 語音記帳（批次確認）; template = A3d (`AddExpense-ngs7-sections.dc.html`)

Context boards: `Trip-m0lh.dc.html` (A2, entry point) links to `VoiceExpenseInput.dc.html` via the **AI 快速記帳 FAB** (L237–244). `AddExpense.dc.html` is the A3 form target of the Camera board's gallery/shutter/manual links.

Scope: only `components/v2/**`, `app/globals.css` (ADD v2 tokens only), `tests/**`. **`lib/**` (incl. `lib/speech.ts`, `lib/quick-expense/**`), `app/api/**`, `prisma/**`, `components/ui/**`, `components/expense/**`, `components/location-picker.tsx`, `components/v1/**` must NOT change.** A3d form internals are covered by `2026-10-03-ui-v2-milestone-6/gap-a3.md`; A12b reuses those components, so this report only records quick-flow-specific deltas and reuse notes.

Current flow (verified): `QuickExpenseV2` → step `input` (`quick-input-step.tsx`) → `camera` (`camera-step.tsx`) → `parsing` → `confirm` (`confirm-step.tsx` + `quick-item-card.tsx`) → `saving`. Mounted only from `components/v2/project/project-overview-v2.tsx:50–56` via the overview AI FAB (`quick-actions.tsx`).

---

## A10 — 拍照記帳 (`components/v2/quick-expense/camera-step.tsx`, `use-camera.ts`)

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Root background | `background:#171412` (always-dark camera screen) | `camera-step.tsx:22` `bg-[#10201B] text-white` | add token `--v2-camera-bg` `#171412`; use `bg-v2-camera-bg`. `text-white` → `text-v2-on-dark` (new) or arbitrary `text-[rgba(255,255,255,.92)]` |
| Header order | close (LEFT) · title (CENTER) · 36px AI sparkle circle (RIGHT) | L23–28: title LEFT, close RIGHT | reorder: close button first, title centered, right slot |
| Header title | `font-size:13px;font-weight:600` white, centered | L24 `text-base font-semibold` (16px, left) | `text-[13px] font-semibold` |
| Close button | `36px` circle, `background:rgba(255,255,255,.12)`, X `17px` | L25 `h-9 w-9` (36px) `bg-white/10` | keep 36px; `bg-[rgba(255,255,255,.12)]` (drops `bg-white/10` ban-hit). Move to left |
| AI circle (right) | `36px` circle `rgba(255,255,255,.12)` + sparkle icon `17px`; **`<span>`, not a link** (decorative) | none | add non-interactive 36px circle span `aria-hidden` (or omit; it is decoration) |
| Viewfinder | `margin:12px 24px 0; height:460px`; four 34×34 corner brackets `3px solid #E8825A` (coral), radius 8px; **no rounded frame, no dashed border** | L30–37 `rounded-3xl bg-black`, `absolute inset-8 rounded-2xl border-2 border-dashed border-white/70` (L32) | replace dashed frame with four corner `<span>`s `border-v2-coral`, container `mx-6 mt-3 h-[460px]` |
| Center copy | camera icon `30px`, then `13px` 「將發票或收據置於框內」and `12px` 「AI 會自動辨識金額與商家」, color `rgba(255,255,255,.6)`, centered in frame | L33–36: copy pinned to frame bottom, `text-sm font-semibold` + `text-white/70` | move copy to vertical center; sizes 13px/12px; `text-[rgba(255,255,255,.6)]` |
| Bottom bar | absolute, gradient `linear-gradient(to top, rgba(0,0,0,.55), transparent)`, padding `20px 24px 30px`; gallery 44×44 `radius:12px` `rgba(255,255,255,.14)` + `1px rgba(255,255,255,.25)`; **shutter 70px** white ring `4px rgba(255,255,255,.35)` with **inner 56px coral disc** `#E8825A`; right spacer 44px | L42–63: gallery `h-11 w-11 rounded-full bg-white/15` (L56); shutter `h-16 w-16` (64px) `border-4 border-white bg-white/30`, no inner disc (L59); spacer `h-11 w-11` (L60) | rebuild bottom bar: gradient overlay (absolute), gallery `h-11 w-11 rounded-[12px] bg-[rgba(255,255,255,.14)] border border-[rgba(255,255,255,.25)]`, shutter 70px outer + 56px `bg-v2-coral` inner, spacer 44px |
| 「改用手動輸入」 | absolute `bottom:8px`, centered, `12px`, `rgba(255,255,255,.7)`, no underline | L65 `mb-6 self-center text-sm font-semibold text-white/80 underline` | style to 12px `text-[rgba(255,255,255,.7)]`, no underline, absolute bottom |
| iOS fallback (`mode==="fallback"`) | not drawn (prototype) | L43–53 `開啟相機` / `從相簿選擇` | keep (functional requirement); restyle into the new bottom bar |
| Colour-guard exemption | — | `tests/components/v2/no-hardcoded-colors.test.ts:6` exempts `quick-expense/camera-step.tsx` | after tokenising, **remove the exemption** (see §4/§5) |

## A11 — AI 語音記帳（輸入）(`components/v2/quick-expense/quick-input-step.tsx`)

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Screen bg | `#FAF7F2` (paper) | overlay `quick-expense-v2.tsx:119` `bg-v2-paper` | no change |
| Header order/title | close (LEFT, 32px, `bg #F1EBE0` sand) · serif `17px/600` 「AI 快速記帳」 (CENTER) · 32px spacer (RIGHT) | L26–34: title LEFT with `Sparkles` icon `text-base font-semibold`; close RIGHT `h-9 w-9 bg-v2-lake-soft` | reorder close to left, drop Sparkles, title `font-v2-serif text-[17px] font-semibold`; close `h-8 w-8 rounded-full bg-v2-sand` |
| Card 1 wrapper | `margin:20px 16px 0; background:#FFFFFF; border:1px solid #E7DFD2; border-radius:16px; padding:16px` | L36 `mx-4 mb-4` (no card, no border) | wrap label+textarea+helper in `SECTION_CARD mt-5` (white surface, `border-v2-line`, radius 16, p-4) |
| Card 1 label | 「說出或輸入消費內容」`13px/700` lake `#1B5847`, `margin:0 0 12px` | L37 `mb-2.5 text-sm font-medium` (14px/500 ink) | `mb-3 text-[13px] font-bold text-v2-lake` |
| Textarea | `border:1px solid #E7DFD2; border-radius:14px; background:#FAF7F2; padding:14px 56px 14px 14px; min-height:80px` | L39–46 `rounded-2xl border-v2-line bg-v2-surface px-3.5 py-3 pr-14` (white) | `rounded-[14px] border-v2-line bg-v2-paper px-3.5 py-3.5 pr-14 min-h-20` |
| Mic button | `38px` circle, `right:10px; bottom:10px`, `bg #1B5847`, mic `16px`, `shadow 0 4px 10px rgba(27,88,71,.3)` | L48–58 `h-10 w-10` (40px) `bottom-3 right-3 bg-v2-lake`, no shadow | `h-[38px] w-[38px] bottom-2.5 right-2.5`, add `shadow-[0_4px_10px_rgba(27,88,71,.3)]`; keep recording/transcribing/danger + `supported` guard |
| Helper line | `12px #B7AE9D` (`text-v2-ink-subtle`), `margin:6px 0 0` | L60 `mt-2 text-xs text-v2-ink-muted` | `text-v2-ink-subtle` (match) |
| Example chips | OUTSIDE card, own row `margin:12px 16px 0; display:flex; gap:6px; overflow-x:auto`; chip `bg #F1EBE0` (sand) · `color #6E6860` · radius 99 · `padding:6px 12px` · `12px/600` | L61–67: inside card, `flex-wrap gap-2`, chip `border-v2-lake-border bg-v2-lake-soft px-3 py-[5px]` (green) | move out of the card, `flex gap-1.5 overflow-x-auto`, chip `bg-v2-sand text-v2-ink-muted` no border, `px-3 py-1.5` |
| Image section | NEW white card 「收據/消費圖片」 `13px/700 lake` + two equal buttons: **拍照** (icon tile `32px bg #FBEAE0` coral-soft, `text #E8825A` coral) and **選擇圖片** (tile `32px bg #EAF5F1`, `text lake`); each `flex:1`, `1.5px dashed #C9BFAC` (check), radius 14, `padding:16px 10px`, `bg paper`; helper 「AI 自動辨識金額與品項」`12px ink-subtle` | L70–78: single full-width row button 「拍照或掃描收據」with `bg-v2-lake-tint` camera tile + text; **no 選擇圖片 / gallery** | add `SECTION_CARD` with title + two dashed buttons. `拍照` → existing `onCamera`; `選擇圖片` → new `onGallery` handler (gallery `<input type=file>` — reuse/add in `camera-step.tsx` or step). Wire via `quick-expense-v2.tsx` |
| Bottom submit | full-width lake, radius 14, `padding:15px`, `15px/700`, Sparkles icon `15px` | L86–93 `rounded-[14px] py-3.5 text-sm` (14px), no icon | add `Sparkles h-[15px] w-[15px]`, `py-[15px] text-[15px]`; keep `disabled:opacity-40` and error alert (L81–85; design has no error state, keep) |

## A12b — AI 語音記帳（批次確認）(`confirm-step.tsx`, `quick-item-card.tsx`) — template = A3d

Reuse note: A3d internals (`AmountCard`, `CategoryPicker`, `PayerPicker`, `SECTION_CARD/SECTION_TITLE`) already exist and are covered by `gap-a3.md`. The confirm card should be rebuilt on those components instead of the current hand-rolled `quick-item-card.tsx`.

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Header | close LEFT 32px `bg #F1EBE0` sand · serif `17px/600` 「AI 快速記帳」CENTER · 32px spacer · `border-bottom:1px solid #E7DFD2` | `confirm-step.tsx:39–44`: title LEFT sans, close RIGHT `bg-v2-lake-soft`, no bottom border | same header treatment as A11 (extract a small shared `QuickHeader`) |
| Detail row | 「支出明細」`13px/700` (ink) LEFT · position label 「1 / 3」`12px #6E6860` (`ink-muted`) RIGHT | L46–57: 「支出明細」`text-sm font-medium` + prev/next chevrons + `N / M` count | heading `text-[13px] font-bold`; right label `text-xs text-v2-ink-muted` `{index+1} / {items.length}` |
| Progress dots | centered; active `width:24px;background:#1B5847`, inactive `width:8px;background:#E7DFD2`; `gap:6px` | none (current uses arrow buttons) | replace arrows with dot **buttons** (keep keyboard/a11y): `aria-label={`第 ${i+1} 筆`}`, active `w-6 bg-v2-lake`, inactive `w-2 bg-v2-line`, `h-2 rounded-full` |
| Delete affordance | top-right pill `height:28px; padding:0 12px 0 10px; radius:99px; background:#FBEAE0; color:#C4472F`; `Trash2 14px` + 「刪除此筆」`12px/700` | delete is at card bottom (`quick-item-card.tsx:124–127`) as full-width bordered button | move to a top-right pill row (`bg-v2-coral-soft text-v2-danger`, `h-7 rounded-full px-3`); remove the bottom one |
| Swipe hint | centered `11px #B7AE9D` 「← 左右滑動切換這一批的 3 筆支出 →」 | none (swipe logic exists L59–68) | add hint `text-[11px] text-v2-ink-subtle text-center` |
| Amount card | radius 20, `padding:18px 20px`, `shadow 0 2px 8px rgba(27,88,71,.07)`; closed `bg #D2EAE1` (lake-tint) `border #B7D9CB` (lake-edge); label 「輸入金額」`13px/700` lake; pill 計算機; calculator panel (white card, serif 26px lake result, 4-col keypad `42px radius 11px`) | `quick-item-card.tsx:44–57`: white card radius 16, `CurrencySelect` + input `text-2xl font-bold`, no label, **no calculator** | replace with shared `AmountCard` (`components/v2/expense-form/amount-card.tsx`) + the v2 `Calculator` used by `expense-form-v2-view.tsx:56–67`. Note: current `AmountCard` is a gradient, while A12b/A3d-v20261004 closed state is lake-tint/lake-edge — see Open questions |
| Description / Category / Date | cards with `SECTION_CARD` + `SECTION_TITLE`; category 4-col grid (selected 餐飲 in design uses `border #8F3714 / bg #FBEAE0 / text #8F3714`) | description L59–67 uses `sectionTitle` `text-sm font-medium`; category via `CategoryPicker` (A3d) — already carded; date L96–109 carded but title `text-sm font-medium` | reuse `CategoryPicker`; wrap description/date in `SECTION_CARD`/`SECTION_TITLE` |
| Payer card | design shows **multi-payer** (小雨+志明 selected) with per-payer `$30` boxes, 全選, payer summary 「已選 2 人 / 金額相符 / $30 + $30 = $60 / $60」 | `quick-item-card.tsx:71–78`: single-select 「誰付的錢？」 member pills | UI-only single payer (D12): reuse `PayerPicker` (single payer + read-only `$amount` row + summary). Multi-payer needs schema/settle rework → §6 |
| Split card | 先扣個人項目 toggle, personal items list, 共同分攤 pool pills, per-person pin/custom box, 分攤明細 table (`成員 / 個人項目 / 共同分攤 / 小計` + 合計), all backed by `personalItems`/`customShares` | `quick-item-card.tsx:80–94`: simple 「幫誰付？（N 人均分 · 每人 X）」 participant pills only | Can only render equal-split pills (QuickItem has `participantIds` only). Full A3d split is **not representable** without `lib/quick-expense/draft.ts` changes (forbidden). Keep/restyle pills into a `SECTION_CARD`; personal-items/pins/table → §6 |
| Location | `支出日期`/`消費地點` cards; location button `bg #FAF7F2 border #E7DFD2 radius 12` with coral pin, text 「點擊獲取位置」 | L111–117 uses v1 `LocationPicker` (`@/components/location-picker`) | switch to v2 `LocationPickerV2` (exists, `components/v2/expense-form/location-picker-v2.tsx`) to avoid v1 coupling |
| Receipt/image | card with 拍照 / 選擇圖片 dashed buttons + helper | L119–122 `ImagePicker` (shared with v1) | keep `ImagePicker` (D18); cosmetic delta only |
| Notify LINE | full-width card, custom 20px lake check tile, 「通知 LINE 群組」`12px/700` + subtitle | L79–87: label with native checkbox `accent-v2-lake` | align with A3d notify card (peer-check + `Check` tile) after `gap-a3` |
| Total summary | `background:#EAF5F1; radius:14px; padding:12px 16px`; left 「共 3 筆」`12px lake/600`; right serif `17px/700` lake `NT$210` | L75–78: plain row, `text-xs` left + `font-bold text-v2-lake` right (TWD format) | wrap in lake-soft card; keep `formatCurrency` TWD per D17 |
| Bottom buttons | both `flex:1`, radius 14, `padding:13px`, `13px/700`: 重新輸入 (white, `1.5px border #E7DFD2`) · 新增 3 筆 (lake) | L93–100: 重新輸入 `flex-1 border`, 新增 `flex-[2]` | make both `flex-1`; 13px |

---

## Files to modify (proposal only — no code changed)

- `components/v2/quick-expense/camera-step.tsx` — A10 rebuild + tokenise.
- `components/v2/quick-expense/quick-input-step.tsx` — A11 rebuild; add `onGallery` prop; drop `Sparkles` in header, add to submit.
- `components/v2/quick-expense/quick-expense-v2.tsx` — wire `onGallery` (reuse `handleImage`) into `QuickInputStep`; no step-machine change.
- `components/v2/quick-expense/confirm-step.tsx` — A12b header/dots/delete/notify/bottom; extract shared header.
- `components/v2/quick-expense/quick-item-card.tsx` — reuse `AmountCard`/`CategoryPicker`/`PayerPicker`/`SECTION_CARD`; `LocationPickerV2`; move delete out.
- `components/v2/quick-expense/use-camera.ts` — only if gallery input handling is added here (optional).
- `app/globals.css` — add `--v2-camera-bg` (and optional `--v2-on-dark`); `@theme inline` mapping.
- `tests/components/v2/quick-expense/quick-input-step.test.tsx`, `quick-expense-v2.test.tsx`, `confirm-step.test.tsx`, `camera-step.test.tsx` — update.
- `tests/components/v2/no-hardcoded-colors.test.ts` — remove `quick-expense/camera-step.tsx` exemption once tokenised.
- `tests/components/v2/v2-tokens.test.ts` — assert the new token(s).

No change required: `components/v2/project/quick-actions.tsx` (AI FAB + manual FAB already match A2 v20261004); `components/v2/expenses/**` (design A6 has no FAB; removal commit `3f82183` stays correct). Do NOT touch `lib/**`, `app/api/**`.

## New tokens (`app/globals.css` — ADD only)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--v2-camera-bg` | `#171412` | `#171412` (fixed dark screen) | A10 root background |
| `--v2-on-dark` *(optional)* | `#FFFFFF` | `#FFFFFF` | A10 white text/icon on the always-dark screen; alternatively use arbitrary `text-[rgba(255,255,255,.92)]` (rgba passes the colour guard) |

Mapping of other design colours to existing tokens: `#E8825A`→`v2-coral`, `#1B5847`→`v2-lake`, `#FAF7F2`→`v2-paper`, `#FFFFFF`→`v2-surface`, `#E7DFD2`→`v2-line`, `#F1EBE0`→`v2-sand`, `#1B1815`→`v2-ink`, `#6E6860`→`v2-ink-muted`, `#B7AE9D`→`v2-ink-subtle`, `#C9BFAC`→`v2-check`, `#FBEAE0`→`v2-coral-soft`, `#EAF5F1`→`v2-lake-soft`, `#C4472F`→`v2-danger`, `#D2EAE1`→`v2-lake-tint`, `#B7D9CB`→`v2-lake-edge`, `#2F8F74`→`v2-lake-mid`, `#24735D`→`v2-link`, `#F6DCD3`→`v2-danger-soft`, `#C4432A`→`v2-danger-strong`, `#F0EAE0`→`v2-line-soft`.

No exact token (nearest suggested; confirm): `#F3B3A0` (calculator clear text on lake) → `v2-coral-tint`; `#8F3714` (selected 餐飲 border/text) → `v2-coral-strong` (A3 form concern, `gap-a3` did not flag it); `#E7F3EE` (交通 tone) → `v2-lake-soft`; `#FBE3D2` (avatar tone) → `v2-coral-tint`.

Colour guard: any new/edited `.tsx` under `components/v2/**` must avoid `#hex`, `bg-white`, `text-white`, `bg-black`, `dark:`. `camera-step.tsx` currently violates all four and is **exempt** (`no-hardcoded-colors.test.ts:6`); the A10 rebuild should eliminate these and the exemption should be removed.

## Tests to add / update

1. `tests/components/v2/quick-expense/quick-input-step.test.tsx`
   - Replace `拍照或掃描收據` with `拍照`; add `選擇圖片` calls `onGallery`.
   - Add: header shows serif title and close-left; example chips are outside a card? (assert 3 chips still call `onTextChange` with a space).
   - Keep: disabled parse on blank / while recording; mic hidden when unsupported; error alert.
2. `tests/components/v2/quick-expense/quick-expense-v2.test.tsx`
   - `fireEvent.click(screen.getByRole("button", { name: /拍照或掃描收據/ }))` (L83, L92) → `拍照`.
   - Add a case: 選擇圖片 → `parseReceipt` → one item.
   - Keep camera `initialStep="camera"`, partial-save, LINE-toggle, stale-state tests.
3. `tests/components/v2/quick-expense/confirm-step.test.tsx`
   - Replace prev/next `上一筆`/`下一筆` with dot buttons (`第 1 筆` …); update "navigates between cards".
   - Update "shows pager, split title, totals and submit label" to the new pos label `1 / 2`, delete pill, total card (`共 2 筆` / `TWD 210`).
   - Keep amount editing, payer/split, delete, LINE, multi-currency cases (selectors may change).
4. `tests/components/v2/quick-expense/camera-step.test.tsx`
   - Copy strings unchanged; add header order/title assertions; keep fallback/manual/stream cases. (Root colour changes are not asserted.)
5. `tests/components/v2/no-hardcoded-colors.test.ts` — remove the `camera-step.tsx` exemption; suite must stay green.
6. `tests/components/v2/v2-tokens.test.ts` — add `camera-bg` (and `on-dark`) to `NEW_TOKENS` with light/dark values.

## Open questions / API gaps / UI-only items

- **No new API needed**: `/api/voice/parse`, `/api/voice/transcribe`, `/api/receipt/parse` exist and are used by `lib/quick-expense/parse.ts` + `speech-input.ts`. No `app/api` change.
- **Multi-payer (A12b 付款人)**: design shows 2 payers with per-payer amounts; `ExpenseItemResult.payerId` is a single id and settlement depends on it. Render single payer (D12); multi-payer needs schema + settlement + v2 API — separate ticket.
- **Personal items / custom shares / 分攤明細 table (A12b)**: `QuickItem` (in `lib/quick-expense/draft.ts`, off-limits) has only `participantIds` (equal split). Full A3d split editor is **not representable** without lib changes. Proposal: render styled equal-split pills now; defer personal items/pins/table.
- **Amount card style**: A3d-v20261004 closed state is `lake-tint / lake-edge`, but the shared `AmountCard` is a `lake-soft→paper` gradient (was correct for v20261003). Decide whether A12b overrides locally or `gap-a3` updates `AmountCard`.
- **Entry points**: A10/A11/A12b introduce **no new entry point**. A2 v20261004 (`Trip-m0lh.dc.html:237–244`) keeps the overview AI FAB (→ `VoiceExpenseInput`) and manual FAB; overview `quick-actions.tsx` already matches. The expenses-page AI FAB stays removed (A6 shows none). Camera is reached only from A11's 拍照 button (and the board's gallery/shutter links prototype to `AddExpense`).
- **A10 right header AI circle** is a non-link `<span>` (decoration); no action defined.
- **Gallery pick**: new direct 選擇圖片 requires an `onGallery` handler (file input without `capture`). Add to the input step, not the Camera step.
- **`LocationPicker` v1 coupling**: `quick-item-card.tsx:10` imports `@/components/location-picker` (forbidden file). Switching to v2 `LocationPickerV2` removes the v1 dependency and is type-compatible.
- **D17** keeps `formatCurrency` TWD formatting (design shows `NT$210`).

## v1 regression risks

- `quick-item-card.tsx` currently imports v1 `LocationPicker` and shared `components/ui/{Calendar,CurrencySelect,ImagePicker,Popover}`. These files must not change; switching to `LocationPickerV2` and reusing `AmountCard`/`CategoryPicker` reduces v1 coupling.
- `memberPillClass`/`memberTone` live in `components/v2/expense-form/payer-picker.tsx` and are consumed by both the A3 form, `split-editor.tsx`, and `quick-item-card.tsx`. Any restyle affects all; `gap-a3` already plans these edits — coordinate to avoid double work.
- `lib/quick-expense/**`, `lib/speech.ts`, `lib/media-recorder-speech.ts`, `lib/ai/expense-parser.ts`: untouched. `lib/expense-split.ts` is read-only.
- `QuickExpenseV2` is v2-only and mounted only from `project-overview-v2.tsx`; keep its `initialStep` prop intact.
- Verify after: `npm run lint`, `npm run test:run`, `npm run build`; and `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts` must be empty.
