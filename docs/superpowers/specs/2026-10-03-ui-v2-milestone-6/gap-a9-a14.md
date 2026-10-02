# Diff notes: A9b (NewProject), A13 (ProjectSettings), A14 (GeneralSettings)

Design source: `design/project-v20261003/{NewProject-sections-demo,ProjectSettings,GeneralSettings}.dc.html`
Code: `components/v2/{new-project,project-settings,settings,cover,project}/*`, `lib/covers.ts`, `lib/hooks/use-project-form.ts`, `app/globals.css` (v2 tokens).
All v2 code must use tokens only. `tests/components/v2/no-hardcoded-colors.test.ts` bans arbitrary-value hex classes (`-[#...]`), `bg-white`, `text-white`, `bg-black`, and `dark:` variants under `components/v2/**` (inline-style hex is NOT caught by the regex, but is still forbidden by review; `lib/covers.ts` data hex is outside the scan).

## 0. Cross-cutting findings

### 0.1 Existing tokens (globals.css `[data-ui="v2"]`, light / dark)
paper #FAF7F2/#161412, surface #FFFFFF/#201D1A, ink #1B1815/#F2EDE4, ink-muted #6E6860/#B3AB9F, ink-subtle #B7AE9D/#7A7268, line #E7DFD2/#34302B, sand #F1EBE0/#2A2622, check #C9BFAC/#5A534A, lake #1B5847/#4FB394, lake-soft #EAF5F1/#17302A, lake-tint #D2EAE1/#1F3D34, lake-mid #2F8F74/#4FB394, danger #C4472F/#E8735A, danger-soft #F6DCD3/#3A1E18, danger-strong #C4432A/#E8735A, on-lake #FFFFFF/#0F1F1A.
`bg-v2-paper` == design input background `#FAF7F2`. `v2-lake-mid` == design selected-border `#2F8F74`. `v2-lake-tint` == design avatar bg `#D2EAE1`.

### 0.2 New tokens needed (all three screens combined)
| Design value | Where | Proposed token | Light | Dark (proposal, needs designer confirm) |
|---|---|---|---|---|
| `#FDF1EC` | A13 danger card bg | `--v2-danger-tint` | #FDF1EC | #2A1713 |
| `#F3D3C4` | A13 danger card border | `--v2-danger-border` | #F3D3C4 | #5A2E23 |
| `#2A241F` | A9b "ink" cover color (fg) | cover color id `ink` in `COVER_COLORS` (not a CSS token; cover colors are JS data) | fg #2A241F, bg #E9E5DF | darkFg #D9D2C7, darkBg #2A2622 |
| `#CFE8DC` | A9b preview tile gradient end (`linear-gradient(135deg,#EAF5F1,#CFE8DC)`) | NOT needed if preview keeps using `CoverArt` colour from selected cover; design shows static lake preview with 26px icon. Decide: keep dynamic CoverArt (recommended). |
Danger text/button `#C4432A` == existing `v2-danger-strong` (current code uses `v2-danger` #C4472F — 4-unit difference, switch to danger-strong for A13 danger card).
Add `--color-v2-danger-tint` / `--color-v2-danger-border` to `@theme inline` AND to both `[data-ui="v2"]` and `.dark [data-ui="v2"]` blocks. The tokens test is created in Part 0 (`tests/components/v2/v2-tokens.test.ts`); extend its `NEW_TOKENS` map with `danger-tint` and `danger-border` rather than writing a second test.

### 0.3 Cover system (shared by A9b and A13, also used in A1 via `components/v2/projects/cover-thumb.tsx`)
Current `lib/covers.ts`:
- COVER_ICONS (7): compass, leaf, utensils, globe, car, bed, star
- COVER_COLORS (6): lake, coral, red, rose, gold, plum (each with fg, bg, darkFg, darkBg)
- `parseCover` returns "none" for unknown ids; `isValidCover` is used by `POST /api/projects` and `PUT /api/projects/[id]` (so extending ids is automatically accepted by the API; v1 unaffected because `toLegacyCover` maps any icon cover to preset 1).
- `tests/lib/covers-icon.test.ts` hard-asserts exact id lists (lines 6, 7, 27–34) → MUST be updated with the new lists.

New design A9b cover section (`封面` card):
- Icons: 14 tiles, 2 rows of 7, `justify-content: space-between`, row 2 has `margin-top: 8px`. 13 icons + 1 "更多圖示" button (`aria-label="更多圖示"`, bg sand #F1EBE0, border line, three-dots icon, 18px, `fill=currentColor`).
  Row 1 (existing ids): compass, leaf, utensils, globe, car, bed, star.
  Row 2 (6 NEW icons, then "more"): camera, cutlery-crossed (fork + knife, 2 separate utensils), mountain-sun, mountain, heart, sparkle (4-point star/compass-needle shape `M2 12l7-2.5L12 2l3 7.5 7 2.5-7 2.5L12 22l-3-7.5z`).
  Proposed new ids: `camera`, `fork-knife`, `hiking`, `mountain`, `heart`, `sparkle`. Lucide equivalents: Camera, UtensilsCrossed (NOT identical glyph), Mountain-snow/Mountain, Heart, Sparkle. Recommend using lucide icons (consistent with current CoverArt which uses lucide): Camera, UtensilsCrossed, MountainSnow, Mountain, Heart, Sparkles.
  Raw SVG paths from the design (viewBox 0 0 24 24, stroke currentColor, width 1.6, round caps/joins):
  - compass `circle 12,12 r9; path M15.5 8.5l-2 5-5 2 2-5z`
  - leaf `M5 19c8 0 14-6 14-14-8 0-14 6-14 14z; M5 19c3-3 5-6 6-9`
  - utensils `M7 3v7a2 2 0 002 2 2 2 0 002-2V3M9 12v9M17 3c-1.5 0-2.5 2-2.5 5s1 5 2.5 5v6`
  - globe `circle r9; M3 12h18M12 3c2.5 2.5 3.8 6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-6-3.8-9s1.3-6.5 3.8-9z`
  - car `M4 16V12l2-5h12l2 5v4; M4 16h16M7 16v2M17 16v2; circle 7.5,16 r1.3; circle 16.5,16 r1.3`
  - bed `M3 19v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 19h18M5 11V7a1 1 0 011-1h4a1 1 0 011 1v4M13 11V9a1 1 0 011-1h4a1 1 0 011 1v2`
  - star `M12 3l2.6 5.6 6.1.7-4.5 4.3 1.1 6.1L12 16.9 6.7 19.7l1.1-6.1L3.3 9.3l6.1-.7z`
  - camera `rect x3 y7 w18 h13 rx2; M8 7l1.5-3h5L16 7; circle 12,13.5 r3.5`
  - fork-knife `M7 2v8M7 2c-2 0-3 1.5-3 3.5S5 9 7 9; M17 2v20M17 2c2.5 0 4 2 4 4.5S19.5 11 17 11`
  - hiking (mountain+sun) `M3 20h18M4 20l5-9 3 5 2-3 6 7; circle 18,6 r2.5`
  - mountain `M2 16l7-11 3 5 2-3 8 9z; M14 10l-2 3`
  - heart `M12 20.5s-7.5-4.7-7.5-10A4.5 4.5 0 0112 7.5a4.5 4.5 0 017.5 3c0 5.3-7.5 10-7.5 10z`
  - sparkle `M2 12l7-2.5L12 2l3 7.5 7 2.5-7 2.5L12 22l-3-7.5z`
  - more `circle 6,12 r1.6; circle 12,12 r1.6; circle 18,12 r1.6` (fill)
- Icon tile: 38x38, `border-radius:50%` (CIRCLE, current code uses rounded-xl 44px square rendered via CoverArt) .
  - unselected: bg surface #FFFFFF, border 1px line, icon color ink-muted.
  - selected: bg lake-soft, border 1.5px `v2-lake-mid` (#2F8F74), icon color lake.
  - icon tile does NOT use the chosen color — it is a neutral picker (current code previews each icon in the selected color).
- Color tiles: 6 tiles, 38x38, `border-radius:12px`, `justify-content:space-between`, solid fill = fg colour. Order: lake #1B5847, coral #C4602F, plum #6B5B95, gold #9C7A28, rose #A14A68, ink #2A241F. NOTE `red` (#C4472F) is NOT in the design anymore but must stay in COVER_COLORS for backward compat (existing saved covers `icon:*;color:red`); hide it from the picker UI (add `hidden`/`pickable:false` flag or a separate `COVER_PICKER_COLORS` list).
  Selected: `box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 3.5px <fg>` + white check svg 13px stroke 3 centred (check path `M4 12l5 5L20 6`). Use `ring-2 ring-v2-surface` + custom outline? Tailwind v4: `shadow-[0_0_0_2px_var(--v2-surface),0_0_0_3.5px_var(--tile-color)]` with inline style var; no hex in className.
  Existing code: 28px circles with `ring-2 ring-v2-lake ring-offset-2`, inline `style={{backgroundColor: color.fg}}` (hex from JS data is OK because it's data, not className; check no-hardcoded-colors test only scans hex in the source — COVER_COLORS lives in lib/).
- Labels: section labels `圖示` / `顏色` use 12px/600 ink-muted (`label` style); NOT "封面圖示"/"封面顏色" 14px font-medium as now. Section card title is `封面` (13px/700 lake).
- Custom-image upload: NOT present in new A9b design (existing code has "或上傳自訂圖片" dashed button + "移除自訂圖片"). Decided (master D6): remove the upload button entirely; if the current value is a custom image, show a small "移除自訂圖片" text button (keep the removal test); there is no `allowUpload` prop. v1 data with custom base64 covers still displays via `CoverArt` and can be cleared. Recorded in the problem list.
- Aria labels: current tests rely on buttons named by icon label ("汽車") and `顏色 gold` — keep names for old ids; give new icons Chinese labels: camera=相機, fork-knife=美食, hiking=登山, mountain=山岳, heart=愛心, sparkle=亮點.
- "更多圖示" (3-dot) tile: design has no expanded state. Decided (master D2): render it, `disabled`, `title="即將推出"`, `aria-label="更多圖示"`. Recorded in the problem list.

## 1. A9b — NewProject-sections-demo (code: `components/v2/new-project/new-project-v2.tsx`, `trip-preview-card.tsx`, `cover/cover-picker-v2.tsx`, `project/join-mode-picker.tsx`, `project/date-range-field.tsx`)

Page frame: width 390, bg paper, header: `padding:16px` (code V2TopBar uses `px-3.5 py-4` = 14px side; design header here is `16px` — in A13/A14 it is `16px 14px`. A9b: `padding:16px`, back button `flex-shrink:0`, title `flex:1;text-align:center`). Minor; V2TopBar currently `justify-between` with a 34px spacer — visually same. IGNORE unless pixel-checking (note only).

Section cards (NEW): every section is a card: `margin:16px 16px 0; bg surface; border 1px line; radius 16px; padding 16px`; card title `margin:0 0 12px; 13px/700 lake`. Last card `margin:16px 16px 16px`. Code: no cards, `space-y-5` bare fields.

Sections in order:
1. 卡片預覽 (card title "卡片預覽" inside card; code: plain label 12px/600 ink-muted, not in card). Preview row inside card: `gap:12px; bg surface; border line; radius 16; padding 12; shadow 0 2px 8px rgba(27,24,21,.05)`; thumbnail 64x64 radius 12 (code: h-14 w-14 = 56px, rounded-2xl = 16px) with gradient `#EAF5F1→#CFE8DC` (code: CoverArt with chosen colour bg); icon 26px stroke 1.5 lake. Title h3 Serif 16/24 weight 500 (code: font-semibold 600), empty-state colour ink-subtle and NOT italic in design (code: italic). Day badge: `bg line (#E7DFD2); color ink-muted; radius 99; padding 3px 10px; 12px/700; letter-spacing .5px; line-height 16` (code ok except line-height). Subtitle 12/16, `letter-spacing .4px`, margin `2px 0 8px` (code `my-0.5` = 2px 2px → bottom should be 8px). Avatar 20px, bg `#D2EAE1` (= `bg-v2-lake-tint`; code uses the wrong `bg-v2-lake-soft` → change), text lake, `border:2px solid #fff` (white ring; code has none → add `border-2 border-v2-surface`), 8px/700 "我". Amount "尚未記帳": Serif 16/24 700 ink-subtle (matches).
2. 封面 card — see 0.3.
3. 基本資訊 card: 
   - label `旅程名稱 *` (star colour #C4472F = v2-danger ✓.), input: `padding 13px 14px; radius 12; border 1 line; font 15px/22px; letter-spacing .3px; weight 700; bg paper; color ink`. Code: `bg-v2-surface`, `py-3` (12), `tracking-[.5px]` → change to `bg-v2-paper py-[13px] tracking-[.3px]`.
   - label `出發日與結束日` (margin 16px 0 8px) then date trigger: `gap 8; padding 13px 14px; bg paper; border line; radius 12; colour ink-subtle when empty`; text "選擇日期" 13px. Code DateRangeField trigger: `bg-v2-surface py-3` → `bg-v2-paper py-[13px]` (DateRangeField is shared with A13 where design also uses paper bg + padding 12px 14px → add optional `size`? Simplest: use paper bg in both, padding py-3 in A13, py-[13px] in A9b via className prop).
   - Row: two columns `gap:10px; margin-top:16px`:
     - 結算幣別: box `padding 13px 14px; bg paper; border line; radius 12`, text `TWD 台幣` 13px/700 `letter-spacing .3px`, chevron icon. Code: `CurrencySelect` (shadcn Select trigger styling from v1 UI kit; NOT v2 tokens). `components/ui/currency-select.tsx` shows only the code ("TWD") in trigger — design shows "TWD 台幣" (code + name). Need a v2 wrapper (`components/v2/ui/currency-field.tsx`) that renders the v2 trigger and shows `code name` text. Label mapping (master D22): A9b shows `code + short name` at 13px/700 (TWD→`台幣`, otherwise the full `SUPPORTED_CURRENCIES[].name`); A13 shows `code + full name` at 13px/600 (`新台幣`). Implement a v2 `currencyLabel(code, short?)` helper used by the wrapper. Do NOT change `components/ui/currency-select.tsx` (v1 uses it).
     - 預算（選填）: box with prefix `NT$` (13px, ink-subtle) + input placeholder `10,000` colour ink-subtle; bg paper, padding 13px 14px, gap 6. Code: plain input placeholder "10000", no prefix. Decided (master D10): prefix = symbol of the selected settlement currency (TWD→NT$, JPY→¥, USD→$, otherwise the currency code); NO thousand separators. Recorded.
4. 描述（選填） card: title "描述（選填）" is the card title (13/700 lake, margin 0 0 8); textarea-like box: `padding 13px 14px; 12px (!); colour ink-subtle placeholder; bg paper; border line; radius 12; min-height 64px`. Code: textarea rows=4, `bg-v2-surface`, text 13px → `bg-v2-paper min-h-16 text-xs`. Placeholder text identical: "記錄這次旅行的目的地、日期等資訊……" (A13 uses "…" single ellipsis — keep separate strings).
5. 成員加入方式 card: title 13/700 lake `margin 0 0 2px`, sub 12 ink-subtle `margin 0 0 10px`. Options: card `gap 8`; each: `padding 12px 14px; radius 12; border`, selected: `1.5px solid #2F8F74 (lake-mid) + bg lake-soft`, radio: 16px circle, `border 5px solid lake-mid` (selected) / `1.5px solid check` (unselected); unselected option bg paper (#FAF7F2) + border 1 line. Title `14px/700, lh 20, ls .1` (same as code), desc 12 ink-muted (✓).
   Code diffs: `<legend>` styled as 12/600 ink-muted → card title 13/700 lake; selected border `v2-lake` → `v2-lake-mid`; radio border `v2-lake` → `v2-lake-mid`; unselected bg `surface` → `paper`.
   `JoinModePicker` is shared with A13: in A13 (ProjectSettings) design the radio rows differ: radius 14, selected border `1.5px #1B5847 (lake)` bg lake-soft, radio is 16px FILLED lake circle with 6px white dot, unselected radius 14 border 1px line bg none (surface), title selected 13/700, unselected 13/600 (!). So two variants → give `JoinModePicker` a `variant: "create" | "settings"` prop (default current → keep v1-free; only v2 uses it).
6. Footer CTA: fixed bottom, `padding 14px 16px; bg surface; border-top line`, button `padding 15px; radius 14; bg lake; white; 16px/24 700; ls .15`. Code: `rounded-2xl` (16) text-[15px] → `rounded-[14px] text-base`. Page bottom spacer 100px (code pb-32=128).

Behavior gaps A9b: none new (description 0/50 counter only in A13).

Data/API: none required. `cover` goes through `isValidCover` → new ids must be in lib lists.

## 2. A13 — ProjectSettings (code: `components/v2/project-settings/project-settings-v2-view.tsx`, `project-settings-v2.tsx`, `exchange-rate-row.tsx`, `delete-project-sheet.tsx`)

Structure matches (5 cards: 基本資訊 / 日期與預算 / 幣別與匯率 / 成員加入方式 / danger) with these diffs. Card style identical (radius 18, padding 16, gap 14, 13/700 lake titles) ✓ (code uses rounded-2xl=16px → design 18px; tailwind `rounded-[18px]`; same for A14 cards. NOTE: A9b cards are 16px radius, A13/A14 are 18px.)

1. Inputs: bg paper ✓; padding `12px 14px` ✓; name value font 13/600 ✓.
2. 封面圖示與顏色 row: design = 48x48 tile radius 14, bg = selected cover FG colour (#1B5847 = solid lake) with WHITE icon (colour #FFFFFF), plus text "點擊更換圖示與底色" 12px ink-muted, row `gap:10`, `align-items:center`; tile is a button that opens a picker (picker UI not designed). Code: renders full `CoverPickerV2` inline below a caption.
   Needed: `CoverTileButton` (48px tile, tile bg = cover fg colour var, icon white `text-v2-on-lake`) that opens a bottom sheet (reuse overlay pattern of `DeleteProjectSheet`: `fixed inset-0 z-50 bg-v2-overlay`) containing `CoverPickerV2` + "完成" button. Tile bg for dark mode: use `--cover-fg-dark`? (white icon on #4FB394 is low contrast; proposal: tile bg = cover fg in light, darkFg in dark with icon colour `v2-on-lake`.) Because CoverArt sets bg to cover *bg* (pale), a new `CoverArt variant="solid"` prop is needed: `data-cover-art-solid` + CSS `[data-cover-art-solid]{background-color:var(--cover-fg);color:#fff→var(--v2-on-lake)}` and `.dark ... var(--cover-fg-dark)`.
3. 描述 label row: label left, counter `0/50` right (12px ink-subtle). Textarea min-height 64px, placeholder "記錄這次旅行的目的地、日期等資訊…" (placeholder colour ink-subtle). Code: no counter, rows=4. 50-char handling — **decided (master D9):** show the `n/50` counter only; do NOT set `maxLength`, do NOT truncate, and do NOT block saving. When `n > 50` render the counter in `text-v2-danger`. Add no length rule to `validateProjectForm`. (`lib/hooks/use-project-form.ts` is v2-only, but no change is required.) Recorded.
4. 日期與預算: date trigger `gap 8; bg paper; padding 12px 14px; 13px; text ink` ✓ except bg (code surface). Budget: `$` prefix absolutely positioned at left 14px (colour ink-muted 13px), input `padding 12px 14px 12px 26px`, value "50,000" (thousand separators, display only!). Hint text unchanged ✓. Code: no prefix, no thousand separators (input type text inputMode decimal; formatting while typing is risky → show raw digits; REPORT).
5. 幣別與匯率:
   - 結算幣別 trigger: v2-styled (paper bg, `padding 12px 14px`, text "TWD 新台幣" 13/600) → same `V2CurrencyField` as A9b (A9b text weight 700 "台幣" vs A13 600 "新台幣"; use `CurrencySelect` names from `SUPPORTED_CURRENCIES[].name`).
   - 自訂匯率 row: code `ExchangeRateRow` uses `gap-2.5`, `w-12` code, `text-v2-ink-subtle` "=" ✓, input `bg-v2-surface rounded-xl py-2.5 pl-3 pr-14 text-[13px]` → design: label width 52px, bg paper, padding `10px 44px 10px 12px`, text colour ink-subtle only for placeholder/empty, suffix `right 12px 12px/ink-muted`. Hint "目前使用即時匯率：1 JPY = 0.21 TWD" margin-top 8, 12px ink-muted (code `mt-1.5` = 6 → `mt-2`). Label+hint: label `margin-bottom:4px` + hint `margin 0 0 8px` ✓ (code mb-0.5=2px→mb-1).
   - 匯率計算精度: design 56px-wide *box* with centred "2" bold, bg paper (code input w-16 bg paper ✓: w-16=64 → w-14 = 56px).
6. 成員加入方式: variant "settings" (see A9b item 5). Card `gap:10px`, title row inside card (title 13/700 lake + sub 12 ink-subtle margin-top 4). Code wraps JoinModePicker in standard cardClass (gap 14). Because JoinModePicker renders `<legend>` it must not duplicate the title → in "settings" variant the title is rendered by the card, picker only lists radios.
7. Footer: A13 design shows 取消/儲存變更 INLINE after the cards (not fixed): `display:flex; gap:10px`, cancel `bg surface; border line; radius 14; padding 14; 14/700 ink`, save `bg lake; white; radius 14`. Code: fixed bottom bar with `rounded-2xl`. Decision: keep fixed bar (better UX with long page) but change radius to 14 → recommend following design (inline) ONLY IF user agrees; default: keep fixed bar, radius 14. REPORT.
8. Danger zone: bg `#FDF1EC` (new token danger-tint), border 1px `#F3D3C4` (danger-border), radius 18 padding 16; title 13/700 `#C4432A` (danger-strong); desc 12px same colour; button pill (`radius 99; padding 9px 16px; 12/700; bg #C4432A (danger-strong); white; gap 6`) with Trash icon. Code: `bg-v2-danger-soft border-v2-danger-soft`, text `v2-danger`, button `bg-v2-danger` → swap to new tokens.
9. `DeleteProjectSheet` unchanged (not in design) — only its danger button colours optionally to danger-strong.

## 3. A14 — GeneralSettings (code: `components/v2/settings/general-settings-v2.tsx`)

Design vs code (design new-vs-old diff only touched 3 things; the code predates the new version):
1. REMOVE 預設分帳方式 row (design removes the 均分/自訂金額 control). Code: lines with `defaultSplitMode`. Keep `preferences.defaultSplitMode` data/API untouched (v1 + expense form use it). Update test `switches the default split mode to custom` → assert row is absent.
2. 意見回饋: design = a plain row identical to 功能介紹 (icon + label left, external-link icon right, label 13/700). Code already matches this (v2 renders row with MessageCircle icon). ✓ no change. (Old design had a section heading above the row; new design dropped it — code never had heading.)
3. Profile card, 外觀, 記帳偏好, LINE 通知, 重看導覽, 功能介紹: need re-check vs design:
   - Profile card: ✓ (bg lake, radius 18 [code rounded-2xl=16 → 18], avatar 48px circle — design `rgba(250,247,242,.15)` = `bg-v2-paper/15`; code uses `bg-v2-surface/15`, so switch to paper/15 or record the deviation; serif 15/600, sub 12 opacity .75, chevron).
   - 外觀 (DIFFERENT): design = 3 cards in a row (`gap:8`, each `flex:1; column; align-center; gap 6; padding 12px 8px; radius 12`), each with a 16px icon above label (淺色=sun, 深色=moon, 系統=monitor; svgs in file) ; unselected bg paper + border 1 line, label 12/600 ink-muted; selected (系統 in mock) bg lake-soft + border 1.5px lake, label 12/700 lake. Card title "外觀" 13/700 lake, `margin 0 0 12px`. Code: sand segmented control (`aria-pressed` buttons "淺色/深色/系統"). Keep `aria-pressed` + accessible names so existing test still passes (name = label text; icon is aria-hidden).
   - 記帳偏好: design title row has a leading icon (svg 15px, lake) + title; code title has no icon. Currency trigger: paper bg, radius 12, padding 12px 14px, text "TWD 新台幣" 13/600 + chevron; code uses shadcn `CurrencySelect` → v2 wrapper (same as A9b/A13).
   - LINE 通知: title row has leading icon (bell/message svg) — code none. Checkbox visuals ✓ (20px radius 6, border 1.5px check #C9BFAC ✓). Code uses `role="switch"`; design is `<label>` checkbox → keep switch (tests).
   - 重看導覽 row ✓. 功能介紹 ✓ (external-link icon). 
   - Beta card "新版介面 / 試用新版介面（Beta）" is NOT in design A14 (code has it; feature from milestone 5 per master spec). KEEP (needed for rollout) — REPORT.
   - Card radii: design 18px everywhere (code rounded-2xl=16).
   - Page frame/title ✓.
Behavior gaps: none missing in code (all rows exist). Profile name initial uses first character ✓. "重看導覽" works. "功能介紹" opens `/` in new tab (design `href="#"`) — fine.

## 4. Test plan (existing → needed)
- `tests/lib/covers-icon.test.ts`: update id lists (lines 6, 7) and dark values test (lines 27–34) to include new icons/ink; keep `red` in COVER_COLORS; add test `COVER_PICKER_COLORS` excludes red and equals [lake, coral, plum, gold, rose, ink]; add `isValidCover("icon:camera;color:ink")` true and `icon:rocket;color:lake` still false.
- `tests/components/v2/cover.test.tsx` (3 picker tests): update for 38px circle tiles, new aria names, `更多圖示` button, removed upload button (or `allowUpload`), color tile `aria-pressed`, check icon on selected tile.
- `tests/components/v2/new-project-v2.test.tsx` (4 tests): add section titles (卡片預覽/封面/基本資訊/描述（選填）/成員加入方式 all present), budget prefix `NT$`, currency trigger shows "TWD 台幣", still posts same payload (regression: payload unchanged).
- `tests/components/v2/project-settings-v2.test.tsx` (7 tests): cover tile opens sheet and saves chosen cover in PUT; description counter `n/50`; danger card tokens (class names `bg-v2-danger-tint`, `border-v2-danger-border`); join-mode settings variant radios still have accessible names; budget `$` prefix.
- `tests/components/v2/general-settings-v2.test.tsx` (10 tests): remove split-mode test (line 107) → assert `預設分帳方式` absent; appearance cards keep `aria-pressed`; 3 cards each contain an svg icon.
- New `tests/components/v2/join-mode-picker.test.tsx`, `v2-currency-field.test.tsx`, token test for globals.css.
- Coverage baseline (scratchpad coverage-baseline.txt): `components/v2/new-project` 81.81/67.85/63.63/84.37, `components/v2/project-settings` 79.5/64.36/61.29/81.81, `components/v2/settings` 90/72.72/76.92/90, `components/v2/cover` 93.47/85.71/91.66/95.45, `lib/covers.ts` 97.82. Target after change: no folder below baseline; new files ≥ 90% lines.
- `tests/components/v2/no-hardcoded-colors.test.ts` must stay green: no hex / `dark:` in components/v2 (cover colours from lib data via CSS vars are fine; tile colour must come from `style={{ "--tile": color.fg }}` not className).

## 5. v1 safety checklist
- Do not edit `components/v1/**`, `components/ui/currency-select.tsx`, `components/ui/*`. Create v2 wrappers instead.
- `lib/covers.ts` is shared (API validation + v1 `toLegacyCover`): only ADD ids; never remove `red`. v1 shows preset 1 for any `icon:` cover → no break.
- `lib/hooks/use-project-form.ts` is only imported by v2 (verify: `grep -rn use-project-form app components lib` shows only components/v2) → safe to add description-length validation.
- globals.css: add tokens only inside `[data-ui="v2"]` / `.dark [data-ui="v2"]` and the `@theme inline` block (new `--color-v2-*` names can't clash with v1).
- No API change needed for A9b/A13/A14. `PUT /api/users/profile` already accepts preferences; `defaultSplitMode` is preserved in stored preferences (usePreferences merges raw prefs).

## 6. Open questions / decisions (updated after verification)
Decided by the master spec (no need to re-ask):
1. Reference canvas = `design/project-v20261003/` (master D1); `design/project/` is untouched.
2. "更多圖示" = disabled placeholder, `title="即將推出"`, `aria-label="更多圖示"` (D2).
3. New icon ids/lucide mapping and `ink` cover values are decided (D3/D4); dark values remain proposals.
4. `red` dropped from the picker but kept in `COVER_COLORS` data (D5) — old `icon:*;color:red` covers still render.
5. Custom-image upload removed; "移除自訂圖片" retained when the value is custom (D6).
6. A13 cover row = 48px tile opening a bottom-sheet picker (D7) — self-added, not in the design.
7. A13 save/cancel stays a fixed bottom bar, radius 14 (D8) — design was inline.
8. Description `n/50` counter only, never truncate/block (D9).
9. Budget prefix = currency symbol, no thousand separators (D10).
10. Beta switch card stays in A14 (D11).
11. Dark-mode values for `danger-tint`, `danger-border`, `danger-edge`, `lake-edge`, and `ink` cover are proposals pending designer confirmation.
12. A9b currency label uses the short name `台幣` (D22), A13 uses the full `新台幣`.
13. A13 budget prefix in the mock is a literal `$`; D10 makes it currency-dependent (`NT$` for TWD) — the mock is not authoritative.

Already-listed problems still worth flagging to the user: the risk of existing long descriptions only showing a red counter without blocking (D9); the tile-based cover picker being a self-added interaction for A13 (D7).
