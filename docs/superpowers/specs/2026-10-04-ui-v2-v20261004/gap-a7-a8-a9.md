# Gap report: A7b (成員) / A8b (統計) / A9b (建立旅程) — v20261004 vs current v2 code

- Date: 2026-10-04
- Branch: `feat/ui-v2-m6`
- Design source: `design/project-v20261004/{Members-sections,Stats-sections,NewProject-sections-demo}.dc.html`
- Code: `components/v2/{members,stats,new-project,cover,project,ui}/*`, `lib/covers.ts`, `app/globals.css`
- Templates: `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a5-a7.md`, `.../gap-a9-a14.md`, `.../2026-10-03-ui-v2-milestone-6-design.md`
- Method: `diff` of the 20261003/20261004 boards, then line-level read of the current code on `feat/ui-v2-m6`.

## Delta isolation (what actually changed in the canvas)

| Board | 20261003 → 20261004 | Action for this report |
|---|---|---|
| `Members-sections.dc.html` | **byte-identical** (`diff` empty) | verify current code still matches the board; report residual deviations |
| `NewProject-sections-demo.dc.html` | **byte-identical** (`diff` empty) | verify current code still matches the board; report residual deviations |
| `Stats-sections.dc.html` | **NEW** (no 20261003 counterpart) | compare the whole board vs current code |

Consequence: A7b and A9b were already implemented in milestone 6. Everything below for those two is residual polish (2–4px / letter-spacing); A8b is the only board with structural work (headings move inside cards + a new bottom link).

Radius reference for this repo (important for every table): `--radius: 0.625rem` and `--radius-xl: calc(var(--radius) + 4px)` (`app/globals.css:40-43,61`), so **`rounded-lg` = 10px, `rounded-xl` = 14px**; `rounded-2xl` keeps Tailwind's 16px default. The designs write `8px`, `12px`, `14px`, `16px` literally.

---

## 1. A7b 成員 — `components/v2/members/members-v2-view.tsx`

Design card quote (Lines 33–50):
```
<div style="margin:14px 16px 16px;background:#FFFFFF;border:1px solid #E7DFD2;border-radius:16px;padding:16px;">
  <p style="margin:0;font-size:13px;color:#1B5847;font-weight:700;">成員列表</p>
  <button ... style="...height:32px;padding:0 10px;border-radius:8px;border:1px solid #B7D9CB;background:#EAF5F1;color:#1B5847;font-size:12px;font-weight:600;">
  <span style="font-size:12px;color:#6E6860;">成員組成 . 4 位旅伴</span>
  <a href="ProjectSettings.dc.html" style="font-size:12px;color:#24735D;font-weight:500;">前往專案設定修改加入方式</a>
  <div style="...padding:14px 0;border-bottom:1px solid #F0EAE0;"> .. 44px avatar ..
```

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| Card | `margin:14 16 16; radius 16; padding 16; border #E7DFD2` | `members-v2-view.tsx:34` `mx-4 mb-4 mt-3.5 rounded-2xl border border-v2-line bg-v2-surface p-4` | **no change** (16/16/14, radius 16, p 16) |
| Card title 成員列表 | `13px / 700 / #1B5847` | `:36` `text-[13px] font-bold text-v2-lake` | **no change** |
| Action pills 分享 / 增加成員 | `h32; padding 0 10; radius 8px; border #B7D9CB; bg #EAF5F1; #1B5847; 12/600; gap 5` | `:24-25` `h-8 … gap-[5px] rounded-lg border-v2-lake-edge bg-v2-lake-soft px-2.5 text-xs font-semibold text-v2-lake` — `rounded-lg` = **10px** | `rounded-lg` → `rounded-[8px]` (2px) |
| Sub row | `margin-bottom:12px`; left `12px/#6E6860`; right `12/500/#24735D` | `:48-52` `mb-3`; `text-xs text-v2-ink-muted`; `text-xs font-medium text-v2-link` | **no change**. Design separator is literal `" . "`, code renders `·` (`:49`). Accepted deviation (report D21-style). |
| Member rows | `padding:14px 0`; divider `#F0EAE0`; last row `padding:14px 0 0` | `:64` `py-3.5` + `border-b border-v2-line-soft` / `pt-3.5` | **no change** |
| Avatar | 44px circle; placeholder = sand + user icon 19px | `:66-73` `h-11 w-11`; `bg-v2-sand text-v2-ink-subtle` + `<User h-[19px]>` | **no change** |
| Name | `13px / 700` | `:76` `text-[13px] font-bold` | **no change** |
| Badges | 建立者 `2px 7px` lake-soft/lake; 你 `1px 7px` surface + `#DCEAE3`/lake; 佔位 `2px 7px` sand/ink-muted | `:26,77-79` `badge` base `px-[7px] py-0.5`; 你 adds `py-px`; tokens `bg-v2-lake-soft`, `bg-v2-surface border-v2-lake-border`, `bg-v2-sand` | Hygiene: `py-px` is concatenated after `py-0.5` on the same element → relies on Tailwind output order. Make it conditional/last-wins explicit (e.g. build the 你 badge class without the base `py-0.5`). 1px visual. |
| Email / 尚未加入 | `12px #6E6860` / `12px #B7AE9D` | `:81-83` `text-v2-ink-muted` / `text-v2-ink-subtle` | **no change** |
| Remove button | 32px; radius 9; icon 16/1.7 `#C4472F` | `:91-93` `h-8 w-8 rounded-[9px] text-v2-danger`, `<UserMinus h-4 w-4 strokeWidth 1.7>` | **no change** |
| TopBar | `17px / 600` | `:33` (and `members-v2.tsx:25,34`) `titleClassName="text-[17px] font-semibold"` | **no change** |
| Batch bar | **absent from design** | **absent from code** (removed in `0d9a190`) | **no change** (deliberate removal confirmed) |

**A7b verdict: functionally no change.** Only optional polish: pill radius 10→8 and the badge `py` class hygiene.

---

## 2. A8b 統計 — `components/v2/stats/*`

Design card quotes:
```
<div style="padding:22px 16px 0;">
  <div style="background:#FFFFFF;border:1px solid #E7DFD2;border-radius:16px;padding:16px;">
    <p style="margin:0 0 10px;font-size:12px;color:#6E6860;font-weight:600;">類別佔比</p>
    ...
```
```
<div style="background:#FFFFFF;border:1px solid #E7DFD2;border-radius:14px;padding:16px 16px 10px;">
  <p style="margin:0 0 10px;font-size:12px;color:#6E6860;font-weight:600;">每日趨勢</p>
```
```
<div style="margin:14px 16px 0;text-align:center;">
  <a href="Stats.dc.html" ...><svg …chart-line 13px…></svg><span>查看結算</span><svg …chevron 11px…></svg></a>
```

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| TopBar 統計 | `17px / 600` serif | `stats-v2-view.tsx:19` default `text-base font-medium`; `stats-v2.tsx:22,36` default | add `titleClassName="text-[17px] font-semibold"` to **all three** V2TopBar usages (view + loading + not-found) |
| Section wrappers | `padding:22px 16px 0` | `stats-v2-view.tsx:20,26,32` `px-4 pt-[22px]` | **no change** |
| Card 1 類別佔比 | radius 16, border line, p 16, **heading inside card**, heading `0 0 10px / 12px / 600 / #6E6860` | `:21` heading `<p className={heading}>` sits **OUTSIDE** the card, `:14` heading = `mb-1.5 text-xs font-semibold text-v2-ink-muted` (mb 6px) | move heading **inside** the card; `mb-1.5` → `mb-2.5` (10px) |
| Donut | 108×108, stroke 15, base `#F0EAE0`; arcs coral/plum/lake-mid/gold | `category-donut.tsx:26` `width/height 108`, stroke 15; `:28` `stroke="#F0EAE0"`; `:6` COLORS hex | visual match; replace inline hex literals with `var(--v2-coral|plum|lake-mid|gold|rose|lake|line-soft)` (token-only rule; see §4) |
| Legend | `gap:9px`; swatch 10px r3; label 12/600 + `%` ink-subtle 500; amount 12/600 ink-muted | `category-donut.tsx:44-53` `gap-[9px]`, `h-2.5 w-2.5 rounded-[3px]`, `text-xs font-semibold`, `font-medium text-v2-ink-subtle`, `text-v2-ink-muted` | **no change** (colors via tokens) |
| Card 2 成員排行 | radius 16, p 16, **heading inside**, rows `gap:10px`; avatar 26; track 8px `#F0EAE0`; first fill `#1B5847`, rest `#2F8F74`; amount width 68 right | `:26-31` heading OUTSIDE, `mb-1.5`; `member-ranking.tsx:21,26-40` gap-2.5 / h-[26px] / h-2 line-soft / `i===0 ? bg-v2-lake : bg-v2-lake-mid` / `w-[68px]` | move heading inside card; `mb-1.5` → `mb-2.5` |
| Card 3 每日趨勢 | radius **14**, padding `16 16 10`, **heading inside**, heading `0 0 10px`; svg 342×90; labels `margin-top:6px` | `:32-37` heading OUTSIDE `mb-1.5`; `figure` `rounded-[14px] px-4 pb-2.5 pt-4`; `daily-trend.tsx:44` `mt-1.5` | move heading inside `<figure>`; `mb-1.5` → `mb-2.5`; radius/padding already match |
| Bottom 查看結算 link | `margin:14px 16px 0`, centered; `12/600 #6E6860`, icon 13px stroke 1.7, chevron 11px stroke 2.2 → `/projects/{id}/settle` | **MISSING** from `stats-v2-view.tsx` | add, mirroring the existing reverse link in `settle-v2-view.tsx:85-91` |
| Bottom spacer | `height:24px` | `:38` `<div className="h-6" />` | **no change** |

Detail for the new link (exact quote from design Lines 130–135):
```html
<div style="margin:14px 16px 0;text-align:center;">
  <a ... style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#6E6860;font-weight:600;">
    <svg ... width="13" height="13" ... stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>
    <span>查看結算</span>
    <svg ... width="11" height="11" ... stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>
  </a>
</div>
```
Proposed implementation (do not import `Link` from `next/link` — already available):
```tsx
<div className="mx-4 mt-3.5 text-center">
  <Link href={`/projects/${projectId}/settle`} className="inline-flex items-center gap-[5px] text-xs font-semibold text-v2-ink-muted">
    <LineChart className="h-[13px] w-[13px]" strokeWidth={1.7} aria-hidden="true" />
    查看結算
    <ChevronRight className="h-[11px] w-[11px]" strokeWidth={2.2} aria-hidden="true" />
  </Link>
</div>
```
`LineChart` is available in the installed `lucide-react` (verified). `BarChart3` (used by the reverse link) is an acceptable substitute if a consistency choice is preferred.

**A8b verdict: 3 structural deviations** — (1) all three headings rendered outside the card, (2) no `查看結算` link, (3) TopBar title weight/size; plus a token-hygiene item on `category-donut`/`daily-trend` inline hex.

---

## 3. A9b 建立旅程 — `components/v2/new-project/new-project-v2.tsx`

Design quote (Lines 119–123, 149–151, 154–159):
```
<input ... style="border:1px solid #E7DFD2;border-radius:12px;padding:13px 14px;font-size:15px;line-height:22px;letter-spacing:.3px;font-weight:700;background:#FAF7F2;">
<p style="margin:0 0 8px;font-size:13px;color:#1B5847;font-weight:700;">描述（選填）</p>
<div style="border-radius:12px;padding:12px 14px;border:1.5px solid #2F8F74;background:#EAF5F1;">
```

| Element | Design (v20261004) | Current code (file:line) | Change needed |
|---|---|---|---|
| TopBar 建立旅程 | `16/500` serif lh24 ls.15; header padding 16 | `new-project-v2.tsx:58` V2TopBar default (`text-base font-medium`, `px-3.5 py-4`) | **no change** (side padding 14 vs 16 = accepted X2) |
| Cards | `margin:16 16 0; radius 16; p 16; title 13/700 lake` | `:16-17` `cardClass … rounded-2xl border … p-4`, `titleClass text-[13px] font-bold text-v2-lake` | radius/padding **no change**. Title spacing: `cardClass` uses `gap-4` (16px) uniformly, design title gaps are **12px** (卡片預覽/封面/基本資訊), **8px** (描述). Fix by keeping `gap-4` and appending `-mb-1` (→12) / `-mb-2` (→8) to the title, or wrap fields in a nested flex. |
| 卡片預覽 row | gap 12, p 12, radius 16, shadow `0 2px 8px rgba(27,24,21,.05)` | `trip-preview-card.tsx:28` `gap-3 rounded-2xl border … p-3 shadow-[0_2px_8px_rgba(27,24,21,.05)]` | **no change** |
| Thumbnail | 64px, radius **12** | `trip-preview-card.tsx:29` `h-16 w-16 rounded-xl` = **14px** | `rounded-xl` → `rounded-[12px]` |
| Preview icon | 26px stroke 1.5 lake | `cover-art.tsx:8` default `h-[26px] w-[26px]`, `strokeWidth 1.5` | **no change** |
| Preview title | serif 16/24 500; empty → ink-subtle | `trip-preview-card.tsx:32` `font-v2-serif text-base font-medium`, `text-v2-ink-subtle` when empty | **no change** |
| Day badge | `padding:3px 10px; radius 99; 12/700; line-height 16; letter-spacing .5` | `:33` `px-2.5 py-[3px] text-xs font-bold leading-4` | add `tracking-[.5px]` |
| Subtitle | `margin:2px 0 8px; 12/16; ls .4; ink-subtle` | `:37` `mb-2 mt-0.5 tracking-[.4px] text-v2-ink-subtle` | **no change** |
| Avatar | 20px lake-tint; `border:2px solid #fff`; 8/700 | `:39` `h-5 w-5 border-2 border-v2-surface bg-v2-lake-tint text-[8px] font-bold` | **no change** |
| Amount 尚未記帳 | serif 16/24 700 ink-subtle | `:40` `font-v2-serif text-base font-bold text-v2-ink-subtle` | **no change** |
| 封面 圖示/顏色 | labels 12/600 ink-muted `mb:8px`; icon tiles 38 circle (selected lake-soft + 1.5 lake-mid; idle surface + 1 line); colour tiles 38 r**12** + ring; 更多 tile sand/line | `cover-picker-v2.tsx:20,35-37,49,64,78` | **no change**. Per-icon glyph sizes in the design are 15/16/17px; code renders all at 17px — accepted. |
| 基本資訊 title | `margin:0 0 12px` | `:71` (card gap) | see card-title spacing |
| Name input | `padding 13 14; radius 12; bg #FAF7F2; 15px/700; ls .3` | `:83` `rounded-xl … px-3.5 py-[13px] text-[15px] font-bold tracking-[.3px]` (=14px radius) | `rounded-xl` → `rounded-[12px]` |
| Date trigger | `padding 13 14; radius 12; bg paper; 13px; empty ink-subtle` | `date-range-field.tsx:43` `rounded-xl … px-3.5 py-3` + `triggerClassName="py-[13px]"` | `rounded-[12px]` (**shared with A13** — verify A13 also 12px before changing the default) |
| 結算幣別 trigger | `padding 13 14; radius 12; bg paper; "TWD 台幣" 13/700 ls .3` | `ui/currency-field.tsx:39` `rounded-xl … px-3.5 py-3 text-[13px]`, `:41` bold when `short` | `rounded-[12px]` (**shared with A13/A14**) |
| 預算 box | prefix `NT$` 13 ink-subtle; `padding 13 14; radius 12; bg paper` | `new-project-v2.tsx:108` `rounded-xl … px-3.5 py-[13px]`; prefix `:109` | `rounded-[12px]` |
| 描述 card | title `margin:0 0 8px`; box `padding 13 14; radius 12; min-height 64; bg paper; 12px ink-subtle` | `:126-135` `min-h-16 rounded-xl … px-3.5 py-[13px] text-xs` | `rounded-[12px]`; card title gap → 8px |
| 成員加入方式 | title `margin:0 0 2px`; sub `margin:0 0 10px`; options `padding 12 14; radius 12` | `join-mode-picker.tsx:21-22` `mb-0.5` / `mb-2.5`; `:31-32` create variant `rounded-xl` (=14) | create variant `rounded-xl` → `rounded-[12px]` |
| Join option selected | `1.5px #2F8F74` + lake-soft; radio 16px `border 5px lake-mid` | `join-mode-picker.tsx:36-37,57` | **no change** |
| Option title/desc | `14/700` lh20 ls.1; `12 ink-muted` | `:60-61` `text-sm font-bold leading-5 tracking-[.1px]`, `text-xs text-v2-ink-muted` | **no change** |
| Footer CTA | `padding 14 16; bg surface; border-top line`; button `padding 15; radius 14; bg lake; on-lake; 16/24 700; ls .15` | `new-project-v2.tsx:144-158` `px-4 py-3.5`; `rounded-[14px] bg-v2-lake py-[15px] text-base font-bold text-v2-on-lake` | add `tracking-[.15px]` (micro) |
| Page bottom spacer | `height:100px` | `:59` `pb-32` (=128px) | `pb-[100px]` (optional, 28px) |

**A9b verdict: no functional change.** Residual polish only: shared inputs render at 14px radius (design 12px), preview thumbnail 14 vs 12, two missing letter-spacings, and a 28px-taller bottom spacer.

---

## 4. Files to modify

Structural (A8b):
- `components/v2/stats/stats-v2-view.tsx` — move the three headings inside their cards (`mb-2.5`), add the bottom `查看結算` link, pass `titleClassName="text-[17px] font-semibold"`.
- `components/v2/stats/stats-v2.tsx` — add `titleClassName="text-[17px] font-semibold"` to the loading and not-found V2TopBar usages.

Token hygiene (A8b, optional but required by the "token-only" rule):
- `components/v2/stats/category-donut.tsx` — replace inline hex colours (`:6,28,34-39,47`) with `var(--v2-*)`.
- `components/v2/stats/daily-trend.tsx` — replace inline hex (`:34-41`) with `var(--v2-lake-mid)` / `var(--v2-lake)`.

Residual polish (A7b/A9b, optional, low severity):
- `components/v2/members/members-v2-view.tsx` — pill `rounded-[8px]`; 你-badge `py` made conditional.
- `components/v2/new-project/trip-preview-card.tsx` — `rounded-[12px]` thumbnail; `tracking-[.5px]` on the day badge.
- `components/v2/new-project/new-project-v2.tsx` — `rounded-[12px]` on name/budget/textarea boxes; card-title spacing (`-mb-1`/`-mb-2`); `tracking-[.15px]` CTA; `pb-[100px]`.
- `components/v2/project/date-range-field.tsx`, `components/v2/ui/currency-field.tsx`, `components/v2/project/join-mode-picker.tsx` — `rounded-[12px]`. **Shared with A13/A14** — check those boards also specify 12px before changing defaults (they use 12px paper inputs per `gap-a9-a14.md` §2.1/§3.3, so this is consistent, but A13/A14 are out of this report's scope).

Tests:
- `tests/components/v2/stats-v2.test.tsx` (update + add).

No edits outside `components/v2/**` and `tests/**`. `lib/covers.ts`, `app/globals.css`, `components/ui/**`, `lib/**` are untouched.

## 5. New tokens

**None.** Every colour in `Stats-sections.dc.html` maps to an existing v2 token:

| Design hex | Existing token |
|---|---|
| `#FAF7F2` | `--v2-paper` |
| `#FFFFFF` | `--v2-surface` |
| `#1B1815` | `--v2-ink` |
| `#6E6860` | `--v2-ink-muted` |
| `#B7AE9D` | `--v2-ink-subtle` |
| `#E7DFD2` | `--v2-line` |
| `#F0EAE0` | `--v2-line-soft` |
| `#1B5847` | `--v2-lake` |
| `#D2EAE1` | `--v2-lake-tint` |
| `#2F8F74` | `--v2-lake-mid` |
| `#E8825A` | `--v2-coral` |
| `#C4602F` | `--v2-coral-strong` |
| `#FBE3D2` | `--v2-coral-soft` (design avatar bg; visually equal) |
| `#6B5B95` | `--v2-plum` |
| `#EFEAF7` | `--v2-plum-soft` |
| `#9C7A28` | `--v2-gold` |
| `#F7EFDD` | `--v2-gold-soft` |
| `#A14A68` | `--v2-rose` |
| `#F1EBE0` | `--v2-sand` |
| `#FFF` ring | `--v2-surface` |

Because no new token is added, `tests/components/v2/v2-tokens.test.ts` is unchanged.

## 6. Tests to add/update

`tests/components/v2/stats-v2.test.tsx`:
- ADD (heading placement): for each of 類別佔比 / 成員排行 / 每日趨勢, assert the heading's closest `div.rounded-2xl` (or `figure`) is the same node that contains the chart/list — i.e. headings are inside the card. Example: `expect(screen.getByText("類別佔比").closest("div.rounded-2xl")).toBe(screen.getByRole("list",{name:"類別佔比"}).closest("div.rounded-2xl"))`.
- ADD (link): `expect(screen.getByRole("link",{name:/查看結算/})).toHaveAttribute("href","/projects/p1/settle")`.
- ADD (TopBar): `expect(screen.getByRole("heading",{level:1,name:"統計"}).className).toContain("text-[17px]")` and `toContain("font-semibold")`.
- Existing tests stay valid: `getByRole("list",{name:"類別佔比"})`, `getByRole("list",{name:"成員排行"})`, `getByRole("figure",{name:"每日趨勢"})` all still resolve after the headings move inside.

`tests/components/v2/members-v2.test.tsx`: **no change required** — existing assertions already cover title, count, link, badges, pills, removal, owner gating. Optionally add a class assertion for the `rounded-[8px]` pill if that polish lands.

`tests/components/v2/new-project-v2.test.tsx`: **no change required** — tests do not assert radii/spacing. The payload regression test (`icon:car;color:lake` etc.) is unaffected.

`tests/components/v2/no-hardcoded-colors.test.ts`: stays green. Its regex only catches `-[#...]` classes, `bg-white`, `text-white`, `bg-black`, `dark:`; the inline `stroke=...`/`style` hex in `category-donut.tsx` and `daily-trend.tsx` is not matched, so converting those to `var(--v2-*)` is a review-rule improvement, not a test fix.

## 7. Open questions / API gaps / UI-only items

1. **UI-only:** the new `查看結算` link is pure navigation to the existing `/projects/{id}/settle` route. No API, schema, or data change.
2. **No API gaps** for any of the three boards. `StatsV2View` already receives everything it needs (`projectId`, `currency`, `stats`, `currentMemberId`).
3. **Design vs code formatting (accepted, D17):** the design prints `NT$19,440`; the code prints `TWD 19,440` via `formatCurrency`. Keep `formatCurrency` (shared with v1 and asserted by tests).
4. **Stats heading style is intentionally different** from the other "Section" screens: A8b card headings are `12px / 600 / ink-muted`, not the `13px / 700 / lake` used in A5b/A6b/A7b. Confirm this is intended for Stats (it is what the board shows).
5. **Residual A9b radii:** the 12px→14px (`rounded-xl`) discrepancy is a pre-existing m6 miss that affects several shared v2 fields (`V2CurrencyField`, `DateRangeField`, `JoinModePicker` create variant). Since those are shared with A13/A14, decide once whether to normalise all v2 paper inputs to `rounded-[12px]`.
6. **Icon choice:** design's 查看結算 glyph is a line-chart; `LineChart` is available. `BarChart3` (used by the settle→stats link) is the fallback for visual symmetry between the two reciprocal links.
7. **A7b `成員組成 .`** vs code `成員組成 ·`: accepted deviation (middle dot reads better than the design's spaced period).

## 8. v1 regression risks

- **All proposed edits are inside `components/v2/**` and `tests/**`.** No `components/v1/**`, `components/ui/**`, `components/expense/**`, `app/api/**`, `prisma/**`, or `lib/**` changes. `lib/covers.ts` and `app/globals.css` are **not** touched (no new ids, no new tokens).
- **Stats:** `app/projects/[id]/stats/page.tsx` renders `StatsV2` only behind the v2 flag; `StatsV1` is untouched. The new link uses `next/link` to an existing route.
- **Shared v2 components:** `V2CurrencyField` (A9b/A13/A14), `DateRangeField` (A9b/A13), `JoinModePicker` (A9b/A13), `CoverPickerV2` (A9b/A13) are v2-only and never imported by v1. A radius change is cosmetic and cannot affect v1. Still, because A9b/A13/A14 share them, the change must be applied once against all three boards (this report covers only A9b).
- **`DateRangeField` popover** continues to use the v1 `Calendar`/`Popover` UI kit (read-only dependency). No shared file is modified.
- **Tests:** adding the Stats link/heading assertions does not alter any v1 test path; `tests/components/v1/**` untouched.
- **v1 protection command (baseline `36633e1`)** must remain empty:
  `git diff --name-only 36633e1 -- components/v1 components/ui components/expense components/location-picker.tsx app/api prisma lib/hooks/useExpenseFilters.ts lib/expense-split.ts lib/project-overview.ts lib/trip.ts`
