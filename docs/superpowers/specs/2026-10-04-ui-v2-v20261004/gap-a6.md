# Gap report A6b — 全部支出 (Expense list) + filter dropdowns

Design sources (v20261004):
- `design/project-v20261004/ExpenseList-sections.dc.html` — **CHANGED vs v20261003** (delta only, see Part A).
- `design/project-v20261004/FilterDropdowns-test.dc.html` — **byte-identical to v20261003** (verified with `diff`); treated as a "does current code still match?" audit (Part B).

Code under review: `components/v2/expenses/{expense-summary-card,expense-filter-bar,filter-popover,filter-panels,expense-card,expenses-v2-view,expenses-v2,swipe-row}.tsx`.
Repo facts used: `rounded-lg` = 10px, `rounded-xl` = 14px, `rounded-2xl` = 16px (`--radius: 0.625rem`, `--radius-xl: calc(var(--radius)+4px)`, `app/globals.css:40-43,61`). Token check: `#D2EAE1` = `--v2-lake-tint`, `#1B5847` = `--v2-lake`, `#E7DFD2` = `--v2-line`, `#F0EAE0` = `--v2-line-soft`, `#B7AE9D` = `--v2-ink-subtle`, `#6E6860` = `--v2-ink-muted`, `#C4472F` = `--v2-danger`, `#2F8F74` = `--v2-lake-mid`, `#EAF5F1` = `--v2-lake-soft`, `#F5F1E8` ≈ `--v2-sand` (#F1EBE0).

Baseline for non-delta behaviour: `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a5-a7.md` §2.

---

## 1. Header

Scope: A6b expense list + filter dropdowns, auditing the v20261004 snapshot against the code on `feat/ui-v2-m6`. The ExpenseList board changed by exactly two HTML lines; the whole rest of the board (summary card frame, search field, chip row, count line, expense card, swipe demo) is unchanged from v20261003 and was already covered in `gap-a5-a7.md` §2 — it is out of scope here except where noted. The FilterDropdowns board is unchanged, so this part is a regression audit of the filter-panel rebuild commits (`5c7b103` date panel, `7be3d37` dual-range amount slider, `cd321c6` conditional clear).

## 2. Gap table

### Part A — ExpenseList-sections.dc.html (changed board: delta only)

Delta isolated with `diff design/project-v20261003/ExpenseList-sections.dc.html design/project-v20261004/ExpenseList-sections.dc.html` — only lines 44 and 54 differ:

```html
<!-- v20261003 -->
<span style="width:28px;height:28px;border-radius:9px;background:#FFFFFF;color:#1B5847; ...">  <!-- count icon -->
<span style="width:28px;height:28px;border-radius:9px;background:#FFFFFF;color:#E8825A; ...">  <!-- average icon -->
<!-- v20261004 -->
<span style="width:28px;height:28px;border-radius:50%;background:#D2EAE1;color:#1B5847; ...">   <!-- count icon -->
<span style="width:28px;height:28px;border-radius:50%;background:#D2EAE1;color:#1B5847; ...">   <!-- average icon -->
```

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---------|--------------------|--------------------------|---------------|
| Summary stat icon — 支出紀錄 / count | `28×28`, `border-radius:50%`, `background:#D2EAE1`, `color:#1B5847` | `flex h-7 w-7 … rounded-[9px] bg-v2-surface text-v2-lake` — `components/v2/expenses/expense-summary-card.tsx:27` | `rounded-[9px] bg-v2-surface` → `rounded-full bg-v2-lake-tint`; keep `text-v2-lake`. Result: `flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-v2-lake-tint text-v2-lake` |
| Summary stat icon — 平均每筆 / average | `28×28`, `border-radius:50%`, `background:#D2EAE1`, `color:#1B5847` | `flex h-7 w-7 … rounded-[9px] bg-v2-surface text-v2-coral` — `components/v2/expenses/expense-summary-card.tsx:37` | `rounded-[9px] bg-v2-surface text-v2-coral` → `rounded-full bg-v2-lake-tint text-v2-lake` |
| Everything else in Part A (summary frame `rounded-[18px]`, `總支出` 12/600 muted, `NT$…` serif 24/700 ink, date chip, divider, search field, 3-col chip grid, 移除篩選 chip, count line, day label 11/700, expense card, swipe demo) | unchanged vs v20261003 | already assessed in `gap-a5-a7.md` §2 | **no change** for this delta pass; do not re-open previously accepted items |

Both changed values map to existing v2 tokens (`--v2-lake-tint`, `--v2-lake`), so no new token and no `no-hardcoded-colors` risk.

### Part B — FilterDropdowns-test.dc.html (unchanged board: verify current code)

Trigger geometry, panel widths (類別 232 / 付款人 184 / 參與者 190 / 金額 230 / 付款日期 236), header title 10/700 subtle, 清除 danger chip, `max-height:176px` list, 15px checkbox `rounded-[4px]`, 18px swatch `rounded-[5px]`, round payer control, dual-range amount slider, and the date calendar grid all **match** current code (see "no change" rows). Deviations found:

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---------|--------------------|--------------------------|---------------|
| Panel shell radius | `border-radius:12px` for 類別/付款人/參與者/金額 (`FilterDropdowns-test.dc.html:46,147,222,297`); **`10px` for the date panel** (`:363`) | `rounded-xl` (=14px) for all five — `components/v2/expenses/filter-popover.tsx:52` | Default the shell to `rounded-[12px]`; add a `panelRadiusClass?: string` prop to `FilterPopover` and pass `rounded-[10px]` for the 付款日期 popover (`expense-filter-bar.tsx:92`) |
| Open trigger chevron | When open, the chevron rotates 180° (`transform:rotate(180deg)`), e.g. `:44`, `:145`, `:220`, `:295`, `:361` | `<ChevronDown>` never rotates — `components/v2/expenses/filter-popover.tsx:47` | Add `rotate-180` when `open` (both active and inactive) |
| Active + open trigger | Shows the count badge **and** the rotated chevron (類別 open in `:40-44`) | `active ? badge : chevron` — badge only, no chevron when `active` — `filter-popover.tsx:42-48` | Render the badge when `active`, and render the (rotated) chevron when `open`; only show the down-chevron in the idle, inactive, closed state |
| Date panel header | `padding:7px 10px`, `border-bottom:1px solid #E7DFD2`; title `11px/600 #1B1815`; 清除 = plain text `10px #6E6860`, no icon, `border-radius:5px`, `padding:2px 5px` — `FilterDropdowns-test.dc.html:364-367` | Reuses shared `PanelHeader`: `px-2.5 pb-1.5 pt-2`; title `text-[10px] font-bold text-v2-ink-subtle`; 清除 danger red with `CircleX` 11px; divider `bg-v2-line-soft` — `components/v2/expenses/filter-panels.tsx:11-26,239` | Give `DatePanel` a dedicated header: container `flex items-center justify-between border-b border-v2-line px-2.5 py-[7px]`, title `text-[11px] font-semibold text-v2-ink`, clear button `rounded-[5px] px-[5px] py-0.5 text-[10px] text-v2-ink-muted` (no icon) |
| Amount panel frame | `padding:10px 12px 14px`; header row `margin-bottom:8px`; **no divider** — `FilterDropdowns-test.dc.html:297-304` | Shared `PanelHeader` (header + `bg-v2-line-soft` divider) then content `px-2.5 pb-3 pt-2` — `filter-panels.tsx:166-167` | For `AmountPanel`, replace the shared header with an inline header (title + danger 清除) and no divider; sides `px-3`, top `pt-2.5`, bottom `pb-3.5` |
| Open trigger idle bg | `#F5F1E8` — `:142,217,292,355` | `bg-v2-sand` (#F1EBE0) — `filter-popover.tsx:27` | **Accepted deviation** — `#F5F1E8` has no v2 token; using `--v2-sand`. Record; add `--v2-sand-hover` only if exact match is required |
| Date selected / in-range colours | `--primary` solid / `--accent` (v1 theme tokens) per the panel note — `:332` | `bg-v2-lake` / `bg-v2-sand` — `filter-panels.tsx:282-284` | **Accepted deviation** — v2 token discipline + dark-mode support; visually equivalent in light mode. Already accepted in `gap-a5-a7` F8 |
| Payer list order (我 first) | 我, 志明, 小美, 阿凱 — `:156-174` | `members()` maps the current member's label to 我 but preserves hook order — `expense-filter-bar.tsx:46-47` | **No change** (mock-only ordering; hook list is data-driven) |
| Chip grid / count line / swipe demo | — | matches | **no change** |

## 3. Files to modify

Allowed set only (`components/v2/**`, `tests/**`):

- `components/v2/expenses/expense-summary-card.tsx` — both stat icon spans (circle + lake-tint; average icon colour → lake).
- `components/v2/expenses/filter-popover.tsx` — panel radius prop + open-chevron rotation/badge logic.
- `components/v2/expenses/filter-panels.tsx` — dedicated `DatePanel` header; divider-less `AmountPanel` frame.
- `components/v2/expenses/expense-filter-bar.tsx` — pass `panelRadiusClass="rounded-[10px]"` to the 付款日期 popover.
- `tests/components/v2/expenses-v2.test.tsx`, `tests/components/v2/filter-panels.test.tsx` — assertions below.

No change: `expense-card.tsx`, `expenses-v2-view.tsx`, `expenses-v2.tsx`, `swipe-row.tsx`, `swipe-math.ts`, `expense-filter-bar.tsx` structure, `app/globals.css`.

## 4. New tokens

**None.** The changed ExpenseList icons resolve entirely to existing tokens (`--v2-lake-tint` #D2EAE1, `--v2-lake` #1B5847). No `#hex`, `bg-white`/`text-white`, or `dark:` is introduced; `no-hardcoded-colors.test.ts` stays green. The only design colour without a token is the open-trigger bg `#F5F1E8`, already approximated by `--v2-sand` (accepted; do not add a token unless exact match is requested).

## 5. Tests to add/update

`tests/components/v2/expenses-v2.test.tsx`
- UPDATE `"shows the summary card"`: add `data-testid="summary-count-icon"` / `data-testid="summary-average-icon"` to the two spans in `expense-summary-card.tsx`, then assert both have `rounded-full` and `bg-v2-lake-tint`, and neither has `bg-v2-surface` / `text-v2-coral`.
- ADD: average icon has `text-v2-lake` (same as count icon).

`tests/components/v2/filter-panels.test.tsx`
- ADD `data-testid="filter-panel"` on the popover panel div and `data-testid="filter-chevron"` on the chevron in `filter-popover.tsx`, then:
  - "uses a 12px panel radius by default": open 類別 → panel has `rounded-[12px]`.
  - "uses a 10px radius for the date panel": open 付款日期 → panel has `rounded-[10px]`.
  - "rotates the chevron when open": open 付款人 → chevron has `rotate-180`.
  - "shows the badge and the chevron together when an active chip is open": `selectedCategories = {food}`, open 類別 → count badge `1` **and** chevron with `rotate-180` both present.
  - "renders the light date-panel header": open 付款日期 → title has `text-[11px]`, the 清除 button has `text-v2-ink-muted` and contains no `svg` (no `CircleX`), unlike the other panels.
  - "renders the amount panel without a divider": open 金額 → no `h-px bg-v2-line-soft` divider inside the panel.
- Keep existing cases green: `"opens the category panel with one checkbox per category"` (8), `"changes the amount range and clears"` (`fireEvent.change` on `最低金額`/`最高金額`), `"picks the range end from the date panel"`, outside-click / Escape / single-open.

No new token test needed. Existing `v2-tokens.test.ts` and `no-hardcoded-colors.test.ts` must remain green.

## 6. Open questions / API gaps / UI-only items

1. **No API gaps.** All data (payers, participants, categories, currencies, amount range, expense dates) already flows through `useExpenseFilters`; the changed ExpenseList delta is presentation-only.
2. Date panel header: the board intentionally mirrors the v1 shadcn `Popover+Calendar` (grey 清除, 11px title), while the other four panels use the v2 header. Confirm whether to special-case the date header or keep all five consistent (design says special-case).
3. Active-chip + open: design shows badge **and** chevron simultaneously; confirm this is wanted (adds width on a 3-col grid at 390px).
4. Panel radius: `gap-a5-a7` §X5 said 12px must be `rounded-[12px]`, but the code shipped `rounded-xl` (14px). Confirm we standardise the filter panels to 12px (and date 10px) rather than the 14px used by other v2 cards.
5. `#F5F1E8` open-trigger bg has no token; currently `--v2-sand` (accepted). Add `--v2-sand-hover` only on request.
6. Date selected/in-range uses v2 tokens instead of the design's v1 `--primary`/`--accent` (accepted, dark-mode safe).

## 7. v1 regression risks

- All changes are confined to `components/v2/**` and `tests/**`. No v1 file, `components/ui/**`, `components/expense/**`, `app/api/**`, `prisma/**`, or `lib/**` is touched — especially `lib/hooks/useExpenseFilters.ts` is untouched.
- `FilterPopover` is shared by all five v2 filter chips, so radius/chevron edits have a single v2-only blast radius, guarded by `filter-panels.test.tsx` (outside-click, Escape, single-open, clear wiring).
- `ExpenseSummaryCard` is rendered only by `ExpensesV2View` (v2 list); no v1 consumer.
- `no-hardcoded-colors.test.ts` scans `components/v2` only; the new classes use existing tokens, so it stays green and v1 styling is unaffected.
