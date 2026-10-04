# Gap report — A2 旅程總覽 + A2d 功能區塊 (design v20261004, verify-only)

Design inputs: `design/project-v20261004/Trip-m0lh.dc.html` (A2), `design/project-v20261004/Trip-feature-row-demo.dc.html` (A2d).
Current code: `components/v2/project/**` (branch `feat/ui-v2-m6`).
Reference spec: `docs/superpowers/specs/2026-10-03-ui-v2-milestone-6/gap-a1-a2.md`.

**Board identity:** both boards were confirmed byte-identical between `project-v20261003/` and
`project-v20261004/` (`diff -q` clean). A2d remains the authoritative pixel reference for the 功能 row.

**Scope:** verify-only. Only changes to `components/v2/**` (+ `app/globals.css` new tokens, tests) may be
proposed; no v1/shared files. Components stay token-only.

## Gap table

| Element | Design | Current code | Change needed |
|---|---|---|---|
| Top bar: back arrow | 34px circle, `border #E7DFD2`, `bg #FFFFFF`, chevron 18px | `V2TopBar` 34px circle, `border-v2-line bg-v2-surface`, `ChevronLeft` 18px | none |
| Top bar: title | 16px/500 serif, ls .15px | `V2TopBar` `text-base font-medium` serif `leading-6 tracking-[.15px]` | none |
| Top bar: right avatar | 36px lake circle, initial, links `GeneralSettings` / aria 通用設定 | `project-overview-v2-view.tsx` L33-39: 36px (`h-9 w-9`) lake circle initial → `/settings`, aria `通用設定` | none |
| Title block | h2 24px/32px; date line 12/16 ls.4 muted; description 12/17 ls.3 clamp-2 muted, `mt 6px` | h2 `text-2xl leading-8`; date `text-xs leading-4 tracking-[.4px] muted`; description `mt-1.5 line-clamp-2 text-[12px] leading-[17px] tracking-[.3px] muted` (rendered only when set) | none |
| Pill buttons 分享 / 修改 | 32px, `padding 0 10px`, radius 9, border `#B7D9CB`, bg `#EAF5F1`, text `#1B5847`, 12/600 | `h-8 rounded-[9px] border-v2-lake-edge bg-v2-lake-soft text-v2-lake text-[12px] font-semibold`; 分享 `Share2` button, 修改 `Pencil` link → `/projects/{id}/settings` | none (see deviations 4) |
| Trip summary card | `margin 12px 16px 0`, radius 20, bg lake, text paper, `padding 16px 20px`; decoration 120px at `-24px/-24px`, opacity .08, stroke 1.2 | `mx-4 mt-3`, `rounded-[20px] bg-v2-lake text-v2-paper`, `px-5 py-4`; `Decoration` sized/positioned/opacity/stroke identical | none (decoration glyph — deviation 1) |
| Summary text/progress | label 14/20 .78; amount 32 serif 40; avg 12/16 .85; bar 5px `rgba(250,247,242,.22)` + paper fill + %; budget line 12/16 .75 | identical classes (`text-sm`, `text-[32px]`, `text-xs`, `h-[5px]`, `bg-[rgba(250,247,242,.22)]`, `opacity-[.78]/.85/75`) | none (budget text — deviation 2) |
| Balance card | `margin 12px 16px 0`, radius 18, border line, `padding 12px 16px`; label 13/700 lake; info 16px `#C9BFAC`; amount 24 serif ink | `mx-4 mt-3 rounded-[18px] border border-v2-line bg-v2-surface px-4 py-3`; label `text-[13px] font-bold text-v2-lake`; info `border-v2-check text-v2-ink-subtle h-4 w-4`; amount `text-v2-ink` (danger when <0) | none (negative colour — deviation 7) |
| 功能 card frame + title | `padding 16px 12px 12px`, radius 18; title "功能" 13/700 lake inside card, `padding 0 4px`, `margin 0 0 12px` | `px-3 pb-3 pt-4 rounded-[18px] …`; `<p class="mb-3 px-1 text-[13px] font-bold text-v2-lake">功能</p>` inside card | none |
| 功能 primary row | 5 tiles flex `space-between`; 52px column, 46px circle, gap 5px; icons 18px; labels 11/500 lh14 ls.3 (匯率 12/500 lh16 ls.5) | 4 links + 更多 button, `w-[52px] gap-[5px]`, `h-[46px] w-[46px]` circles, icons `h-[18px] w-[18px]`, `labelClass`/`wideLabelClass` (匯率 = wide) | none (stroke/glyph — deviations 5,6) |
| 功能 tones | 結算 lake, 成員 coral, 統計 plum, 匯率 coral, 更多 sand/ink-muted; open → lake/white | `bg-v2-lake-soft/coral-soft/plum-soft/coral-soft/sand`, open `bg-v2-lake text-v2-on-lake` | none |
| 更多 expanded panel | `margin-top 14px; padding-top 14px; border-top 1px dashed #E7DFD2`; label 更多功能 11/700 ink-subtle ls.5 `padding 0 4px mb 12px`; `grid 5cols; gap 12px 4px`; 6 links 歷史/里程/匯出/筆記/地圖/照片 | `mt-3.5 border-t border-dashed border-v2-line pt-3.5`; label `text-[11px] font-bold tracking-[.5px] text-v2-ink-subtle`; `grid grid-cols-5 gap-x-1 gap-y-3`; 6 links in order | none |
| 更多 secondary tones | 歷史 rose, 里程 lake, 匯出 gold, 筆記 plum, 地圖 gold, 照片 rose | `bg-v2-rose/lake/gold/plum/gold/rose-soft` matching order | none |
| 最近支出 card | heading inside card `padding 14px 14px 8px`, 13/700 lake + 查看全部; card `margin 22px 16px 0`, radius 16; rows `padding 12px 14px` gap 12, 40px icon radius 12, title 14/500, sub 12 muted, amount 14/700 | heading inside card `px-3.5 pb-2 pt-3.5`; card radius 16; rows `gap-3 px-3.5 py-3`, `h-10 w-10 rounded-xl`, `text-sm`/`text-xs`/`text-sm font-bold` | **minor: top gap** `pt-5` (20px) → `pt-[22px]` in `recent-expenses.tsx` |
| FABs (no camera) | AI pill 44px coral + label; manual 56px lake, shadow `0 6px 16px rgba(27,88,71,.4)`; camera FAB absent | AI FAB `h-11 w-11 bg-v2-coral` + pill; manual `h-14 w-14 bg-v2-lake shadow-[0_6px_16px_rgba(27,88,71,.4)]`; no camera FAB (`onCamera` removed) | none |

## Intentional deviations carried from M6

1. **Trip-summary decoration follows the project cover icon** — commit `a8b340d` "use project cover icon on
   v2 trip summary decoration". `trip-summary-card.tsx` L19-20 + `project-overview-v2-view.tsx` L67:
   `parseCover(cover)` → if `icon:<id>;color:<id>`, render `COVER_ICON_COMPONENTS[iconId]`, else `Sparkles`.
   This **conflicts with the A2 board**, which shows the Sparkles glyph. Confirmed intentional: the change is
   icon-only (colour is still the parent `text-v2-paper` at opacity .08, so the cover colour is *not* applied),
   and the assignment states this was the intended recent change. Tests:
   `uses the project cover icon on the trip summary card` + `falls back to the sparkle decoration without an
   icon cover`. No change needed.
2. **Budget line carries the 剩餘/超支 prefix** — code renders `… ／ …（剩餘 NT$27,400）` / `（超支 …）`; the
   board shows `（NT$27,400）` with no prefix. Kept deliberately in M6 (test assertion on
   `TWD 48,600 ／ TWD 76,000（剩餘 TWD 27,400）` must keep passing).
3. **匯率 label is 12px/500** — A2 board uses 11px/500 for 匯率, A2d uses 12px/500. M6 designated A2d as the
   authoritative pixel reference, so the code uses the wider label. (The two boards disagree; code follows A2d.)
4. **修改 is a `<Link>` to `/projects/{id}/settings`** — the board renders a `<button aria-label="編輯旅程名稱">`.
   M6 left the destination unspecified and defaulted to the project-settings route (gear removal made this the
   only entry point). No aria-label on the link, but the visible "修改" text provides the accessible name.
5. **Icon stroke widths are normalised** — primary tiles use a uniform `strokeWidth={1.7}`; the board uses
   1.6 (成員) / 1.8 (結算/統計/匯率). Secondary icons are all 18px; the board is 18px for 歷史/里程/匯出 and
   17px for 筆記/地圖/照片. Sub-pixel/1px differences only; no visual impact.
6. **匯率 glyph is lucide `Coins`** — the board draws a single-circle currency glyph (circle r10 + arc
   `M15 9.4a4 4 0 1 0 0 5.2` + `M7 12h5`) that has no exact lucide-react counterpart; `Coins` is the M6
   approximation. Visual difference in the glyph only (tone/size correct).
7. **Negative balance keeps `text-v2-danger`** — the board only illustrates a positive amount (ink); code uses
   ink for ≥0 and danger for <0, per the M6 recommendation to avoid a regression. Not contradicted by the board.

## Verification run

- `npx vitest run tests/components/v2/project-overview-v2.test.tsx tests/components/v2/feature-grid.test.tsx tests/components/v2/no-hardcoded-colors.test.ts`
  → 3 files / 21 tests pass (includes the cover-icon decoration tests and the token-only guard).
- Colour guard confirmed clean: no `bg-white` / `text-white` / hex / `dark:` in the A2 components; all colours
  resolve through existing v2 tokens (`--v2-lake`, `--v2-lake-soft`, `--v2-lake-edge`, `--v2-rose/gold/plum/
  coral/sand`, `--v2-line(-soft)`, `--v2-ink(-muted/-subtle)`, `--v2-on-lake`, `--v2-check`).

## Conclusion

A2 and A2d still match the v20261004 boards. The only residual, non-intentional deviation is the 2px top gap
above the 最近支出 card (`pt-5` = 20px vs. design 22px); everything else is either an exact match or one of the
seven intentional M6 deviations documented above. The summary-card cover-icon change is an intentional
deviation that conflicts with the board (icon only, no colour) and is covered by tests.
