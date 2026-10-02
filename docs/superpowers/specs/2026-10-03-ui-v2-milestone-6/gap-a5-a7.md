# Gap report: A5b (結算) / A6b (全部支出) / A7b (成員) + FilterDropdowns-test vs current v2 code

Design source: `design/project-v20261003/{Settle-sections,ExpenseList-sections,Members-sections,FilterDropdowns-test}.dc.html`
Code: `components/v2/{settle,expenses,members}/*`, `components/v2/layout/v2-top-bar.tsx`, `components/expense/expense-filter-content.tsx` (v1 shared, DO NOT EDIT), `lib/hooks/useExpenseFilters.ts` (shared, DO NOT EDIT).

Common theme of the "Section" redesign: every content block becomes ONE white card (`bg-v2-surface border border-v2-line rounded-2xl p-4` = 16px radius, 16px padding) whose heading lives INSIDE the card: `text-[13px] font-bold text-v2-lake` (13px/700/#1B5847). Dividers between rows inside use `border-v2-line-soft` (#F0EAE0). Headings that today sit outside the card at `text-sm font-medium` must move inside.

## 0. Cross-cutting items (affect all three screens)

| # | Gap | Evidence | Resolution |
|---|-----|----------|-----------|
| X5 | Radius mapping: in this repo `rounded-lg` = 10px and `rounded-xl` = 14px (`--radius-xl: calc(var(--radius)+4px)` in `app/globals.css:43`), NOT 12px. Where the design says **12px use `rounded-[12px]`**; where it says 14px use `rounded-xl`; 16px use `rounded-2xl`; 18px use `rounded-[18px]`. Several rows below write `rounded-xl (12px)` — implement those as `rounded-[12px]`. | `app/globals.css:43` | Use bracket radii for 12px/18px. |
| X1 | Top-bar title weight/size differs per page. Design: A5b 16px/700 (`font-bold text-base`), A6b 16px/500 (current), A7b 17px/600 (`text-[17px] font-semibold`). Current `V2TopBar` hard-codes `text-base font-medium`. | v2-top-bar.tsx h1 | Add optional prop `titleClassName?: string` to `V2TopBar` (default = current classes, so every other page is unchanged). A5b passes `"font-bold"`, A7b passes `"text-[17px] font-semibold"`. Tailwind class conflicts: build the h1 class as `` `m-0 font-v2-serif leading-6 tracking-[.15px] ${titleClassName ?? "text-base font-medium"}` `` (do not use cn()/twMerge for font-v2-* — see ui-v2-scope.tsx comment). |
| X2 | Back-button/top-bar padding: A5b header uses `padding:16px` (current `px-3.5` = 14px); A6b and A7b use 14px. | Settle-sections L25 | Ignore (2px). Do not change. Note in "accepted deviations". |
| X3 | Colors in design not in token list: `#B7D9CB` (action-button border, A5b/A7b), `#DCEAE3` (A6b/A7b border), `#FBE3D2` (avatar coral bg in A5b/A7b), `#FDF2EF` + `#E8A796` (A6b "移除篩選" chip), `#C4472F`=danger (swipe bg). | grep | **Correction — token collisions with the master spec. `#B7D9CB` uses the NEW token `--v2-lake-edge`** (#B7D9CB light / `#2E5A4C` dark), created in Part 0, Task 0.2. Do NOT reuse or overwrite `--v2-lake-border` (existing #DDEDE6, used by many v2 screens). `#DCEAE3` -> existing `--v2-lake-border` (close enough). `#FBE3D2` -> existing `coral-soft` (#FBEAE0; visually equal, accepted deviation). `#C4472F` -> existing `v2-danger`. NEW tokens (created in Part 0): `--v2-danger-wash` #FDF2EF / #2E1914 and **`--v2-danger-edge`** #E8A796 / #6A3A2E for the chip's dashed border. **Do NOT name the chip border `--v2-danger-border`** — that name is reserved by master §4 for the A13 danger block (#F3D3C4). `no-hardcoded-colors.test.ts` bans raw hex so tokens are mandatory. |
| X4 | Filter dropdown panels render through Radix Portal to `document.body`, i.e. OUTSIDE `[data-ui="v2"]`, so `bg-v2-*` classes inside the panel resolve to nothing (tokens are scoped). The current bar re-uses v1 `DropdownMenuContent` / `PopoverContent` which use v1 theme (`bg-popover`). | components/ui/popover.tsx Portal; ui-v2-scope.tsx | New v2 popover must NOT use the Portal. Use an inline wrapper `relative` + absolutely positioned panel (as the design does: `position:absolute; top:calc(100% + 4px)`) with outside-click + Escape close handled by a small hook `useDismiss(ref, onClose)`. Do not touch `components/ui/popover.tsx` (v1 uses it). |

## 1. A5b 結算 — `components/v2/settle/*`

Design structure (top to bottom):
1. TopBar "結算" (X1).
2. Card #1 `margin:14px 16px 0; padding:16px; rounded 16; border line`: heading "計算總覽" 13/700 lake, `margin-bottom:10px`, then 2x2 grid gap 10px of tiles.
   - Tile: `rounded-xl (12px) py-3 px-1`, bg tone-soft, 32px icon circle (tone-tint) + icon 15px stroke 1.7 in tone color, value `font-v2-serif font-bold text-base` **in ink (#1B1815), NOT tone color**, label `text-xs text-v2-ink-muted mt-0.5`.
   - Tones: 筆數 lake, 總金額 coral (icon color coral-strong #C4602F), 日均 lake, 人均 plum.
3. Card #2 `margin:16px 16px 0`: header row `flex justify-between mb-3`: heading "轉帳建議" + two action buttons (計算說明 / 分享): `px-3 py-1.5 rounded-lg border border-v2-lake-border bg-v2-lake-soft text-xs font-semibold text-v2-lake gap-1.5`, icon 13px (current 12px). Rows: `py-3` (NOT px-4 — card already has padding), `border-b border-v2-line-soft` except last row which is `pt-3` only. Row = [26px avatar][name 14/500][arrow-right 13px ink-subtle stroke 2.2][26px avatar][name]. Amount right: serif 16/700.
4. "查看統計" link centered, `margin:14px 16px 0`, 12px/600 ink-muted, chart icon 13px, chevron 11px.

Current code vs design:

| File | Current | Design | Change |
|------|---------|--------|--------|
| settle-summary-grid.tsx | heading `p.text-sm.font-medium` OUTSIDE card, above; card = the 2x2 grid itself with `p-4 overflow-hidden` | heading inside card, 13/700 lake, mb-2.5 | Wrap: `<div data-testid="settle-summary" className="mx-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4">` -> heading row (`mb-2.5 flex items-center justify-between`) containing `<p className="m-0 text-[13px] font-bold text-v2-lake">計算總覽</p>` + `currencySelect` -> inner `<div className="grid grid-cols-2 gap-2.5">`. KEEP `data-testid="settle-summary"` on the outer card (tests query within it). |
| settle-summary-grid.tsx | value `text-v2-lake/coral-strong/plum` per tone | value ink | change value span class to `font-v2-serif text-base font-bold tabular-nums text-v2-ink`. Icon stays tone colored. Icon size `h-[15px] w-[15px]` strokeWidth 1.7 (current h-4 w-4 / 1.8). Tone constant `.text` is still used for the icon. |
| settlement-list.tsx | heading + buttons OUTSIDE card (`mb-1.5`), list card `overflow-hidden`, rows `px-4 py-3` | all inside one `p-4` card; header `mb-3` | Outer: `mx-4 mt-4 rounded-2xl border border-v2-line bg-v2-surface p-4`. Header `mb-3 flex items-center justify-between` with `p.text-[13px].font-bold.text-v2-lake`. Rows `py-3`; first row has no top padding change (design keeps `12px 0` for all but last which is `12px 0 0`), so: `i < last ? "border-b border-v2-line-soft py-3" : "pt-3"`. Empty state `<p className="py-4 text-center text-[13px] text-v2-ink-muted">`. Icons `Info`/`Share2` -> `h-[13px] w-[13px]`. Arrow `h-[13px] w-[13px]` + `strokeWidth={2.2}` (keep aria-label="付給"). Keep `data-testid="settlement-{i}"`. |
| member-balances.tsx | NOT in design | — | Keep (functional value; v1 shows it). Restyle to the same section card so the page is consistent: outer `mx-4 mt-4 rounded-2xl border bg-v2-surface p-4`, heading `p.text-[13px].font-bold.text-v2-lake mb-2.5` inside, rows `py-3` + `border-b border-v2-line-soft`, last `pt-3`. Keep `<section aria-label="各人收支">`. REPORT TO USER as "extra not in design". |
| settle-v2-view.tsx | currency Select next to heading, ad slot, rate info box, SponsorCard — none in design | — | Keep all (non-design features). Restyle rate-info box and sponsor card only if trivial; otherwise leave. REPORT to user. Pass `titleClassName="font-bold"` to V2TopBar (X1). |
| settle-v2-view.tsx | Stats link `mt-3.5`, 12/600 ink-muted, icon 14px | `margin:14px 16px 0`, icon 13px | change `h-3.5 w-3.5` -> `h-[13px] w-[13px]`, chevron `h-[11px] w-[11px]` strokeWidth 2.2. |
| avatar tones | AVATAR_TONES: lake-tint, gold-soft, rose-soft, coral-soft, plum-soft by member index | design assigns per person: 小美 lake-tint, 我 gold-soft, 佳婷 rose-soft, 志明 coral, 阿凱 plum; the current user ("我") is always gold | Keep index-based rotation (mock data cannot define the rule) EXCEPT: when `memberId === currentMemberId` use `bg-v2-gold-soft text-v2-gold`. Needs a new test. |

Existing tests that will break/need updates (tests/components/v2/settle-v2.test.tsx):
- "lists transfers with 我": uses `{selector: "span.font-medium"}` -> still true (name span keeps `font-medium`). OK.
- Summary tile test only checks text -> OK.
- Add tests: heading "計算總覽" is inside `settle-summary` (`within(grid).getByText("計算總覽")`); heading "轉帳建議" lives in the same container as the rows (`screen.getByTestId("settlement-0").parentElement` contains heading's container — assert `heading.closest("div.rounded-2xl")` equals `row.closest("div.rounded-2xl")`); tile value has class `text-v2-ink`; current user avatar has `bg-v2-gold-soft`.

Unimplemented / data questions for A5b: none (all data exists). Design shows "NT$ 2,400" (symbol+space) while code uses `formatCurrency` ("TWD 2,400"). Keep formatCurrency (shared with v1 and tests). Report as design/code difference.

## 2. A6b 全部支出 — `components/v2/expenses/*`

### 2.1 Summary card (expense-summary-card.tsx)
| Item | Current | Design | Change |
|------|---------|--------|--------|
| border | `border-v2-lake-border` | `#DCEAE3` | same token, OK |
| total color | `text-v2-lake` | ink `#1B1815` | `text-v2-ink` |
| date chip icon | CalendarDays | calendar icon w/ `Send`?? NOTE: design chip icon is a 2-path icon at 12px (paper-plane-like); keep CalendarDays | optional; skip (accepted deviation) |
| divider lines | `border-v2-lake-border` / `bg-v2-lake-border` | rgba(27,88,71,.12/.14) | skip (visually same) |
| everything else (24px serif 700 value, 28px icon boxes, 14/700 + 12 subtle) | matches | | none |

### 2.2 Filter bar (expense-filter-bar.tsx) + FilterDropdowns-test
Design bar: search field (same as current) then a 3-col grid (gap 8, margin 10px 16px 0) of: 類別, 付款人, 參與者, 金額, 付款日期, and (only when any filter is active) a dashed **移除篩選** chip:
`flex items-center gap-[5px] rounded-[10px] border border-dashed border-v2-danger-edge bg-v2-danger-wash px-2.5 py-[9px] text-xs font-semibold text-v2-danger` with a circle-x icon 14px and label "移除篩選" (in the dropdown-test mock it is an icon-only 15px button when the row is 6 wide; use label version from A6b).
Changes vs current:
| # | Gap | Change |
|---|-----|--------|
| F1 | 建立日期 chip is gone from design | Remove the chip + `onCreatedRange` prop usage from the bar. Hook still supports `createdDateRange` (v1 uses it) — do not remove from hook. REPORT: v2 loses created-date filter (design decision). |
| F2 | 幣別 chip not in design | Keep only if `currencies.length > 1` (current behaviour); it takes a grid cell. REPORT to user (not in design). |
| F3 | Chips become v2-styled dropdown panels (X4) with an in-panel "清除" button (right of the header) instead of an external 清除 link | New file `components/v2/expenses/filter-popover.tsx` (trigger + absolute panel + dismiss) and `components/v2/expenses/filter-panels.tsx` (CategoryPanel, MemberPanel, AmountPanel, DatePanel). Panel shell: `absolute top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-v2-line bg-v2-surface shadow-[0_10px_28px_rgba(27,24,21,.18)]`; widths measured from `FilterDropdowns-test.dc.html`: 類別 232px (L46), 付款人 184px (L147), 參與者 190px (L222), 金額 230px (L297), 付款日期 236px (L363). Align left for cols 1-2, **right-aligned (`right-0`) for col 3 (參與者) and for 付款日期** so it does not overflow the 390px screen. Header row: `flex items-center justify-between px-2.5 pt-2 pb-1.5`, title `text-[10px] font-bold text-v2-ink-subtle`, 清除 button `flex items-center gap-[3px] rounded-md px-1 py-0.5 text-[10px] font-bold text-v2-danger` with 11px circle-x icon. Divider `h-px bg-v2-line-soft`. List `dd-scroll max-h-44 overflow-y-auto` (scrollbar thin; add utility class `.v2-scroll` in globals.css scoped under `[data-ui="v2"] .v2-scroll` using `scrollbar-width: thin; scrollbar-color: var(--v2-line) transparent`). Row `flex items-center gap-2 px-2.5 py-[7px] text-xs`, checkbox 15px `rounded-[4px]` (checked: `bg-v2-lake` + 10px white check `text-v2-on-lake`; unchecked: `border-[1.5px] border-v2-line bg-v2-surface`). Category rows also have an 18px `rounded-[5px]` swatch using `CATEGORY_TONES[key]` (design mock colors are placeholders; use tokens). |
| F4 | 類別: multi-select (design title "選擇類別（可複選）"), 8 categories in `EXPENSE_CATEGORIES` order, labels from `CATEGORY_LABELS`. Same as hook `toggleCategory`. | Panel calls `onToggleCategory`; 清除 calls new prop `onClearCategories`. |
| F5 | 付款人: title "選擇付款人", design implies **single-select** (radio-like; only one row has a check). Hook stores a Set. | Implement single-select on top of existing API: clicking a row calls `onSetPayers(new Set([id]))`; clicking the selected row again calls `onSetPayers(new Set())`; list includes the current user labelled "我" first. Hook already exposes `setPayers`. Needs new bar props: `onSetPayers`, `onClearPayers`. **Row visuals for both 付款人 and 參與者:** an 18px avatar with the member initial; for 付款人 the selection control is a **round** checkbox (not the square 4px-rounded one) — see `FilterDropdowns-test.dc.html:157,162,167,172,242,247`. REPORT: v1 allows multi-payer filter; v2 single (design). |
| F6 | 參與者: "選擇參與者（可複選）" multi, shares list with payers. | uses `onToggleParticipant`, `onClearParticipants` (hook `setParticipants`). |
| F7 | 金額: dual-range slider track `h-1 rounded-full bg-v2-line-soft`, fill `bg-v2-lake`, 14px white knobs with 2px lake border (`bg-v2-knob border-2 border-v2-lake`), min/max labels row `text-xs font-bold` showing `formatCurrency(min)` and `formatCurrency(max)`; header "設定金額區間". | Implement with TWO overlaid `<input type="range">` (pointer-events trick) OR two stacked range inputs (simplest and testable; test via `fireEvent.change`). Data model unchanged: `amountRange: [min,max]`, 0 = unlimited; label for max when 0 shows `formatCurrency(maxAmount)`. 清除 -> `onAmountRange([0,0])`. |
| F8 | 付款日期: panel contains month header + weekday row + day grid = react-day-picker range (design note: Popover+Calendar from the shadcn Calendar, mode=range, numberOfMonths=1, selecting applies immediately, only a 清除 button). Trigger label `M/d~M/d` + badge "1". | Reuse `@/components/ui/calendar` `<Calendar mode="range" numberOfMonths={1} selected=... onSelect=... />` inside the v2 absolute panel (no Portal needed; Calendar is plain). Keep `rangeLabel()` as is. Header `付款日期` + 清除. Calendar uses v1 `--primary` tokens (design explicitly says so) — accepted. |
| F9 | Chip visuals: active = `border-[1.5px] border-v2-lake-mid bg-v2-lake-soft text-v2-lake font-bold` + count badge (15px, `bg-v2-lake text-v2-on-lake` 9px); inactive = `border border-v2-line bg-v2-surface font-semibold` with chevron 10px. **Open state** (trigger when its panel is open and not active): ink-colored icon/chevron (#1B1815) — design shows `stroke="#1B1815"` for open, `#B7AE9D` (ink-subtle) for closed idle icons; active uses lake. | Current `Chip` already matches active/inactive. Change idle icon/chevron color to `text-v2-ink-subtle`, open `text-v2-ink`, active `text-v2-lake`. Chips must become real `<button type="button" aria-expanded aria-haspopup="dialog">` (today they are `<span>` inside Radix triggers). **Also:** the open+inactive trigger changes to `border:1.5px solid #B7AE9D; background:#F5F1E8` (`FilterDropdowns-test.dc.html:142`). `#F5F1E8` has no v2 token — add `--v2-sand-hover` #F5F1E8 or use `bg-v2-sand` (#F1EBE0, accepted deviation). |
| F10 | 清除 link beside "顯示 N / M 筆" is gone; its job is the "移除篩選" chip (only visible when `hasActiveFilters`). | Remove the 清除 button from `expenses-v2-view.tsx` and render the chip in the bar (needs bar prop `hasActiveFilters` + `onClearFilters`). The chip must also clear search? Hook `clearFilters` clears everything incl. search — keep. |

### 2.3 Count line & list (expenses-v2-view.tsx)
| Item | Current | Design | Change |
|------|---------|--------|--------|
| count line | `顯示 N / M 筆` + right side [清除][批次] | only `顯示 <b ink>N</b> / M 筆` (12px muted), `mb-2` | Remove 清除 (F10). **批次 button and 批次刪除 bottom bar, and the "AI 快速記帳" FAB are NOT in design** -> KEEP (features exist in v1/v2 tests), keep their current look. REPORT. |
| day label | `text-xs font-semibold text-v2-ink-subtle mb-2` | `font-size:11px;font-weight:700;color:#B7AE9D;margin:0 0 6px` | `text-[11px] font-bold mb-1.5` |
| card spacing | `mb-3` | first `mt-1.5`, next `mt-2` (8px) | `mb-2` |

### 2.4 Expense card (expense-card.tsx) — largest change
Design card: `<a>` `block bg-surface border border-v2-line rounded-[14px] p-[11px] shadow-[0_1px_2px_rgba(27,24,21,.05)]`.
Row 1: `flex items-start gap-3` -> [40x40 `rounded-[12px]` category icon box (design radius 12px; `rounded-xl` is 14px here), icon **17px** stroke 1.6, NO label below] + column:
 - line A: `flex justify-between items-center gap-2`: title `h3 text-sm font-semibold leading-[19px] truncate flex-1`; right `flex items-center gap-[3px] shrink-0`: amount `text-sm font-bold text-v2-ink` + `ChevronRight` 12px `text-v2-check` (design stroke #C9BFAC).
 - line B (mt-[5px]): calendar icon 11px ink-subtle + `付款日期` (11px ink-subtle) + `MM/DD` (11px ink 600). Format via `formatMonthDayTime`? NO — date only: add `formatMonthDay` helper if not existing in `lib/expense-list.ts` (check; v1 must not change — add to `components/v2` helper file instead if absent).
 - line C (mt-[5px], `flex items-center gap-1.5 overflow-hidden whitespace-nowrap`): 14px payer avatar (7px text, `bg-v2-lake` if me else `bg-v2-coral`, text `text-v2-on-lake`), `{payer}付款` 11px/500 (me => "我付款"), 8px x 1px `bg-v2-check` dash, stacked participant avatars 14px with `border-2 border-v2-surface`, `-ml-[5px]`, colors cycle lake / coral / plum then a `+N` overflow circle `bg-v2-line text-v2-ink-muted`; avatar initial letters 6px/700 (first char of member name, 我 for current user); then `共{n}人分攤` 11px ink-subtle.
Footer (mt-2.5 pt-2.5 `border-t border-v2-line`): **always rendered in the design.** Left = MapPin 12px + location 11px ink-muted truncate, or the placeholder `未填寫地點` (ink-subtle, no pin) when location is empty. Right = 32x32 `rounded-[9px]` receipt indicator: with an image, `bg-v2-lake-border text-v2-lake`, label `已附明細圖片`, Image icon 14px; without an image, `bg-v2-line-soft text-v2-check` (grey), label `未附明細圖片`. Keep the interactive `<button aria-label="查看圖片">` only when an image exists (so the lightbox still works). If the always-on footer makes location-less cards too tall, the accepted fallback is to keep the footer only when location or image exists — record the deviation.

| Gap | Current | Change |
|-----|---------|--------|
| icon box | 48px, rounded-2xl, label below | 40px rounded-xl, no label (category still in title fallback) |
| title | 16/500 | 14/600 |
| amount | `text-base font-bold` no chevron | `text-sm font-bold` + chevron |
| time lines | "付款 11/16 19:20" + "建立 11/16 19:22" | single "付款日期 11/16" row. **Existing test asserts both strings** -> update test; REPORT to user: 建立時間 removed from card by design (still shown on edit page). |
| payer/participants | in footer: 20px avatar, name, dots, "N人" | moved into row C (14px avatars with initials, "X付款", "共N人分攤") |
| thumbnail | 40px absolute thumbnail button -> `onViewImage` | 32px lake-border indicator. Design shows a non-interactive `<span aria-label="已附明細圖片">`. Keep as `<button aria-label="查看圖片" onClick={e => {e.preventDefault(); e.stopPropagation(); onViewImage(url)}}>` so the existing feature (image lightbox) survives; style per design (no thumbnail image). Existing test clicks "查看圖片" -> still passes. |
| delete | Trash2 button in footer | removed; replaced by swipe-to-delete (below) |
| card border/shadow | `rounded-2xl border-v2-line-soft p-3.5 shadow 4px 12px` | `rounded-[14px] border-v2-line p-[11px] shadow-[0_1px_2px_rgba(27,24,21,.05)]` |
| data | needs participant names/initials | **verified:** `ProjectExpense.participants[].member` already exists (`lib/hooks/useProjectExpenses.ts:33`) — no type edit needed (that file is not in the allowed-modify set anyway) |

### 2.5 Swipe-to-delete (design demo "參考A6c")
Design: danger action area 72px wide (`bg-v2-danger`, icon + "刪除" 11px/700 `text-v2-on-lake`) revealed behind the card by `translateX(-72px)` (swipe left, action on right) or `translateX(72px)` (swipe right, action on left); `transition: transform .25s ease`.
Implementation spec: new `components/v2/expenses/swipe-row.tsx` (props: `onDelete`, `disabled`, `children`), pointer events (`onPointerDown/Move/Up` + `touch-action: pan-y`), threshold 40px snaps open to ±72px, tapping the red area calls `onDelete`, tapping elsewhere closes. Disabled in select mode. Because jsdom has no layout, unit-test the pure reducer `nextOffset(startX, currentX, openState)` extracted to helper `components/v2/expenses/swipe-math.ts` plus a click test on the delete button. `ExpenseCard` still exposes `onRequestDelete` — container (`expenses-v2.tsx`) unchanged.
**Accessibility (master D21, must follow):** the red delete `<button aria-label="刪除">` is **always in the DOM and focusable**. When the row is closed it is visually translated off-card, but it must NOT be `aria-hidden`, `display:none`, or `inert`. Focusing it (keyboard Tab) auto-expands the row so desktop/keyboard users can discover and activate delete; blurring while closed collapses. Do NOT add a test-only `defaultOpen`/`defaultOpenSide` prop that hides the button from accessibility. Existing test `fireEvent.click(getByRole("button",{name:"刪除"}))` must keep passing (the button is always present).
Accessibility caveat to REPORT: without a visible trash button, delete is discoverable only by gesture; desktop users cannot swipe -> add right-click? Not in design; flag to user.

### 2.6 Tests to add/update (tests/components/v2/expenses-v2.test.tsx)
- UPDATE: "groups by payment day and renders card details" (remove "建立" assertion; assert `付款日期` + `11/16`).
- UPDATE: "falls back to the category label..." — category label is no longer rendered below the icon, but fallback title still equals the label when description is empty: `getByRole("link", {name: /交通/})` still OK. Footer test id `expense-footer-e2` is gone -> new assertions on `共2人分攤` and `我付款`.
- UPDATE: "shows the count line and wires clear..." — remove 清除-link click; assert 移除篩選 chip calls `onClearFilters`.
- UPDATE: "hides the clear button without active filters" -> assert no "移除篩選".
- ADD: filter panels: open 類別 -> 8 checkboxes (`getAllByRole("checkbox")`), click 餐飲 -> `onToggleCategory("food")`, in-panel 清除 -> `onClearCategories`; payer single-select behaviour (`onSetPayers`), amount sliders `fireEvent.change` -> `onAmountRange([min,max])`, date panel renders calendar and 清除; outside click closes (mousedown on document.body); Escape closes; right-aligned panel class for 參與者.
- ADD: swipe-math unit tests (>= 6 cases: below threshold snaps back, left past threshold opens left, right opens right, already open + tap closes, vertical movement ignored, clamp at ±72).
- ADD: `swipe-row.test.tsx` (focus auto-expands, blur collapses, delete button always in DOM and focusable, disabled in select mode) and `section-card.test.tsx`; both are required by master spec §6.
- Keep `no-hardcoded-colors.test.ts` green: no `#hex`, `bg-white`, `text-white`, `dark:` in new files; use `text-v2-on-lake`, `bg-v2-knob`.

## 3. A7b 成員 — `components/v2/members/members-v2-view.tsx`

Design: one section card (`mx-4 mt-3.5 mb-4 rounded-2xl border border-v2-line bg-v2-surface p-4`):
- Header row (mb-1): heading **成員列表** `text-[13px] font-bold text-v2-lake`; right side two **labelled** buttons: `h-8 px-2.5 rounded-lg border border-v2-lake-border bg-v2-lake-soft text-xs font-semibold text-v2-lake gap-[5px]` with Share2 15px + text "分享" (aria-label stays "邀請成員") and UserPlus 15px + text "增加成員" (aria-label stays "手動新增成員").
- Sub row (mb-3): left `成員組成 . 4 位旅伴` 12px ink-muted (note the literal " . " separator in design — implement as `成員組成 · {n} 位旅伴`); right link **前往專案設定修改加入方式** `text-xs font-medium text-v2-link` -> `/projects/{id}/settings`. (New link, route exists.)
- Rows: `py-3.5` (14px), divider `border-b border-v2-line-soft`, last row `pt-3.5` without divider; avatar 44px; name 13/700; badges: 建立者 (`bg-v2-lake-soft text-v2-lake`), 你 (`bg-v2-surface border border-v2-lake-border text-v2-lake`, was bg-paper), 佔位成員 (`bg-v2-sand text-v2-ink-muted`); email 12px muted; remove icon (UserMinus 16px, `text-v2-danger`).

| Gap | Current | Change |
|-----|---------|--------|
| card | list card only; count + 批次 + 2 square icon buttons float OUTSIDE above the card | move all header content inside the card; list becomes rows inside same card (remove `overflow-hidden rounded-2xl border` wrapper, remove `p-3.5` row padding -> `py-3.5`). |
| action buttons | 32px square, icon only | labelled pill buttons (above). Keep aria-labels "邀請成員"/"手動新增成員" and `title`s so existing tests pass (tests use `getByRole("button",{name:"邀請成員"})`; accessible name comes from aria-label, OK). |
| 批次 button | text button next to count, owner only | not in design -> KEEP, place it in the sub-row left after "N 位旅伴"? Simplest: put it in the sub row between text and link is crowded; put it right-aligned at the end of the header row as plain text button `text-xs font-bold text-v2-link` before the two pills ONLY when `isOwner`. REPORT. |
| count text | `3 位旅伴` (test: `getByText("3 位旅伴")`) | `成員組成 · 3 位旅伴` | Test must change to `getByText("成員組成 · 3 位旅伴")`. |
| 你 badge bg | `bg-v2-paper` | `bg-v2-surface` | change; border token already lake-border. |
| avatar tones | lake-tint, coral-soft, plum-soft, rose-soft, gold-soft | design: lake-tint(D2EAE1), coral(FBE3D2 ~ coral-soft), plum-soft, then sand placeholder | same as current; no change. |
| top bar | default weight | 17px/600 | X1 `titleClassName="text-[17px] font-semibold"` — apply to all 3 V2TopBar usages in members-v2.tsx (loading/not-found) and view for consistency. |
| bottom `移除 N 位` bar | exists | not in design | keep. |
| `confirm()` in `removeOne` | native confirm | n/a | untouched (existing behaviour). |

Tests (tests/components/v2/members-v2.test.tsx): update count text; add: heading "成員列表" exists; link "前往專案設定修改加入方式" has href `/projects/p1/settings`; both pill buttons render visible text "分享" / "增加成員"; owner-only 批次 still hidden for non-owner (existing).

## 4. Problem points to report to the user (A5b/A6b/A7b)
1. A6b removes the 批次 button, 建立日期 filter, 建立 time line, trash button, and the AI FAB; code keeps batch + FAB (existing functions), drops 建立日期 filter UI, 建立 time line and trash button (replaced by swipe). Confirm the user is OK with keeping batch/FAB.
2. Swipe-to-delete has no desktop affordance; flag.
3. 付款人 filter becomes single-select in design while data layer is multi; implemented as single via `setPayers`.
4. 幣別 filter chip not in design; kept only for multi-currency projects.
5. A5b/A7b contain currency select, rate note, ad slot, sponsor card, 各人收支, 批次 — not in design; kept and restyled where cheap.
6. Design amount format "NT$ 2,400" vs code "TWD 2,400".
7. New design tokens needed: `danger-wash`, `danger-border` (light+dark).
8. Filter dropdowns cannot use Portal (token scope); custom absolute panel w/ outside-click handling.
9. Per-page title weights require `titleClassName` prop on `V2TopBar`.
10. `#FBE3D2` approximated by `coral-soft` (#FBEAE0).

## 5. Files summary
Modify: `components/v2/layout/v2-top-bar.tsx`, `components/v2/settle/{settle-v2-view,settle-summary-grid,settlement-list,member-balances}.tsx`, `components/v2/expenses/{expenses-v2-view,expense-card,expense-summary-card,expense-filter-bar,expenses-v2}.tsx`, `components/v2/members/{members-v2-view,members-v2}.tsx`, `app/globals.css` (2 tokens x light/dark + `.v2-scroll`), tests: `tests/components/v2/{settle-v2,expenses-v2,members-v2}.test.tsx`.
Create: `components/v2/expenses/{filter-popover,filter-panels,swipe-row,swipe-math}.tsx|ts`, `components/v2/use-dismiss.ts`, tests `tests/components/v2/{filter-panels,swipe-math,v2-top-bar}.test.ts(x)`.
Never touch: `components/v1/**`, `components/expense/expense-filter-content.tsx`, `components/ui/**`, `lib/hooks/useExpenseFilters.ts` (additive changes only if absolutely required), prisma, `app/api/**`.
