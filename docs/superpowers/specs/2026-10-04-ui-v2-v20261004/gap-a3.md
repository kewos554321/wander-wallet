# Gap report A3 family — 新增/編輯支出 + 類別勾選狀態 (`AddExpense` / `EditExpense` / `CategorySelectedState`)

## 1. Header

Scope audited against the code on `feat/ui-v2-m6` (working tree; branch base includes `f6f74aa` "chore: Add v20261004 design canvas snapshot").

| Board | File (v20261004) | Status | Notes |
|---|---|---|---|
| A3d | `design/project-v20261004/AddExpense-ngs7-sections.dc.html` | **CHANGED** (was `project-v20261003/`) | Authoritative A3 board (superset: 2 payers, personal-mode ON, 分攤明細, expanded location). |
| A3b | `design/project-v20261004/AddExpense-section-demo.dc.html` | **CHANGED** | Same delta as A3d, simpler state (1 payer, personal-mode OFF). No extra work. |
| A3f | `design/project-v20261004/CategorySelectedState-discuss.dc.html` | **NEW** | Design-discussion board documenting the category checked/unchecked colour rule. |
| A21d | `design/project-v20261004/EditExpense-ngs7-sections.dc.html` | **NEW** | Authoritative A21 board (superset). |
| A21b | `design/project-v20261004/EditExpense-section-demo.dc.html` | **NEW** | Simpler edit state. No extra work. |

Code under review: `components/v2/expense-form/**` (view + `amount-card.tsx`, `category-picker.tsx`, `payer-picker.tsx`, `split-editor.tsx`, `split-summary.tsx`, `section-card.tsx`), `app/projects/[id]/expenses/new/page.tsx`, `app/projects/[id]/expenses/[expenseId]/edit/page.tsx`.

**Routes need no change.** Both pages already dispatch through `UiVersionSwitch` → `ExpenseFormV2` (`new/page.tsx:9-16`, `edit/page.tsx:9-16`); edit is `ExpenseFormV2` with `mode="edit"`. Create and edit share **the same components** — there is a single `ExpenseFormV2View` (`expense-form-v2-view.tsx:33`) and both routes render it. `ExpenseFormV2` only toggles title/delete/notify copy by `mode` (`expense-form-v2.tsx:82`, `:283`).

### Delta isolation (A3b/A3d, v20261003 → v20261004)

`diff design/project-v20261003/AddExpense-ngs7-sections.dc.html design/project-v20261004/AddExpense-ngs7-sections.dc.html` (A3b is an identical set of hunks). The **only** changes are:

1. Amount card: old gradient card → dynamic style. `{{amountCardStyle}}` = `showCalculator ? 'background:#1B5847;border:1px solid #1B5847;' : 'background:#D2EAE1;border:1px solid #B7D9CB;'` (lines 31, 559-561).
2. Calculator button background `#FFFFFF` → `#FAF7F2` (line 34).
3. **New inline calculator panel** inside the amount card, toggled by the 計算機 button; when open the amount input row is hidden (`showAmountInput = !showCalculator`), and the card turns solid lake (lines 40-54, 559-632).
4. Category selected pill: `border:1.5px solid #2F8F74;background:#EAF5F1;color:#1B5847` (lake) → `border:1.5px solid #8F3714;background:#FBEAE0;color:#8F3714` (its own identity colour) (line 74).
5. Bottom submit amount became dynamic (`新增支出 · NT$ {{amountDisplay}}`, line 412) — current code already renders a dynamic `formatCurrency` amount, so **no change** (D17 keeps `TWD`, not `NT$`).

A3f formalises (4) as a rule and adds the note that 餐飲's selected border was a brighter coral `#E8825A` and is now unified to `#8F3714` "跟自己的文字色一樣".

### A21 (NEW) vs A3 (CHANGED) — stale-copy call-out

A21b/A21d are **copies of the pre-calculator `AddExpense` revision plus edit chrome**. Grep confirms both edit boards have `showCalculator` count `0`, calc button `background:#FFFFFF`, and category selected `border:1.5px solid #2F8F74` (lake). The edit boards therefore **lag A3d on the two shared components** (calculator + category state). Because create/edit render the *same* `AmountCard`/`CategoryPicker`, the correct reading is A3d/A3f win for shared elements; A21's stale depiction must not be implemented literally. Recorded as open question Q1.

A21 genuinely differs from A3 only in chrome (top bar delete action, submit copy, notify copy) — see §2.2.

---

## 2. Gap table

### 2.1 Shared superset — A3d authoritative (A3b/A21 reuse the same components)

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Amount card — closed state | `{{amountCardStyle}}` closed = `background:#D2EAE1;border:1px solid #B7D9CB` (`AddExpense-ngs7-sections.dc.html:31`, `:560`). `#D2EAE1`=`--v2-lake-tint`, `#B7D9CB`=`--v2-lake-edge` | `border border-v2-lake-border bg-gradient-to-br from-v2-lake-soft to-v2-paper` — `amount-card.tsx:18` | Replace with `border border-v2-lake-edge bg-v2-lake-tint` (drop the gradient). |
| Amount card — calculator-open state | Card `background:#1B5847;border:1px solid #1B5847`; label `color:#FAF7F2;opacity:.85` (`:559`,`:561-562`) | card styling does not change; label class shared `SECTION_TITLE` | Conditional: open → `border-v2-lake bg-v2-lake`, label `text-v2-paper opacity-85`. |
| 計算機 button | `background:#FAF7F2;color:#1B5847;border:none;border-radius:99px;padding:6px 14px;font-size:12px;font-weight:700` (`:34`) | `bg-v2-surface` (`#FFFFFF`) — `amount-card.tsx:27` | `bg-v2-paper`; keep the rest. |
| Calculator panel — placement | Rendered **inside** the amount card, between the header row and the (now hidden) value row; toggles the value row off (`sc-if showCalculator` / `showAmountInput`, `:40-63`) | Rendered as a sibling **below** the card via shared `components/ui/calculator.tsx` — `expense-form-v2-view.tsx:56-67`; amount input stays visible (`amount-card.tsx:33-46`) | Move calculator inside `AmountCard`; hide the currency+input row while open. New v2 component (below). |
| Calculator panel — display box | `background:#FFFFFF;border-radius:14px;padding:14px`; expr `font-size:12px;color:#B7AE9D;font-family:ui-monospace,monospace;text-align:right`; result `font-family:'Noto Serif TC';font-weight:700;font-size:26px;color:#1B5847;text-align:right` (`:42-44`) | shared v1 `Calculator` uses `bg-white dark:bg-slate-900`, `text-primary`, `text-3xl`, `text-muted-foreground` — `components/ui/calculator.tsx:76-84` | New pad: `rounded-[14px] bg-v2-surface p-3.5`; expr `min-h-[16px] text-right font-mono text-xs text-v2-ink-subtle`; result `text-right font-v2-serif text-[26px] font-bold text-v2-lake tabular-nums`. |
| Calculator panel — keypad | `grid-template-columns:repeat(4,1fr);gap:7px`; keys `height:42px;border-radius:11px;font-size:16px;font-weight:700`; operators/backspace/C `background:rgba(250,247,242,.14);color:#FAF7F2`; digits `background:#FAF7F2;color:#1B1815`; C text `#F3B3A0`; apply `background:#FAF7F2;color:#1B5847`; labels `C ÷ × ⌫ 7 8 9 − 4 5 6 + 1 2 3 ✓ 0(span2) .` + 1 hidden (lines 46-49, 594-612) | shared v1 `Calculator` grid `gap-2`, `h-11`, `bg-slate-100`/`bg-red-100`/`bg-primary`, labels use `=` not `✓` — `components/ui/calculator.tsx:88-135` | New pad: `grid grid-cols-4 gap-[7px]`; key `h-[42px] rounded-[11px] text-base font-bold`; op/backspace `bg-v2-paper/15 text-v2-paper`; digit `bg-v2-paper text-v2-ink`; clear `bg-v2-paper/15 text-v2-danger-edge`; apply `bg-v2-paper text-v2-lake`. Keep design labels (`−` U+2212, `✓`). `#F3B3A0` has no exact token → nearest `--v2-danger-edge` `#E8A796` (see §4). |
| Calculator behaviour | Open prefills expression with the current amount (`calcExpr = String(amount)`); apply writes the evaluated number back and closes (`calcApply`, `:574-590`) | shared `Calculator` already: `initialValue`, `onApply(number)`, `onClose` — `expense-form-v2-view.tsx:60-65` | Reuse the same logic in the new pad; view keeps `showCalculator` state and `actions.setAmount(String(value))`. |
| Category selected state | Rule (A3f `:28`): bg + text are the category's **fixed identity colour**; only the **border** changes (unchecked = `#E7DFD2`, checked = the category's own colour) and font-weight 600→700. Checked 餐飲 = `border:1.5px solid #8F3714;background:#FBEAE0;color:#8F3714` (A3f `:43`; A3d `:74`) | Checked overrides everything to lake: `border-[1.5px] border-v2-lake-mid bg-v2-lake-soft font-bold text-v2-lake` — `category-picker.tsx:19-23` | Checked = `${CATEGORY_TONES[key]}` (identity bg+text) + `border-[1.5px] border-<identity>` + `font-bold`. Unchecked stays `border-v2-line` + `${CATEGORY_TONES[key]}` + `font-semibold` (**already correct**, `:22`). Needs a picker border/text map (§4). |
| Category identity colours | 餐飲 `#FBEAE0`/`#8F3714`, 交通 `#E7F3EE`/`#2F8F74`, 住宿 `#EFEAF7`/`#6B5B95`, 票券 `#F7EFDD`/`#9C7A28`, 購物 `#F6E9EE`/`#A14A68`, 娛樂 `#E8EEF7`/`#4A6FA5`, 禮品 `#F7EFDD`/`#9C7A28`, 其他 `#F1EBE0`/`#6E6860` (A3f `:42-85`) | `CATEGORY_TONES` (`category-style.ts:3-12`) already matches 6/8 exactly; 交通 bg is `--v2-lake-soft` `#EAF5F1` vs design `#E7F3EE`; 餐飲 text is `--v2-coral` `#E8825A` vs design `#8F3714` | 餐飲 text (picker only) → new `--v2-coral-deep` `#8F3714`. 交通 bg `#E7F3EE`: nearest existing token is `lake-soft` (Δ3/2/3) — keep `lake-soft`, record as accepted approximation (do **not** change the shared token; A2/A6b list chips use it). See §4/Q2. |
| Bottom submit amount | `新增支出 · NT$ {{amountDisplay}}` / `儲存變更 · NT$ 1,280` (`:412`, A21d `:397`) | already dynamic; create `新增支出 · ${amountLabel}` `view.tsx:39` | Create: **no change**. Edit: see §2.2. Keep `TWD` (D17). |
| Everything else (section cards, titles, description/date/location/image cards, payer card single-row + summary, 分攤成員 card, 分攤明細 table, pills opacity, `$` amounts, toggle, pin) | unchanged vs v20261003 | implemented under `gap-a3.md` (2026-10-03) | **no change**; do not reopen items assessed in `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a3.md` §1. |

### 2.2 A21 edit-only chrome (NEW board; whole-board comparison)

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Top bar — right action | Circular 32px button, `background:#FBEAE0;color:#C0533A`, trash icon 15px, `aria-label="刪除此筆"` (A21b `:27-30`, A21d `:28`) | No top-bar action; delete is a full-width bottom button `刪除支出` — `expense-form-v2-view.tsx:135-146` | Render a top-bar icon action in edit mode: `V2TopBar actions={<button aria-label="刪除此筆" className="flex h-[34px] w-[34px] … rounded-full bg-v2-coral-soft text-v2-danger"><Trash2 className="h-[15px] w-[15px]" /></button>}`. `#FBEAE0`=`--v2-coral-soft`; `#C0533A`≈`--v2-danger` `#C4472F` (see §4). Remove the bottom full-width button (design shows only the top-bar icon). |
| Top bar — left button | 32px circle `background:#F1EBE0` + X (`aria-label="取消"` edit / `"關閉"` create) (`:23-26`) | `border border-v2-line bg-v2-surface` + `ChevronLeft`, `aria-label="返回"` — `v2-top-bar.tsx:17-30` | **Pre-existing / not in the A3 delta**, but visible in both changed+new boards. `V2TopBar` is app-wide (used by trip/settle/expenses/settings…). If pursued, add an optional `close` variant defaulting to today's back arrow so only the expense form changes. Low priority — see Q3. |
| Submit label (edit) | `儲存變更 · NT$ 1,280` (A21b `:326`, A21d `:397`) | `"儲存變更"` (no amount) — `expense-form-v2-view.tsx:39` | `props.mode === "edit" ? \`儲存變更 · ${amountLabel}\` : \`新增支出 · ${amountLabel}\``. |
| Notify LINE sub-copy (edit) | `變更後自動發送通知到群組` (A21b `:321`, A21d `:392`) | `儲存後自動發送通知到群組` for both modes — `expense-form-v2-view.tsx:130` | `props.mode === "edit" ? "變更後自動發送通知到群組" : "儲存後自動發送通知到群組"`. |
| Amount card / category / calculator in A21b/A21d | stale (no calculator, white calc button, lake category) | current edit code = create code | Apply the §2.1 changes to the **shared** components; do not implement the A21 stale copy (Q1). |

---

## 3. Files to modify

All under `components/v2/**` unless noted. No v1/API/Prisma changes.

- `components/v2/expense-form/amount-card.tsx` — restyle the card (closed = `bg-v2-lake-tint border-v2-lake-edge`; open = `bg-v2-lake border-v2-lake`), calculator button → `bg-v2-paper`, accept an optional `calculatorOpen` + `children` (or `calculator`) and hide the value row while open.
- `components/v2/expense-form/calculator-pad.tsx` — **NEW**. Token-only inline pad (display box + 4-col keypad, design labels/styles), props `initialValue`, `onApply(number)`, `onClose`. Re-implements the small eval/operator/dot/backspace logic (do not import the v1 component).
- `components/v2/expense-form/expense-form-v2-view.tsx` — replace `<Calculator>` (`components/ui/calculator`) with `<CalculatorPad>` rendered inside `AmountCard`; wrap delete in `V2TopBar actions` for edit and drop the bottom delete block; edit submit label with amount; notify sub-copy by mode.
- `components/v2/expense-form/category-picker.tsx` — checked-state styling uses the category identity tone + identity border (map below); unchecked unchanged.
- `components/v2/category-style.ts` — add a picker-scoped palette (e.g. `CATEGORY_PICKER_TONES: Record<ExpenseCategory, { bg: string; fg: string; border: string }>`). Keep `CATEGORY_TONES` **unchanged** so A2/A6b list & filter chips stay `#E8825A` for 餐飲.
- `components/v2/layout/v2-top-bar.tsx` — (only if Q3 is accepted) optional `backVariant?: "back" | "close"`; default unchanged. The delete action itself uses the existing `actions` slot, no change needed.
- `app/globals.css` — add the one new token (both `[data-ui="v2"]` and `.dark [data-ui="v2"]` blocks + `@theme inline`), see §4.
- Tests (see §5): `tests/components/v2/expense-form-v2-view.test.tsx`, `tests/components/v2/expense-form-v2.test.tsx`, new `tests/components/v2/category-picker.test.tsx`, new `tests/components/v2/calculator-pad.test.tsx`, `tests/components/v2/v2-tokens.test.ts` (new token).

Do **not** touch: `components/ui/calculator.tsx` (shared with v1 `components/expense/expense-form.tsx`), `components/ui/**`, `components/location-picker.tsx`, `app/api/**`, `prisma/**`, `lib/**`.

---

## 4. New tokens

Add one token, in all three places (`@theme inline` ~L354-358, `[data-ui="v2"]` ~L399-403, `.dark [data-ui="v2"]` ~L444-448):

| Token | Light | Dark (proposal) | Used for |
|---|---|---|---|
| `--v2-coral-deep` | `#8F3714` | `#E89872` | 餐飲 checked/unchecked identity text + checked border in the v2 category picker (A3f/A3d). |

Tailwind class: `text-v2-coral-deep` / `border-v2-coral-deep` (add `--color-v2-coral-deep: var(--v2-coral-deep);` in `@theme inline`). Add it to `tests/components/v2/v2-tokens.test.ts` `NEW_TOKENS`. The `no-hardcoded-colors.test.ts` guard (`tests/components/v2/no-hardcoded-colors.test.ts:7`) bans `-[#hex]`, `bg-white`, `text-white`, `bg-black`, `dark:`; the new pad uses only tokens (`bg-v2-paper/15` is a token + opacity modifier, not a hex), so the guard stays green.

**No other new tokens are required.** Approximations with existing tokens (record, do not add tokens):
- `#C0533A` (edit top-bar delete icon) ≈ `--v2-danger` `#C4472F` (also equals the sibling board's `--v2-danger` mapping in `gap-a5.md:11`).
- `#F3B3A0` (calculator `C` text) ≈ `--v2-danger-edge` `#E8A796`.
- `#E7F3EE` (交通 identity bg) ≈ `--v2-lake-soft` `#EAF5F1`.
- `rgba(250,247,242,.14)` (operator key bg) = `bg-v2-paper/15`.
- `#FAF7F2`=`--v2-paper`, `#FFFFFF`=`--v2-surface`, `#B7AE9D`=`--v2-ink-subtle`, `#1B1815`=`--v2-ink`, `#1B5847`=`--v2-lake`, `#D2EAE1`=`--v2-lake-tint`, `#B7D9CB`=`--v2-lake-edge`, `#E7DFD2`=`--v2-line`, `#FBEAE0`=`--v2-coral-soft`.

---

## 5. Tests to add / update (exact paths + cases)

`tests/components/v2/expense-form-v2-view.test.tsx`
- L7 mock `@/components/ui/calculator` → remove; if the new pad is a separate module, mock `@/components/v2/expense-form/calculator-pad` (or inline-render). Add:
  - amount card closed classes contain `bg-v2-lake-tint` + `border-v2-lake-edge`, not `bg-gradient-to-br`.
  - clicking 計算機 shows the pad and hides the `金額` input; card gets `bg-v2-lake`.
  - pad apply writes back `actions.setAmount` and closes (assert `getByLabelText("金額")` value).
  - checked category receives its identity tone + identity border (e.g. click 交通 → `border-v2-lake-mid` + `bg-v2-lake-soft` + `text-v2-lake-mid`; click 餐飲 → `border-v2-coral-deep` + `text-v2-coral-deep`); unchecked has `border-v2-line`.
- L343-351 `edit mode shows 儲存變更 and delete`: update to `儲存變更 · TWD 100` and the top-bar `aria-label="刪除此筆"` (bottom `刪除支出` removed).

`tests/components/v2/expense-form-v2.test.tsx`
- L41 remove the `@/components/ui/calculator` mock.
- L106, L223 `儲存變更` → `儲存變更 · TWD 100`.
- L135 `刪除支出` → `刪除此筆` (top-bar icon).

`tests/components/v2/category-picker.test.tsx` (NEW)
- unchecked: `border-v2-line`, identity bg+text, `font-semibold`.
- checked: identity bg+text + identity border + `font-bold`; 餐飲 border `border-v2-coral-deep`; toggling the same category clears it (`onChange("")`).

`tests/components/v2/calculator-pad.test.tsx` (NEW)
- operator guard (no two operators in a row), dot guard, backspace, clear, apply calls `onApply` with the evaluated number, display shows expression + `= ` result, keypad labels include `−` and `✓`.

`tests/components/v2/v2-tokens.test.ts`
- add `"coral-deep": ["#8F3714", "#E89872"]` to `NEW_TOKENS`.

`tests/components/v2/v2-top-bar.test.tsx`
- only if Q3 accepted: a case asserting the default back arrow is unchanged and the new `close` variant renders the X.

`tests/components/v2/no-hardcoded-colors.test.ts` — no change; must stay green (new files included automatically).

Run: `npm run lint && npm run test:run -- tests/components/v2`. Coverage for `components/v2/expense-form/**` must not drop below baseline; new files ≥90% lines (milestone-6 §6).

---

## 6. Open questions / API gaps / UI-only items

- **Q1 (blocker-ish, decide first): A21d/A21b are stale copies of pre-calculator `AddExpense`.** They show no calculator and the lake category selected state, contradicting A3d/A3f. Since create and edit reuse the same `AmountCard`/`CategoryPicker`, recommend implementing A3d/A3f on the shared components (edit gets them for free) and treating the A21 amount-card/category depiction as superseded. Confirm.
- **Q2: 餐飲 identity colour conflict.** The picker (A3f/A3d) uses `#8F3714`; the list/overview boards (`ExpenseList-sections.dc.html`, `Trip-m0lh.dc.html`, both byte-identical to v20261003) use `#E8825A` for the 餐飲 chip. Resolution proposed: picker-scoped `CATEGORY_PICKER_TONES` with the new `--v2-coral-deep`, leaving `CATEGORY_TONES` untouched so A2/A6b are not regressed. Confirm vs. desiring a single global 餐飲 colour.
- **Q3: top-left close (X, sand) vs current back-arrow (white).** Not part of the A3 snapshot delta (unchanged v20261003→v20261004), but present in the new A21 boards. `V2TopBar` is app-wide; propose an opt-in `close` variant only if this milestone owns it. Otherwise record as pre-existing.
- **Multi-payer (UI-only, D12).** A3d/A21d show 2 payers with per-payer amounts, 全選 and pin/remove. API/Prisma has a single `paidByMemberId`; **no API change proposed**. Current single-payer read-only row + `$X = $X / $X` summary stays. Anything beyond one payer needs schema + settlement rework + a v2-only API (separate project).
- **Amount input separators.** Design renders the input value as `{{amountDisplay}}` (`1,280`); current input holds the raw string. Keep raw (display-only); not a deviation worth code (carried over from the 2026-10-03 note).
- **Calculator keypad `−`/`✓` glyphs and `#F3B3A0`.** Uses `−` (U+2212) and `✓`; `C` colour mapped to `--v2-danger-edge` as nearest — confirm or add an exact token later.
- **Delete UX change.** Moving delete to a small top-bar icon (design) makes the destructive action more prominent/riskier on mobile; the existing `ConfirmDeleteDialog` confirm flow stays (`expense-form-v2.tsx:285-293`), so behaviour is still guarded.

---

## 7. v1 regression risks

1. **`components/ui/calculator.tsx` is shared** with `components/expense/expense-form.tsx` (v1). Do not edit it; build the new `components/v2/expense-form/calculator-pad.tsx`. Removing the v2 import of the shared component does not affect v1.
2. **`CATEGORY_TONES` / `category-style.ts` is v2-only** but shared by v2 lists/filters (`recent-expenses.tsx:38`, `expenses/expense-card.tsx:44`, `expenses/filter-panels.tsx:56`). Keep it unchanged; add the picker-scoped map so A2/A6b chips (`#E8825A`) do not regress. Grep before editing.
3. **`V2TopBar` is v2-only but app-wide** (trip/expense list/settle/members/settings/stats/new-project). Any change must be an opt-in prop with the current default preserved; the delete action uses the existing `actions` slot and affects only the expense form.
4. **Token-only rule.** New code must not introduce `#hex`, `bg-white`/`text-white`/`bg-black`, or `dark:` (`no-hardcoded-colors.test.ts`). `bg-v2-paper/15` is token + opacity, allowed. New token must be wired in all three CSS blocks, or the `v2-tokens.test.ts` check fails.
5. **No server/API/Prisma change.** Save payload (`participants`, `splitDetail`, `paidByMemberId`) and `use-expense-draft.ts` are untouched, so v1 edit read-only rules and settlement truth are unchanged.
6. **Test mocks.** Removing the `@/components/ui/calculator` mocks in both expense-form test files is required after the swap; leaving a stale mock while the real pad renders would mask failures.
7. **Milestone-6 decisions still bind:** D17 (`TWD`, not `NT$`), D18 (shared `ImagePicker` style as-is), D12 (single payer UI-only), D25 (payer-card summary exists alongside the split card).
