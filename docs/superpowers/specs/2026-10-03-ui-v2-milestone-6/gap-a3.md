# A3b / A3d diff — design (v20261003) vs current code

Design files (both under `design/project-v20261003/`):
- A3d = `AddExpense-ngs7-sections.dc.html` (full screen, 390x2960). Personal-mode ON, 2 payers, 分攤明細 table, expanded location picker.
- A3b = `AddExpense-section-demo.dc.html` (390x1850). SAME page/same styling, just a simpler STATE: 1 payer, personal-mode OFF, collapsed location, NO 分攤明細 table, old minus/pin icons. A3d supersedes A3b. Implement A3d; A3b needs no extra work except: with ONE payer, the payer card shows one row `小雨 … $1,280` (see §4 payer).
- Route files (`app/projects/[id]/expenses/new/page.tsx`, `.../[expenseId]/edit/page.tsx`) already dispatch via `UiVersionSwitch` -> `ExpenseFormV2`. NO route change needed.
- No server/API/Prisma change is needed for A3. `shareAmount` stays settlement truth; `use-expense-draft.ts` logic unchanged (presentation only).

Already matches design (do NOT redo): CornerRightDown+Plus add-item icons, UserMinus remove icons, Pin/PinOff icons, `已選 N 人 / 金額相符` line, amount card gradient + 36px serif input, calculator pill, category 4-col grid (icons are 14px in code vs 16px in design -> change `h-3.5 w-3.5` to `h-4 w-4`), bottom submit bar.

Files (all under `components/v2/expense-form/` unless noted):
`expense-form-v2-view.tsx`, `amount-card.tsx`, `category-picker.tsx`, `payer-picker.tsx`, `split-editor.tsx`, `split-summary.tsx`; NEW `section-card.tsx`, NEW `location-picker-v2.tsx`; optional `components/ui/image-picker.tsx` (shared with v1 — see §5).

---
## 1. Gap table

### 1.0 Shared tokens (hex -> existing v2 token; NO new tokens required)
`#1B5847`=lake, `#24735D`=link, `#2F8F74`=lake-mid, `#EAF5F1`=lake-soft, `#D2EAE1`=lake-tint, `#DDEDE6`=lake-border, `#FAF7F2`=paper, `#FFFFFF`=surface, `#1B1815`=ink, `#6E6860`=ink-muted, `#B7AE9D`=ink-subtle, `#E7DFD2`=line, `#F0EAE0`=line-soft, `#F1EBE0`=sand, `#C9BFAC`=check, `#E8825A`=coral, `#FBEAE0`=coral-soft, `#C4602F`=coral-strong, `#F6DCD3`=danger-soft, `#C4432A`=danger-strong, `#FFFFFF` text on lake=on-lake.
Hexes with NO exact token (use nearest, do not add tokens, list in final problem list): `#FBE3D2` coral avatar bg (use coral-soft, already in `AVATAR_TONES`); `#DCD3C2` toggle-off track + item left border (use `v2-check`); `#DCEAE3` amount-card border (code already uses lake-border). If the owner wants pixel-exact, add `--v2-coral-avatar:#FBE3D2` (dark `#4A2F20`) in BOTH `[data-ui="v2"]` and `.dark [data-ui="v2"]` blocks of `app/globals.css` (~L358 / ~L398) plus `@theme inline` (~L319). Default: do NOT.
`no-hardcoded-colors.test.ts` bans `-[#hex]`, `bg-white`, `text-white`, `bg-black`, `dark:` in components/v2 — use tokens only. `border-[1.5px]`, `rounded-[14px]` are fine.

### 1.1 Section card wrapper + titles
| Element | Design | Code | Change |
|---|---|---|---|
| Card for 描述/類別/付款人/分攤成員/支出日期/消費地點/收據圖片 | `margin:0 16px 16px; background:#FFF; border:1px solid #E7DFD2; border-radius:16px; padding:16px` (描述 card has `margin:14px 16px 16px`) | none of them are cards. description `expense-form-v2-view.tsx:68-79`, category `category-picker.tsx:6`, payer `payer-picker.tsx:19` (fieldset), split `split-editor.tsx:35`, date `view.tsx:84-97`, location `99-102`, image `104-107` | NEW `section-card.tsx` exporting `SECTION_CARD = "mx-4 mb-4 rounded-2xl border border-v2-line bg-v2-surface p-4"` and `SECTION_TITLE = "text-[13px] font-bold text-v2-lake"` (title margin-bottom: 描述/類別 `mb-1.5`, 付款人/分攤成員 `mb-2.5`, 日期/地點/圖片 `mb-2`). Apply to every section. Description card keeps `mt-3.5`. |
| Section title | `font-size:13px; color:#1B5847; font-weight:700` | `sectionTitle` const `view.tsx:32` = `mb-2 text-sm font-medium leading-5 tracking-[.1px]`; also `amount-card.tsx:19`, `category-picker.tsx:7`, `payer-picker.tsx:20`, `split-editor.tsx:37` | replace with SECTION_TITLE (13px/700/lake). Amount card label `輸入金額` is also `13px lake 700` -> same class. Delete `sectionTitle`. |
| Description input | `border:1px solid #E7DFD2; radius:12; padding:12px 14px; 13px; bg:#FAF7F2` | `view.tsx:76` `bg-v2-surface` | `bg-v2-paper` |
| Date button | same as input: `bg #FAF7F2`, icon 15px `#6E6860` | `view.tsx:88` `bg-v2-surface`, icon `h-4 w-4` | `bg-v2-paper`; icon `h-[15px] w-[15px]` |
| Category icons | 16px | `category-picker.tsx:24` `h-3.5 w-3.5` | `h-4 w-4` |

### 1.2 Payer card (付款人) — `payer-picker.tsx`
| Element | Design | Code | Change |
|---|---|---|---|
| Title | `付款人` | legend `付款成員` L20 | rename to `付款人`. (Tests query radios by member name, and `use-expense-draft` error text `請選擇付款成員` stays.) |
| Sub-head row | `付款明細` 12px/600 ink-muted + right `全選` 12px/700 lake | none | add sub-head `付款明細`. `全選` ONLY meaningful for multi-payer -> see §4, render NOTHING for it in single-payer mode. |
| Pills | selected `bg lake, border lake, text on-lake`; unselected `bg lake-soft, border lake-border, text ink, opacity .5` | `memberPillClass` L7-11: unselected has NO opacity | in `memberPillClass(false)` add `opacity-50`. This helper is shared by payer, personal and pool pills (all use the same design pills) — one edit fixes all three. **Careful: `memberPillClass` has a 4th consumer, `components/v2/quick-expense/quick-item-card.tsx:23` (imported L16)** — adding `opacity-50` also changes the quick-expense pill. That is the same design pill, so accept it, but note it in the report. In POOL pills only, also add `opacity-40` on the avatar span when unselected. |
| Payer detail box | `#FAF7F2` box, `border line`, `radius 14`, rows `bg lake-soft`, `padding 12px 14px`, avatar 28px, name 13px/600, amount box `$300` 13px/700 `border lake-border radius 8 padding 6px 10px bg surface`; row actions pin (22px lake filled) + remove (22px danger-soft) | none | add read-only row for the single payer: avatar + name + `$<amount>` box (amount = `derived.splitInput.amount`). NO pin/remove buttons in single-payer mode (they would do nothing). |
| Payer summary block (MISSED in first draft) | `margin-top:8px`: left `已選 N 人` 12px `ink-muted`; right check icon 11px + `金額相符` 12px/700 link `#24735D`; below `$300 + $980 = $1,280 / $1,280` 12px `ink-muted`, `margin:3px 0 0` (design A3d L152-161, A3b L138-147) | none (the only `已選 N 人` in code is the 分攤成員 card's participant count, which maps to the SEPARATE design summary at A3d L282-285) | add the payer summary block INSIDE the 付款人 card. Single-payer UI-only (D12): `已選 1 人` + `金額相符` + `$<amount> = $<amount> / $<amount>`. Keep the 分攤成員 card's own summary (§1.3) as-is; the two blocks are distinct. |
| Avatar tones | lake-tint/coral(#FBE3D2)/plum-soft/rose-soft | `AVATAR_TONES` L3 | unchanged |

### 1.3 分攤成員 card — `split-editor.tsx`
| Element | Design | Code | Change |
|---|---|---|---|
| Wrapper | white card (see 1.1) | `<section className="mx-4 mb-4">` L35 | `className={SECTION_CARD}` (keep `aria-label="分攤成員"`; test `getByRole("region", {name:"分攤成員"})`) |
| Title | 13px/700 lake | L37 `text-sm font-medium` | SECTION_TITLE |
| Toggle label `先扣個人項目` | always `13px / 700 / #1B5847` (the on/off colour switch was REMOVED) | L39 `text-xs font-semibold` + `text-v2-link`/`text-v2-ink-muted` | `className="text-[13px] font-bold text-v2-lake"` (no conditional) |
| Toggle track | on `#24735D`, off `#DCD3C2`, 32x19, knob 15px | L46 `bg-v2-link` / `bg-v2-check` | unchanged (check is nearest) |
| Sub-heads `個人項目`, `共同分攤` | `12px/600 ink-muted` | `text-xs font-semibold text-v2-ink-muted` L56,150 | unchanged |
| `共同分攤 （…）` text | `共同分攤 <b ink 700>（剩餘應攤分金額 NT$…）</b>` — number is bold ink (#1B1815), NOT lake | L150-152 `（應分攤金額 {fmt(...)}）` in `text-v2-lake`; value = `sharedTotal` (amount − personal) | label -> `（剩餘應攤分金額 ${num(Math.max(0, derived.autoRemaining))}）`; span class `font-bold text-v2-ink`. `derived.autoRemaining` already exists (`use-expense-draft.ts:256`, = amount − personal − fixed shares). Keep `sharedTotal` for the summary line. Design literally shows `NT$` here (template leftover) — use `$` for consistency. |
| `全選` / `取消全選` | 12px/700 lake | L61,153 | unchanged |
| Inner containers (personal list, pool list) | `bg #FAF7F2; border line; radius 14` | L91, L182 `bg-v2-surface` | `bg-v2-paper` |
| Empty-state boxes | `bg #FAF7F2 dashed line, text ink-subtle` | L87, L177 `bg-v2-surface` | `bg-v2-paper` |
| Personal row `NT$` / amount | `$ + number`, 13px/700 ink | L103 `{num(sum)}` | `${num(sum)}` |
| Pool row amount (not pinned) | `$300` plain 13px/700 ink | L206-208 `{num(...)}` | `${num(...)}`; keep `aria-label` |
| Pool row amount (pinned) | `$` + value inside box `border lake-border, radius 8, padding 6px 10px, bg surface` | L194-204 bare `<input class="w-24 … border-v2-lake">` | wrap: `<label class="flex w-24 items-center rounded-lg border border-v2-lake-border bg-v2-surface px-2.5 py-1.5 text-[13px] font-bold"><span aria-hidden>$</span><input aria-label=... class="w-full min-w-0 bg-transparent text-right outline-none"/></label>`. Keep input props/handlers EXACTLY (tests type into `getByLabelText("…的分攤金額")`). |
| Pin button | pinned: filled lake (`bg lake`, white icon). UNPINNED: `border 1.5px #C9BFAC`, icon `#6E6860`, no fill | L215 unpinned = `bg-v2-lake-tint text-v2-lake` | unpinned -> `border-[1.5px] border-v2-check text-v2-ink-muted`; pinned unchanged (`bg-v2-lake text-v2-on-lake`). Icons already Pin/PinOff. |
| Summary line | `個人項目 $X（N 項）＋ 共同分攤 $Y（M 人）= $T / $T` | L241-242 numbers w/o `$`; total `fmt(...)` = `TWD 100` | prefix `$` on all four numbers; replace `fmt(derived.splitInput.amount)` with `${num(...)}`; keep `＝`→ design uses ASCII `=`; use `=`. |
| `已選 N 人` row | matches | L228-244 | unchanged |

### 1.4 分攤明細 table (moved INSIDE the 分攤成員 card, always shown) — `split-summary.tsx`
| Element | Design | Code | Change |
|---|---|---|---|
| Visibility | always rendered under the summary line (A3d), `margin-top:12px` | `split-summary.tsx:13` returns null when `itemCount === 0` | render whenever `derived.shares.length > 0`. (A3b has none because no shares-state — fine.) **Note:** the design iterates ALL members including non-participants (0/0 rows), while `derived.shares` only contains participants. To match the design exactly, map over `members` and default a missing share to `{shareAmount:0, personalAmount:0}`; if that is awkward, showing participants only is an accepted deviation — record it. |
| Title | `分攤明細<span lake>（TWD）</span>` 12px/600 ink-muted | L35 | text same; span `text-v2-lake` (currently `font-bold`; drop bold). Currency code = `currency` prop. |
| Column header | OUTSIDE the box: grid `1.4fr 1fr 1fr 1fr gap 4px`, `padding 0 14px 6px`, 11px `ink-subtle`, last 3 right-aligned | `<thead class="bg-v2-lake-soft text-v2-ink-muted">` inside box | header row above box: `text-[11px] text-v2-ink-subtle`, no bg |
| Body box | `bg paper; border line; radius 14; overflow hidden` | `bg-v2-surface` | `bg-v2-paper` |
| Rows | grid same cols, `padding 10px 14px`, `bg lake-soft`, border-top `line-soft`; first cell = 22px avatar (9px/700 letter, tone like others) + name 13px/600 truncate; numbers 13px right; personal/pool colour `ink` if non-zero else `ink-subtle`; subtotal 13px/700 ink | table rows, no avatar, `px-2 py-2`, 12px | rebuild rows (below) |
| Footer | grid, `padding 10px 14px`, `bg #D2EAE1 (lake-tint)`, border-top `lake-border`; all 13px/700 ink, subtotal `lake` | `<tfoot class="border-t border-v2-line font-bold">` | `bg-v2-lake-tint border-t border-v2-lake-border` |
| Number format | `$300`, `$1,280` | `formatAmount` no `$` (L16) | `$${formatAmount(...)}` |
**Implementation hint (keeps existing `getByRole("row"|"region")` tests valid):** keep `<section aria-label="分攤明細">`; use `<div role="table">` > `<div role="row">` with `role="columnheader"` / `role="rowheader"` (name cell) / `role="cell"`, styled with `grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-1`. Avatar span is `aria-hidden` but still in textContent — tests that match `^小雨` must be rewritten (see §3). Memoise nothing; pure presentation. `members` index gives tone via `memberTone(members.findIndex(...))` imported from `./payer-picker`.
`SplitSummary` is rendered from inside `SplitEditor` L246 already — structure stays, only styling/visibility change.

### 1.5 Date / location / image cards — `expense-form-v2-view.tsx`
| Element | Design | Code | Change |
|---|---|---|---|
| Location chip (value set) | `bg sand, radius 12, padding 12px 14px, margin-bottom 8px`; pin icon 15px `coral`; text 13px; clear `X` 14px `ink-subtle` (20px btn) | v1 `LocationPicker` (`components/location-picker.tsx:171-187`: `bg-muted/50`, `text-primary`) | v2 picker (below) |
| Open panel | `border line, radius 12, padding 12, bg paper, flex-col gap 10`: (1) `使用目前位置` full-width button `bg sand, radius 10, padding 10px 12px, 13px/600`, Navigation icon 15px `link`; (2) search input with Search icon 14px `ink-subtle` at left 12px, `border line radius 10 padding 10px 12px 10px 34px 13px bg surface`; (3) results list gap 2px, each `padding 8, radius 8, text-left, 12px`, MapPin 14px `ink-muted`, active/first result `bg lake-soft`; (4) `取消` full-width centered 12px/600 `ink-muted` | v1 panel: shadcn `Button`/`Input`, `bg-background`, slate/`text-muted-foreground`, chip hidden while open (`!isOpen`) | NEW `location-picker-v2.tsx` (copy logic from v1 L25-166 verbatim: `/api/geocode?q=` 500ms-debounced search, `?lat=&lon=` reverse geocode, `clearLocation`, error messages), v2 markup, chip stays visible while the panel is open. Closed state (A3b `AddExpense-section-demo.dc.html:288-292`): a filled chip `bg #FAF7F2` (= `bg-v2-paper`) with a coral pin icon and the location text, plus an inline `重新定位` text button that opens the panel. There is NO `新增位置`/`變更位置` outline button and the design never shows `變更位置`. **Do NOT edit `components/location-picker.tsx` (v1).** |
| Image card | two buttons `flex:1; border:1.5px dashed #C9BFAC; radius 14; padding 16px 10px; bg paper; gap 6; text 12px/600 ink-muted`; 32px round icon chip: 拍照 `bg coral-soft / coral`, 選擇圖片 `bg lake-soft / lake`; icons 15px | shared `components/ui/image-picker.tsx:257-275`: `h-24 rounded-xl border-2 border-dashed border-slate-200 dark:… text-sm` (slate colours, `dark:`) | see §5 option B (default: leave v1 picker inside the card; style gap listed in problem list) |
| Notify LINE row | white card `radius 14`, padding `12px 14px`, custom 20px square `bg lake radius 6` with white check; title 12px/700; sub 12px ink-muted | `expense-form-v2-view.tsx:109-122` native checkbox `accent-v2-lake h-5 w-5` | optional polish: sr-only checkbox + `<span class="flex h-5 w-5 items-center justify-center rounded-md bg-v2-lake text-v2-on-lake">` (check icon when checked; unchecked `border border-v2-check bg-v2-surface`). Keep `<input type="checkbox">` so a11y/tests work. Bottom margin design `mb-[100px]`; code already has spacer `h-28`. |
| Bottom bar | `新增支出 · NT$ 1,280` | `新增支出 · TWD 1,280` (`view.tsx:40`, `formatCurrency`) | KEEP `TWD` format (tests assert `新增支出 · TWD 100`; `NT$` is TWD-only and wrong for other currencies). Flag in problem list. |

---
## 2. Files to modify / create
Modify: `expense-form-v2-view.tsx` (wrap description/date/location/image in `SECTION_CARD`, remove `sectionTitle`, use `LocationPickerV2`), `amount-card.tsx` (label class), `category-picker.tsx` (card + title + icon size), `payer-picker.tsx` (card, title, `memberPillClass` opacity, single-payer row), `split-editor.tsx` (card, label, `$`, boxes, pin style, remaining label), `split-summary.tsx` (always show, grid roles, avatars, `$`).
Create: `section-card.tsx` (two class constants only), `location-picker-v2.tsx`, `tests/components/v2/location-picker-v2.test.tsx`, `tests/components/v2/section-card.test.tsx` (**required** by master spec §6; assert constants contain `rounded-2xl` / `text-v2-lake`).
Never touch: `components/location-picker.tsx`, `components/expense/**`, `components/ui/**` (absolutely — the shared `ImagePicker` stays as-is, master D18), `app/globals.css` (no new tokens), `lib/expense-split.ts`, any `app/api/**`.

## 3. Existing tests that break / need updating
`tests/components/v2/expense-form-v2-view.test.tsx`:
- L5 `vi.mock("@/components/location-picker")` and L6 image-picker mock: view now imports `./location-picker-v2` -> change mock to `vi.mock("@/components/v2/expense-form/location-picker-v2", () => ({ LocationPickerV2: () => <div data-testid="location-picker" /> }))`.
- L66 `"個人項目 0（0 項）＋ 共同分攤 100（2 人）＝ 100 / TWD 100"` -> `"個人項目 $0（0 項）＋ 共同分攤 $100（2 人）= $100 / $100"`.
- L111 `toHaveTextContent(/^50$/)` -> `/^\$50$/`; L185-186 `/^450$/` -> `/^\$450$/`.
- L184 `getByText(/應分攤金額/)` -> `/剩餘應攤分金額/` (value 900 still true there: autoRemaining = 1000−100−0).
- L194 `queryByRole("region",{name:"分攤明細"})` `not.toBeInTheDocument()` -> now present: assert it IS present (rows 小雨/志明, totals), and add a test that it shows `$` values.
- L207-211 table assertions: `（TWD）` OK; row text `"小雨1000100"` etc. -> avatar letter + `$`: use `toHaveTextContent("小雨$100$0$100")`-style per cell or `within(row).getAllByRole("cell")`; footer `合計` row same.
- L46/L224 `新增支出 · TWD …` unchanged (we keep it).
`tests/components/v2/expense-form-v2.test.tsx`: L35-40 location-picker mock (testid `location`, used at L144 to observe geolocation autofill) -> mock `@/components/v2/expense-form/location-picker-v2` exporting `LocationPickerV2` with the same render. L40 image-picker mock unchanged.
`tests/components/v2/no-hardcoded-colors.test.ts`: must stay green (scans new files too).
`use-expense-draft.test.tsx`: unaffected (hook untouched).
v1 tests (`tests/components/location-picker.test.tsx`, `image-picker.test.tsx`, `expense-form*.test.tsx`): must stay untouched and green.

New tests (coverage): `location-picker-v2.test.tsx` — `tests/components/location-picker.test.tsx` has **12** `it` blocks. Port the 8 that map to shared behaviour, and write 4 net-new ones that do NOT exist there: (1) pick result calls `onChange` and closes, (2) reverse-geocode success, (3) reverse-geocode failure falls back to `lat, lon` text, (4) chip stays visible while open. Ported: add/change button, chip + clear -> `onChange(null)`, open panel shows 使用目前位置/search/取消, cancel closes, debounced search calls `/api/geocode?q=`, geolocation unsupported error, and the two other existing cases. Payer card: single row shows `$amount`, no `全選`. Pill unselected has `opacity-50`. Pin unpinned has `border-v2-check`. Summary shown without personal items. Run `npm run test:run -- tests/components/v2` and `npm run test:run -- --coverage` for the touched files (`components/v2/expense-form/**` should stay ≥ current %).

## 4. Features without backing (smallest safe approach)
| Feature in design | Backing today | Approach |
|---|---|---|
| Multi-payer (付款人 multi-select pills, per-payer `$300`/`$980` amounts, 全選, per-payer pin/remove) | NONE. `state.paidBy` single id; API/Prisma `Expense.paidByMemberId` single. Settlement relies on it. Multi-payer is OUT OF SCOPE. | **UI-only, single-payer rendering**: keep radios (single select, still `setPaidBy`), restyle as pills + one read-only detail row `$amount`. Do NOT render 全選, per-payer pin/remove, or any editable per-payer amount (would imply data we don't save). Record in problem list: "design shows multi-payer; needs schema + settle rework (v2-only API) — decision required". |
| `$1,280` comma in amount input (A3d `value="1,280"`) | input is raw string, `toMoneyInput` in other fields | skip (display-only sample); note in problem list |
| `剩餘應攤分金額` | `derived.autoRemaining` exists | wire to it (§1.3) |
| Always-visible 分攤明細 | `derived.shares` exists | wire (§1.4) |
| Personal-item rows read-only + `展開新增品項` inline form (design) | code has always-editable inputs per item (`actions.addItem/updateItem`) | KEEP current inline inputs (better, tested); restyle only |
| Expanded location picker | v1 logic exists in `components/location-picker.tsx` | v2 copy (§1.5), no API change (`/api/geocode` is shared & read-only) |
| `NT$` button label | currency-aware `formatCurrency` | keep |

## 5. v1 regression risks
1. `memberPillClass` / `AVATAR_TONES` / `memberTone` live in `payer-picker.tsx` (v2 only). Safe. Grep before editing: `grep -rn "payer-picker" --include=*.tsx . | grep -v node_modules` must show only v2 files.
2. `components/location-picker.tsx` and `components/ui/image-picker.tsx` are SHARED with v1 `components/expense/expense-form.tsx`. **Never edit either of them** (`components/ui/**` is on the master spec's absolute do-not-touch list). The v2 picker is a NEW file (`location-picker-v2.tsx`); the shared `ImagePicker` stays as-is inside the v2 card and its style difference is recorded in the problem list only (master D18). There is no `variant` option — do not add one.
3. `components/v2/**` token-only rule: do not add `dark:`/hex (scan test). Dark mode comes free from tokens; verify `bg-v2-paper` inside `bg-v2-surface` still has contrast in dark (`#161412` on `#201D1A` — OK).
4. `use-expense-draft.ts` and `expense-form-v2.tsx` are NOT modified -> save payload (`participants: derived.shares`, `splitDetail`) is unchanged; v1 edit-page read-only rule for non-empty `splitDetail` is untouched.
5. Test mocks: forgetting to update the two `location-picker` mocks makes the real v2 picker call `fetch`/geolocation in jsdom -> flaky failures; update both before running.
6. Commit order suggestion: (1) section-card + titles + cards, (2) pills/pin/`$`/remaining label, (3) split-summary, (4) location-picker-v2 + test mock updates, (5) payer card, (6) optional notify/image polish. Run `npm run lint && npm run test:run` after each.
