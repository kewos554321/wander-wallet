# Diff: A1 / A2 / A2d (design v20261003 vs. current v2 code)

Design inputs: `design/project-v20261003/MainCard3-njus.dc.html` (A1), `Trip-m0lh.dc.html` (A2), `Trip-feature-row-demo.dc.html` (A2d).
Old snapshot for comparison: `design/project-backup-20260929/`.
Scope: only `components/v2/*`, `app/globals.css` (v2 tokens), `tests/components/v2/*`. v1 files must not change.

## A1 — Projects list (`components/v2/projects/projects-v2-view.tsx`)

| Element | Design | Current code | Change |
|---|---|---|---|
| Tagline under h1 "你的旅程" | new `<p>` "每一趟旅程，都值得被好好記住"; 12px / line-height 16px; letter-spacing .3px; color `#6E6860` (= `--v2-ink-muted`); margin `4px 0 0` | none (h1 at ~L59-65) | add `<p className="mt-1 text-[12px] leading-4 tracking-[.3px] text-v2-ink-muted">` right after the h1 |
| Header avatar -> `/settings` | unchanged | exists (aria-label "通用設定") | none |
| Filter chips, cards, AvatarStack, FAB | unchanged vs. old snapshot | exists | none |

Verified token: `--v2-ink-muted` already carries `#6E6860` light / a dark value; no new token needed.

Tests: `tests/components/v2/projects-v2-view.test.tsx` — add one assertion in "renders greeting, title and cards": `screen.getByText("每一趟旅程，都值得被好好記住")`. Existing 7 tests stay valid.

## A2 — Project overview (`components/v2/project/*`)

### Gap table

| # | Element | Design value | Current code | Change needed |
|---|---|---|---|---|
| 1 | Top bar right side | 36px circle avatar (letter, e.g. "E") that links to GeneralSettings (`/settings`); no share icon, no gear icon | `project-overview-v2-view.tsx` L29-42: `V2TopBar` with Share2 button + Settings (gear) link | replace the two icon buttons with the avatar link (reuse the avatar markup from `projects-v2-view.tsx`; aria-label "通用設定"); keep back arrow |
| 2 | Description paragraph | under title block; 12px/17px; tracking .3px; clamp 2 lines; width 354px (= full width in 390 screen) | `OverviewProject.description` exists in `lib/project-overview.ts` but is not rendered | render `project.description` only when non-empty: `line-clamp-2 text-[12px] leading-[17px] tracking-[.3px] text-v2-ink-muted` |
| 3 | Pill buttons "分享" and "修改" | 32px high, padding 0 10px, radius 9px, 1px border `#B7D9CB`, bg `#EAF5F1`, text `#1B5847`, 12px/600; placed in the title row | share was an icon button; no "修改" | add two pill buttons: "分享" (button, calls `onShare`), "修改" (link; destination open question, default `/projects/{id}/settings`). bg/text map to existing `--v2-lake-soft` / `--v2-lake` tokens; border needs the NEW token `--v2-lake-edge` (#B7D9CB) — do **not** reuse `--v2-lake-border` (already exists as #DDEDE6 and is used by other v2 screens) |
| 4 | Copy-link control | removed | not in overview (lives in InviteDialog) | none |
| 5 | Trip summary card decoration | Sparkle icon | `trip-summary-card.tsx`: Compass decoration | swap `Compass` -> `Sparkles` (lucide) |
| 6 | Balance card label/amount | label 13px/700 lake; amount colour ink (also when positive) | `balance-card.tsx`: lake for positive, danger for negative | label 13px/700 `text-v2-lake`; amount `text-v2-ink`. (Open question: keep danger for negative? design shows ink only. Recommend: ink for >=0, keep danger for <0 to avoid regression.) |
| 7 | Feature section | ONE row of 5 tiles: 結算 / 成員 / 統計 / 匯率 / 更多. Card title "功能" lives INSIDE the card (13px/700 lake, `padding:0 4px`, `margin-bottom:12px`). Primary row is `flex items-start justify-between`; each tile is a 52px-wide column with a **46px circle** (bg tone-soft, icon 18px) and an **11px/500** label below (匯率 uses 12px/500). "更多" is a button (46px sand circle, `aria-label="更多功能"`), active/open state turns its circle lake with white icon. "更多" toggles a panel below: `margin-top:14px; padding-top:14px; border-top:1px dashed var(--v2-line)` (NOT a rounded/tinted frame) with an **11px/700 `更多功能` label** (ink-subtle, tracking .5) then `grid grid-cols-5 gap-x-1 gap-y-3` (gap: 12px 4px) of 6 links: 歷史 (rose), 里程 (lake), 匯出 (gold), 筆記 (plum), 地圖 (gold), 照片 (rose). No 設定 tile. No page dots / no snap-scroll | `feature-grid.tsx`: heading is OUTSIDE the card at 14px/500 ink (L62-63); 11 features, PAGE_SIZE 8, snap-scroll pager + dots; 筆記 tone = gold and 地圖 tone = plum (L37-38, reversed vs design); tile is already 46px (L78) | rewrite `feature-grid.tsx`: add "功能" heading inside the card; `useState(expanded)`; primary row of 5 (the 5th = button "更多" with `aria-expanded`); expanded `border-t border-dashed border-v2-line` section containing the `更多功能` label + 6 links in a 5-col grid. Fix tones (筆記→plum, 地圖→gold). Remove pager/dots/scroll logic. Tile size 46px stays; labels 11px/500 (匯率 12px/500). |
| 8 | "最近支出" heading | inside the card: 13px/700 lake; padding 14px 14px 8px; card margin 22px 16px 0; radius 16px | `recent-expenses.tsx`: heading outside the card | move heading into card top; keep "查看全部" link |
| 9 | Camera FAB | removed | `quick-actions.tsx`: gold camera FAB (aria "拍照記帳") | remove camera FAB and `onCamera` plumbing from view. `QuickExpenseV2`'s `initialStep` prop stays intact, but note the overview is its ONLY caller that passes `"camera"`; the camera step remains reachable via the in-flow 拍照 button inside `quick-input-step.tsx` (master D13) |
| 10 | AI FAB | coral, Sparkle icon | AI FAB already uses `Sparkles` (`quick-actions.tsx` L2, L19) | none (verify only) |
| 11 | Manual-add FAB | 56px lake; shadow `0 6px 16px rgba(27,88,71,.4)` | shadow .35 | change shadow alpha to .4 (use token `--v2-shadow-fab` if present, else inline `shadow-[0_6px_16px_rgba(27,88,71,.4)]`; rgba is not hex so passes the colour guard) |

### A2d (feature-row demo) — AUTHORITATIVE pixel reference for row 7
Source: `design/project-v20261003/Trip-feature-row-demo.dc.html` (verified). Values:
- Card: `bg surface; border 1px line; radius 18px; padding 16px 12px 12px`. Title "功能": 13px/700 lake, `padding:0 4px`, `margin:0 0 12px`.
- Primary row: `display:flex; align-items:flex-start; justify-content:space-between`. Each tile column is `width:52px`; circle is **46px** (`border-radius:50%`); label **11px/500 lh14 ls.3** (匯率 is 12px/500 lh16 ls.5); icon 18px stroke ~1.6-1.8.
- Tones (circle bg / icon): 結算 lake-soft/lake, 成員 coral-soft/coral, 統計 plum-soft/plum, 匯率 coral-soft/coral, 更多 sand/ink-muted.
- 更多 button: 46px sand circle + 3 dots; when open its style is `background:#1B5847; color:#FFFFFF` (`moreCircleStyle`).
- Expanded panel: `margin-top:14px; padding-top:14px; border-top:1px dashed #E7DFD2` (= `--v2-line`); label "更多功能" 11px/700 `#B7AE9D` (ink-subtle) ls.5, `margin:0 0 12px; padding:0 4px`; grid `repeat(5,1fr); gap:12px 4px`.
- Secondary tones: 歷史 rose `#F6E9EE/#A14A68`, 里程 lake, 匯出 gold `#F7EFDD/#9C7A28`, 筆記 plum `#EFEAF7/#6B5B95`, 地圖 gold, 照片 rose.
Use `v2-rose-soft`/`v2-rose`, `v2-gold-soft`/`v2-gold`, `v2-plum-soft`/`v2-plum` (existing tokens).

### Files to modify
- `components/v2/project/project-overview-v2-view.tsx` (top bar, description, pill buttons, remove camera prop usage)
- `components/v2/project/trip-summary-card.tsx` (Sparkles)
- `components/v2/project/balance-card.tsx` (label size, ink amount)
- `components/v2/project/feature-grid.tsx` (rewrite)
- `components/v2/project/recent-expenses.tsx` (heading inside)
- `components/v2/project/quick-actions.tsx` (remove camera FAB, Sparkles, shadow)
- `components/v2/project/project-overview-v2.tsx` (drop `onCamera` if the prop is removed)
- `app/globals.css` (new token for `#B7D9CB`, see below)
- `components/v2/projects/projects-v2-view.tsx` (A1 tagline)

### New token (colour guard!)
`#B7D9CB` is not in the token set. Add the **new** token `--v2-lake-edge` (name fixed by the master spec §4 — do NOT touch the existing `--v2-lake-border`, which is `#DDEDE6` light / `#2C4A41` dark and is used by many v2 screens):
- `@theme inline` (v2 block): `--color-v2-lake-edge: var(--v2-lake-edge);`
- `[data-ui="v2"]` block (`app/globals.css`): `--v2-lake-edge: #B7D9CB;`
- `.dark [data-ui="v2"]` block: `--v2-lake-edge: #2E5A4C;` (dark proposal)
Then `border-v2-lake-edge` works. This token is created once in Part 0 (Task 0.2) — do not re-add it here.
Components must not use `bg-white`, `text-white`, `bg-black`, `-[#hex]`, `dark:` (enforced by `tests/components/v2/no-hardcoded-colors.test.ts`, which scans every `.tsx` under `components/v2/` except `quick-expense/camera-step.tsx`).

### Tests to update / add
1. `tests/components/v2/feature-grid.test.tsx` — all 3 tests (page dots, scrollTo, scroll updates active dot) become invalid. Replace with:
   - renders 5 primary links/buttons in order: 結算 `/settle`, 成員 `/members`, 統計 `/stats`, 匯率 `/currency`, button "更多" (aria-expanded=false)
   - no 設定 link and no page-dot element
   - click "更多" -> aria-expanded=true and 6 links: 歷史 `/activity-logs`, 里程 `/mileage`, 匯出 `/export`, 筆記 `/notes`, 地圖 `/map`, 照片 `/photos`; click again collapses
2. `tests/components/v2/project-overview-v2.test.tsx`:
   - "links all 11 features": expected list loses 設定 and needs "更多" click before the 6 secondary links -> rewrite to 10 links.
   - "wires share, voice, camera and add actions": remove camera click / `onCamera` expectations (remove `onCamera={vi.fn()}` from every render call, ~8 places); the "分享" button name still matches but now is a pill button.
   - add: description rendered when set and absent when null; "修改" link href; avatar link `通用設定` -> `/settings`; heading "最近支出" is inside the card (`within(card)`); no "拍照記帳" button.
   - Assertions on "TWD 48,600 ／ TWD 76,000（剩餘 TWD 27,400）", "+TWD 4,820", "−TWD 1,200" must keep passing (text unchanged).
3. `tests/components/v2/projects-v2-view.test.tsx` — tagline assertion (above).
4. `tests/components/v2/no-hardcoded-colors.test.ts` — no change; must stay green.

### Features without backing logic / open questions
- Camera entry removed from A2 and no other board links to Camera.dc.html. Keep QuickExpenseV2 camera step reachable only via other screens; report.
- "修改" destination unspecified. Default `/projects/{id}/settings` (A13). The gear removal means project settings is now reachable only via this button.
- 設定 tile dropped: confirm intentional (reachable via 修改).
- Balance amount colour (ink vs lake/danger).
- No-date trip: design A1 shows a grey "14 天" badge for a no-date trip; current code shows no badge. Ambiguous; keep current behaviour (test "shows placeholder date text and no day badge without dates" stays).
- Cover swatch: design uses gradient, code uses solid `--cover-bg`. Not changed (data model `icon:<id>;color:<id>` has no gradient).

### v1 regression risks
- `lib/project-overview.ts`, `lib/trip.ts`, `lib/covers.ts`: this change needs NO edits there (description already in `OverviewProject`). Do not touch.
- `InviteDialog` / `JoinProjectDialog` are shared with v1: only reuse, never edit.
- `QuickExpenseV2` is v2-only but also used elsewhere in v2; keep its `initialStep` prop intact.
- Run `npm run test:run` (whole suite) + `npm run lint` + `npm run build`; v1 tests under `tests/components/v1/*` and `tests/lib/*` must pass unchanged.
